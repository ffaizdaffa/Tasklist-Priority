import type { Platform } from "./types";
import { ACCOUNTS, type RawRow } from "./normalize";

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
  // Post-yielding actors produce content rows persisted to the dashboard.
  // Profile actors only report account-level stats (followers, bio).
  yieldsPosts: boolean;
}

const env = (k: string, d: string) => process.env[k] || d;

export const ACTORS: ActorConfig[] = [
  {
    key: "tiktok_profile",
    label: "TikTok Profile Scraper",
    platform: "TikTok",
    actorId: env("APIFY_ACTOR_TIKTOK_PROFILE", "clockworks~tiktok-profile-scraper"),
    buildInput: (t) => ({ profiles: t, resultsPerPage: 50, shouldDownloadVideos: false }),
    yieldsPosts: false,
  },
  {
    key: "tiktok_scraper",
    label: "TikTok Scraper",
    platform: "TikTok",
    actorId: env("APIFY_ACTOR_TIKTOK_SCRAPER", "clockworks~tiktok-scraper"),
    buildInput: (t) => ({ profiles: t, resultsPerPage: 50 }),
    yieldsPosts: true,
  },
  {
    key: "tiktok_video",
    label: "TikTok Video Scraper",
    platform: "TikTok",
    actorId: env("APIFY_ACTOR_TIKTOK_VIDEO", "clockworks~tiktok-scraper"),
    buildInput: (t) => ({ profiles: t, resultsPerPage: 100 }),
    yieldsPosts: true,
  },
  {
    key: "instagram_scraper",
    label: "Instagram Scraper",
    platform: "Instagram",
    actorId: env("APIFY_ACTOR_INSTAGRAM_SCRAPER", "apify~instagram-scraper"),
    buildInput: (t) => ({ username: t, resultsType: "posts", resultsLimit: 50 }),
    yieldsPosts: true,
  },
  {
    key: "instagram_profile",
    label: "Instagram Profile Scraper",
    platform: "Instagram",
    actorId: env("APIFY_ACTOR_INSTAGRAM_PROFILE", "apify~instagram-profile-scraper"),
    buildInput: (t) => ({ usernames: t }),
    yieldsPosts: false,
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

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Map a scraped username to a known account, else use the username itself. */
function matchAccount(username: string, platform: Platform) {
  const u = (username || "").toLowerCase().replace(/^@/, "");
  const found = ACCOUNTS.find(
    (a) => a.handle.replace(/^@/, "").toLowerCase() === u && a.platform === platform,
  );
  if (found) return { accountId: found.id, accountName: found.name };
  return { accountId: u || "unknown", accountName: username || "unknown" };
}

/** Normalize a raw Apify post (TikTok or Instagram) into a storable RawRow. */
export function normalizeApifyItem(raw: any, platform: Platform): RawRow {
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

  const owner: string =
    raw.ownerUsername ||
    raw.username ||
    raw.authorMeta?.name ||
    raw.authorMeta?.uniqueId ||
    raw.author?.uniqueId ||
    raw.author?.name ||
    "unknown";
  const { accountId, accountName } = matchAccount(owner, platform);
  const permalink = raw.webVideoUrl || raw.url || raw.postUrl || raw.permalink || "";

  return {
    id: (platform === "TikTok" ? "tt_" : "ig_") + hash(permalink || caption + owner),
    accountId,
    accountName,
    platform,
    caption,
    publishDate:
      raw.createTimeISO ||
      raw.timestamp ||
      (raw.createTime ? new Date(raw.createTime * 1000).toISOString() : new Date().toISOString()),
    mediaType: raw.type || raw.mediaType || (raw.videoUrl || platform === "TikTok" ? "VIDEO" : "IMAGE"),
    permalink,
    views: views || reach,
    reach: reach || views,
    likes,
    comments,
    shares,
    saves,
    watchTime: num(raw.videoDuration, raw.averageWatchTime),
    profileActivity: num(raw.profileVisits),
  };
}
