import { seedRawRows, type RawRow } from "./normalize";
import { supabaseAdmin, supabaseConfigured } from "./supabase";

// Server-side content source, in priority order:
//   1. Google Sheet (Apps Script JSON endpoint)  — SHEET_API_URL
//   2. Supabase (sm_content)
//   3. Bundled seed
// Shared by /api/data and /api/ai so the AI reasons over the same live data.

const num = (v: any) => (typeof v === "number" ? v : Number(v) || 0);

function coerceRows(raw: any[]): RawRow[] {
  return raw
    .map((d) => ({
      id: String(d.id || d.permalink || ""),
      accountId: String(d.accountId || d.account_id || "unknown"),
      accountName: String(d.accountName || d.account_name || "unknown"),
      platform: (d.platform || "Instagram") as RawRow["platform"],
      caption: String(d.caption || ""),
      publishDate: d.publishDate || d.publish_date || new Date(0).toISOString(),
      mediaType: String(d.mediaType || d.media_type || "FEED"),
      permalink: String(d.permalink || ""),
      views: num(d.views),
      reach: num(d.reach),
      likes: num(d.likes),
      comments: num(d.comments),
      shares: num(d.shares),
      saves: num(d.saves),
      watchTime: num(d.watchTime ?? d.watch_time),
      profileActivity: num(d.profileActivity ?? d.profile_activity),
    }))
    .filter((r) => r.id && (r.permalink || r.caption));
}

async function fromSheet(): Promise<RawRow[] | null> {
  const url = process.env.SHEET_API_URL;
  if (!url) return null;
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}action=data`, {
      // Sheets data changes on a schedule; cache briefly to cut latency.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rows = coerceRows(json.content || []);
    return rows.length ? rows : null;
  } catch {
    return null;
  }
}

async function fromSupabase(): Promise<RawRow[] | null> {
  if (!supabaseConfigured()) return null;
  try {
    const sb = supabaseAdmin()!;
    const { data, error } = await sb
      .from("sm_content")
      .select("*")
      .order("publish_date", { ascending: false })
      .limit(2000);
    if (error || !data || !data.length) return null;
    return coerceRows(data);
  } catch {
    return null;
  }
}

export async function getServerRows(): Promise<{ rows: RawRow[]; source: string }> {
  const sheet = await fromSheet();
  if (sheet) return { rows: sheet, source: "sheet" };
  const supa = await fromSupabase();
  if (supa) return { rows: supa, source: "supabase" };
  return { rows: seedRawRows(), source: "seed" };
}
