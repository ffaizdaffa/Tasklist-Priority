import { NextRequest, NextResponse } from "next/server";
import { ACTORS, apifyConfigured, normalizeApifyItem, runActor } from "@/lib/apify";
import { ACCOUNTS } from "@/lib/normalize";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase";
import { pushLog, setSource, store } from "@/lib/syncStore";
import type { RawRow } from "@/lib/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Supabase-backed sync state (persists across serverless instances) ──
async function readState() {
  const sb = supabaseAdmin();
  if (!sb) return null;
  const [{ data: sources }, { data: log }] = await Promise.all([
    sb.from("sm_sync_state").select("*"),
    sb.from("sm_sync_log").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  return {
    sources: (sources || []).map((s: any) => ({
      key: s.key, label: s.label, actorId: s.actor_id, platform: s.platform,
      status: s.status, lastSync: s.last_sync, items: s.items, error: s.error,
    })),
    log: (log || []).map((l: any) => ({ ts: l.created_at, source: l.source, level: l.level, message: l.message })),
  };
}

async function writeState(key: string, patch: any) {
  const sb = supabaseAdmin();
  if (!sb) return;
  const row: any = { key };
  if ("status" in patch) row.status = patch.status;
  if ("lastSync" in patch) row.last_sync = patch.lastSync;
  if ("items" in patch) row.items = patch.items;
  if ("error" in patch) row.error = patch.error;
  const actor = ACTORS.find((a) => a.key === key);
  if (actor) { row.label = actor.label; row.actor_id = actor.actorId; row.platform = actor.platform; }
  await sb.from("sm_sync_state").upsert(row, { onConflict: "key" });
}

async function writeLog(source: string, level: string, message: string) {
  const sb = supabaseAdmin();
  if (!sb) return;
  await sb.from("sm_sync_log").insert({ source, level, message });
}

async function persistContent(rows: RawRow[]) {
  const sb = supabaseAdmin();
  if (!sb || !rows.length) return 0;
  const payload = rows.map((r) => ({
    id: r.id, account_id: r.accountId, account_name: r.accountName, platform: r.platform,
    caption: r.caption, publish_date: r.publishDate, media_type: r.mediaType, permalink: r.permalink,
    views: r.views, reach: r.reach, likes: r.likes, comments: r.comments, shares: r.shares,
    saves: r.saves, watch_time: r.watchTime, profile_activity: r.profileActivity,
    synced_at: new Date().toISOString(),
  }));
  const { error } = await sb.from("sm_content").upsert(payload, { onConflict: "id" });
  if (error) throw new Error("Supabase write failed: " + error.message);
  return payload.length;
}

export async function GET() {
  // Sheet backend: report a single sheet-backed source with live row count.
  const sheetUrl = process.env.SHEET_API_URL;
  if (sheetUrl) {
    let count = 0;
    let lastSync: string | null = null;
    try {
      const res = await fetch(`${sheetUrl}${sheetUrl.includes("?") ? "&" : "?"}action=data`, { next: { revalidate: 30 } });
      const j = await res.json();
      const rows = j.content || [];
      count = rows.length;
      lastSync = rows[0]?.syncedAt || rows[0]?.synced_at || null;
    } catch {}
    return NextResponse.json({
      configured: true,
      backend: "sheet",
      sources: [
        { key: "sheet", label: "Google Sheet + Apify (Apps Script)", actorId: "apps-script", platform: "Instagram", status: "ok", lastSync, items: count, error: null },
      ],
      log: [{ ts: lastSync || new Date(0).toISOString(), source: "sheet", level: "info", message: `Sheet backend live — ${count} rows. Sync runs in Apps Script.` }],
    });
  }

  const supa = supabaseConfigured();
  if (supa) {
    const state = await readState();
    if (state && (state.sources.length || state.log.length)) {
      return NextResponse.json({ configured: apifyConfigured(), persisted: true, ...state });
    }
  }
  const s = store();
  return NextResponse.json({
    configured: apifyConfigured(),
    persisted: supa,
    sources: Object.values(s.sources),
    log: s.log,
  });
}

// Trigger a sync. Body: { key?: string } to sync one source, else all.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const key: string | undefined = body.key;
  const now = new Date().toISOString();
  const supa = supabaseConfigured();

  const secret = process.env.SYNC_CRON_SECRET;
  if (secret && body.cron && body.secret !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // If the Google Sheet backend is wired, sync means "ask Apps Script to pull".
  const sheetUrl = process.env.SHEET_API_URL;
  if (sheetUrl) {
    try {
      const secret = process.env.SHEET_SYNC_SECRET || "";
      const u = `${sheetUrl}${sheetUrl.includes("?") ? "&" : "?"}action=sync${secret ? `&secret=${encodeURIComponent(secret)}` : ""}`;
      const res = await fetch(u, { redirect: "follow" });
      const out = await res.json().catch(() => ({}));
      return NextResponse.json({
        ok: !!out.ok,
        backend: "sheet",
        summary: out.summary || null,
        count: out.count ?? null,
        error: out.error || null,
      });
    } catch (err: any) {
      return NextResponse.json({ ok: false, backend: "sheet", error: String(err?.message || err) });
    }
  }

  const targets = ACTORS.filter((a) => !key || a.key === key);

  if (!apifyConfigured()) {
    for (const a of targets) {
      setSource(a.key, { status: "ok", lastSync: now });
      pushLog({ source: a.key, level: "info", message: `Refreshed ${a.label} from seed cache (no APIFY_TOKEN).` }, now);
    }
    return NextResponse.json({
      ok: true, simulated: true,
      message: "Synced from bundled seed cache. Add APIFY_TOKEN for live scraping.",
      sources: Object.values(store().sources),
    });
  }

  // Resolve target usernames per platform (override via env).
  const parseUsers = (v?: string) =>
    (v || "").split(/[,\n]/).map((s) => s.trim().replace(/^@/, "")).filter(Boolean);
  const igEnv = parseUsers(process.env.APIFY_IG_USERNAMES);
  const ttEnv = parseUsers(process.env.APIFY_TIKTOK_USERNAMES);
  const igUsers = igEnv.length ? igEnv : ACCOUNTS.filter((a) => a.platform === "Instagram").map((a) => a.handle.replace("@", ""));
  const ttUsers = ttEnv.length ? ttEnv : ACCOUNTS.filter((a) => a.platform === "TikTok").map((a) => a.handle.replace("@", ""));

  const results: any[] = [];
  for (const a of targets) {
    const handles = a.platform === "TikTok" ? ttUsers : igUsers;
    if (supa) await writeState(a.key, { status: "running" });
    else setSource(a.key, { status: "running" });
    try {
      if (!handles.length) throw new Error(`No usernames set for ${a.platform}. Add APIFY_${a.platform === "TikTok" ? "TIKTOK" : "IG"}_USERNAMES.`);
      const raw = await runActor(a.actorId, a.buildInput(handles));

      let stored = 0;
      if (a.yieldsPosts) {
        const rows = raw
          .map((r) => normalizeApifyItem(r, a.platform))
          .filter((r) => r.permalink || r.caption);
        stored = supa ? await persistContent(rows) : rows.length;
      }
      const count = a.yieldsPosts ? stored : raw.length;
      const msg = a.yieldsPosts
        ? `Synced & stored ${stored} posts from ${a.label}.`
        : `Fetched ${raw.length} profile record(s) from ${a.label}.`;

      if (supa) { await writeState(a.key, { status: "ok", lastSync: now, items: count, error: null }); await writeLog(a.key, "info", msg); }
      else { setSource(a.key, { status: "ok", lastSync: now, items: count, error: null }); pushLog({ source: a.key, level: "info", message: msg }, now); }
      results.push({ key: a.key, items: count });
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (supa) { await writeState(a.key, { status: "error", lastSync: now, error: msg }); await writeLog(a.key, "error", msg); }
      else { setSource(a.key, { status: "error", error: msg, lastSync: now }); pushLog({ source: a.key, level: "error", message: msg }, now); }
      results.push({ key: a.key, error: msg });
    }
  }

  const state = supa ? await readState() : null;
  return NextResponse.json({
    ok: true,
    persisted: supa,
    results,
    sources: state ? state.sources : Object.values(store().sources),
  });
}
