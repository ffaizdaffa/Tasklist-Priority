import type { Platform } from "./types";

// ── Apify data-source integration ──
// Runs the named actors, waits for the dataset, and normalizes items into the
// shape the command center understands. Works with a live APIFY_TOKEN; without
// one, callers fall back to bundled seed data.

export interface ActorConfig {
  key: string;
  label: string;
  platform: Platform;
  actorId: string;
  buildInput: (targets: string[]) => Record<string, unknown>;
}

const env = (k: string, d: string) => process.env[k] || d;

export const ACTORS: ActorConfig[] = [
  {
    key: "tiktok_profile",
    label: "TikTok Profile Scraper",
    platform: "TikTok",
    actorId: env("APIFY_ACTOR_TIKTOK_PROFILE", "clockworks~tiktok-profile-scraper"),
    buildInput: (t) => ({ profiles: t, resultsPerPage: 50, shouldDownloadVideos: false }),
  },
  {
    key: "tiktok_scraper",
    label: "TikTok Scraper",
    platform: "TikTok",
    actorId: env("APIFY_ACTOR_TIKTOK_SCRAPER", "clockworks~tiktok-scraper"),
    buildInput: (t) => ({ profiles: t, resultsPerPage: 50 }),
  },
  {
    key: "tiktok_video",
    label: "TikTok Video Scraper",
    platform: "TikTok",
    actorId: env("APIFY_ACTOR_TIKTOK_VIDEO", "clockworks~tiktok-scraper"),
    buildInput: (t) => ({ postURLs: t, resultsPerPage: 100 }),
  },
  {
    key: "instagram_scraper",
    label: "Instagram Scraper",
    platform: "Instagram",
    actorId: env("APIFY_ACTOR_INSTAGRAM_SCRAPER", "apify~instagram-scraper"),
    buildInput: (t) => ({ username: t, resultsType: "posts", resultsLimit: 50 }),
  },
  {
    key: "instagram_profile",
    label: "Instagram Profile Scraper",
    platform: "Instagram",
    actorId: env("APIFY_ACTOR_INSTAGRAM_PROFILE", "apify~instagram-profile-scraper"),
    buildInput: (t) => ({ usernames: t }),
  },
];

export function apifyConfigured(): boolean {
  return !!process.env.APIFY_TOKEN;
}

const BASE = "https://api.apify.com/v2";

/** Run an actor synchronously and return its dataset items. */
export async function runActor(
  actorId: string,
  input: Record<string, unknown>,
): Promise<any[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not configured");
  const url = `${BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Apify ${actorId} failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return (await res.json()) as any[];
}

/** Normalize a raw Apify item (TikTok or Instagram) into our content shape. */
export function normalizeApifyItem(raw: any, platform: Platform, accountName: string) {
  const num = (...vals: any[]) => {
    for (const v of vals) if (typeof v === "number") return v;
    return 0;
  };
  const caption: string =
    raw.text || raw.caption || raw.description || raw.title || "";
  const likes = num(raw.diggCount, raw.likesCount, raw.likeCount, raw.likes);
  const comments = num(raw.commentCount, raw.commentsCount, raw.comments);
  const shares = num(raw.shareCount, raw.sharesCount, raw.reshareCount);
  const saves = num(raw.collectCount, raw.savedCount, raw.saveCount, raw.saved);
  const views = num(raw.playCount, raw.videoViewCount, raw.views, raw.viewCount);
  const reach = num(raw.reachCount, raw.reach, raw.impressions) || views;

  return {
    caption,
    likes,
    comments,
    shares,
    saved: saves,
    reach: reach || views,
    views: views || reach,
    avg_watch_time: num(raw.videoDuration, raw.averageWatchTime),
    profile_activity: num(raw.profileVisits),
    media_type: raw.type || raw.mediaType || (raw.videoUrl ? "VIDEO" : "IMAGE"),
    product_type: raw.productType || (platform === "TikTok" ? "VIDEO" : "FEED"),
    permalink: raw.webVideoUrl || raw.url || raw.postUrl || raw.permalink || "",
    creation_date:
      raw.createTimeISO ||
      raw.timestamp ||
      (raw.createTime ? new Date(raw.createTime * 1000).toISOString() : new Date().toISOString()),
    platform,
    accountName,
  };
}
