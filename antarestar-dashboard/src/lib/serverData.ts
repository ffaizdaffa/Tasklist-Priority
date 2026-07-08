import { seedRawRows, type RawRow } from "./normalize";
import { supabaseAdmin, supabaseConfigured } from "./supabase";

// Server-side content source: live Supabase rows when available, else seed.
// Shared by /api/data and /api/ai so the AI reasons over the same live data
// the dashboard shows.
export async function getServerRows(): Promise<{ rows: RawRow[]; source: string }> {
  if (supabaseConfigured()) {
    try {
      const sb = supabaseAdmin()!;
      const { data, error } = await sb
        .from("sm_content")
        .select("*")
        .order("publish_date", { ascending: false })
        .limit(2000);
      if (!error && data && data.length > 0) {
        const rows: RawRow[] = data.map((d: any) => ({
          id: d.id,
          accountId: d.account_id,
          accountName: d.account_name,
          platform: d.platform,
          caption: d.caption || "",
          publishDate: d.publish_date,
          mediaType: d.media_type || "FEED",
          permalink: d.permalink || "",
          views: Number(d.views) || 0,
          reach: Number(d.reach) || 0,
          likes: Number(d.likes) || 0,
          comments: Number(d.comments) || 0,
          shares: Number(d.shares) || 0,
          saves: Number(d.saves) || 0,
          watchTime: Number(d.watch_time) || 0,
          profileActivity: Number(d.profile_activity) || 0,
        }));
        return { rows, source: "supabase" };
      }
    } catch {
      // fall through
    }
  }
  return { rows: seedRawRows(), source: "seed" };
}
