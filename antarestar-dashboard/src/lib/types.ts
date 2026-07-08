// ── Core domain types for the ANTARESTAR command center ──

export type Platform = "Instagram" | "TikTok" | "Facebook" | "YouTube";

export type FunnelStage = "TOFU" | "MOFU" | "BOFU" | "Retention";

export type AccountRole =
  | "Official"
  | "Store"
  | "Affiliate"
  | "Community"
  | "Brand";

export type ContentPillar =
  | "Problem"
  | "Practical"
  | "Proof"
  | "Personality"
  | "Product"
  | "Entertainment"
  | "Education"
  | "Storytelling"
  | "Review"
  | "UGC"
  | "BGC"
  | "Affiliate";

export interface Account {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  role: AccountRole;
  followers: number;
}

/** A single normalized piece of content (one row post/video). */
export interface ContentItem {
  id: string;
  accountId: string;
  accountName: string;
  platform: Platform;
  caption: string;
  hook: string;
  publishDate: string; // ISO
  mediaType: string; // REELS / FEED / VIDEO / IMAGE / CAROUSEL
  permalink: string;
  // metrics
  views: number; // reach used as proxy where views absent
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  watchTime: number; // seconds
  profileActivity: number;
  engagement: number;
  engagementRate: number; // % by reach
  // classification
  funnel: FunnelStage;
  pillar: ContentPillar;
  cta: string;
  product: string | null;
  campaign: string | null;
  // scoring
  score: number; // 0-100 composite
  velocity: number; // engagement rate vs account median
}

export interface MonthlyMetric {
  month: string;
  accountId: string;
  accountName: string;
  platform: Platform;
  followers: number;
  reach: number;
  impression: number;
  likes: number;
  comments: number;
  shares: number;
  save: number;
  engagement: number;
  engagementRate: number;
}

export interface KpiDelta {
  value: number;
  prev: number;
  deltaPct: number | null;
}

export interface SyncSource {
  key: string;
  label: string;
  actorId: string;
  platform: Platform;
  lastSync: string | null;
  status: "idle" | "ok" | "error" | "running";
  items: number;
  error?: string | null;
}
