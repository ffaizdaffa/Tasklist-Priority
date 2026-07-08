import { NextRequest, NextResponse } from "next/server";
import { ACTORS, apifyConfigured, normalizeApifyItem, runActor } from "@/lib/apify";
import { ACCOUNTS } from "@/lib/normalize";
import { pushLog, setSource, store } from "@/lib/syncStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = store();
  return NextResponse.json({
    configured: apifyConfigured(),
    sources: Object.values(s.sources),
    log: s.log,
  });
}

// Trigger a sync. Body: { key?: string } to sync one source, else all.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const key: string | undefined = body.key;
  const now = new Date().toISOString();

  // Protect scheduled/cron invocations if a secret is configured.
  const secret = process.env.SYNC_CRON_SECRET;
  if (secret && body.cron && body.secret !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const targets = ACTORS.filter((a) => !key || a.key === key);

  if (!apifyConfigured()) {
    // Simulate a refresh against seed data so the UX is real end-to-end.
    for (const a of targets) {
      setSource(a.key, { status: "ok", lastSync: now });
      pushLog({ source: a.key, level: "info", message: `Refreshed ${a.label} from seed cache (no APIFY_TOKEN).` }, now);
    }
    return NextResponse.json({
      ok: true,
      simulated: true,
      message: "Synced from bundled seed cache. Add APIFY_TOKEN for live scraping.",
      sources: Object.values(store().sources),
    });
  }

  // Which public usernames to scrape. Override per platform from Vercel env
  // (APIFY_IG_USERNAMES / APIFY_TIKTOK_USERNAMES, comma-separated) so real
  // accounts can be connected without a code change. Falls back to the
  // registered account handles.
  const parseUsers = (v?: string) =>
    (v || "")
      .split(/[,\n]/)
      .map((s) => s.trim().replace(/^@/, ""))
      .filter(Boolean);

  const igEnv = parseUsers(process.env.APIFY_IG_USERNAMES);
  const ttEnv = parseUsers(process.env.APIFY_TIKTOK_USERNAMES);
  const igDefault = ACCOUNTS.filter((a) => a.platform === "Instagram").map((a) => a.handle.replace("@", ""));
  const ttDefault = ACCOUNTS.filter((a) => a.platform === "TikTok").map((a) => a.handle.replace("@", ""));
  const igUsers = igEnv.length ? igEnv : igDefault;
  const ttUsers = ttEnv.length ? ttEnv : ttDefault;

  const results: any[] = [];
  for (const a of targets) {
    setSource(a.key, { status: "running" });
    const handles = a.platform === "TikTok" ? ttUsers : igUsers;
    try {
      if (!handles.length) throw new Error(`No usernames configured for ${a.platform}. Set APIFY_${a.platform === "TikTok" ? "TIKTOK" : "IG"}_USERNAMES.`);
      const raw = await runActor(a.actorId, a.buildInput(handles));
      const normalized = raw.map((r) => normalizeApifyItem(r, a.platform, ACCOUNTS[0].name));
      setSource(a.key, { status: "ok", lastSync: now, items: normalized.length, error: null });
      pushLog({ source: a.key, level: "info", message: `Synced ${normalized.length} items from ${a.label}.` }, now);
      results.push({ key: a.key, items: normalized.length });
      // NOTE: persist `normalized` to Supabase here (see supabase/schema.sql).
    } catch (err: any) {
      const msg = String(err?.message || err);
      setSource(a.key, { status: "error", error: msg, lastSync: now });
      pushLog({ source: a.key, level: "error", message: msg }, now);
      results.push({ key: a.key, error: msg });
    }
  }

  return NextResponse.json({ ok: true, results, sources: Object.values(store().sources) });
}
