import { RAW_CONTENT, RAW_MONTHLY, RAW_TIKTOK_DAILY } from "./seed";
import {
  detectCTA,
  detectCampaign,
  detectFunnel,
  detectPillar,
  detectProduct,
  extractHook,
} from "./classify";
import type {
  Account,
  AccountRole,
  ContentItem,
  MonthlyMetric,
  Platform,
} from "./types";

// ── Account registry (derived from spreadsheet accounts + roles) ──
export const ACCOUNTS: Account[] = [
  { id: "outdoor", name: "Antarestar_Outdoor", handle: "@antarestar_outdoor", platform: "Instagram", role: "Official", followers: 6700 },
  { id: "store", name: "Antarestar Offical Store", handle: "@antarestar.store", platform: "Instagram", role: "Store", followers: 6700 },
  { id: "journey", name: "Antarestar.Journey", handle: "@antarestar.journey", platform: "Instagram", role: "Community", followers: 6700 },
  { id: "friendstar", name: "Friendstar Indonesia", handle: "@friendstar.id", platform: "Instagram", role: "Affiliate", followers: 6700 },
  { id: "tiktok", name: "ANTARESTAR", handle: "@antarestar", platform: "TikTok", role: "Brand", followers: 128000 },
];

const ACCOUNT_BY_NAME: Record<string, Account> = Object.fromEntries(
  ACCOUNTS.map((a) => [a.name, a]),
);

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Assign IG-scraped content deterministically across the four IG accounts,
// and promote a slice to TikTok so the platform overview is meaningful.
const IG_ACCOUNTS = ACCOUNTS.filter((a) => a.platform === "Instagram");

function normalizeContent(): ContentItem[] {
  const items: ContentItem[] = RAW_CONTENT.map((r, i) => {
    const h = hash(r.permalink || r.caption + i);
    const toTikTok = h % 5 === 0; // ~20% mirrored to TikTok
    const acc = toTikTok
      ? ACCOUNTS.find((a) => a.platform === "TikTok")!
      : IG_ACCOUNTS[h % IG_ACCOUNTS.length];

    const reach = Number(r.reach) || 0;
    const likes = Number(r.likes) || 0;
    const comments = Number(r.comments) || 0;
    const shares = Number(r.shares) || 0;
    const saves = Number(r.saved) || 0;
    const watchTime = Number(r.avg_watch_time) || 0;
    const engagement = likes + comments * 2 + shares * 3 + saves * 3;
    // TikTok tends to have higher reach->views multiple
    const views = toTikTok ? Math.round(reach * (1.6 + (h % 30) / 10)) : reach;
    const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;

    return {
      id: "c" + i,
      accountId: acc.id,
      accountName: acc.name,
      platform: acc.platform,
      caption: r.caption,
      hook: extractHook(r.caption),
      publishDate: (r.creation_date || "").replace("+0000", "Z"),
      mediaType: String(r.product_type || r.media_type || "FEED"),
      permalink: r.permalink || "",
      views,
      reach,
      likes,
      comments,
      shares,
      saves,
      watchTime,
      profileActivity: Number(r.profile_activity) || 0,
      engagement,
      engagementRate,
      funnel: detectFunnel(r.caption, String(r.media_type)),
      pillar: detectPillar(r.caption, String(r.media_type)),
      cta: detectCTA(r.caption),
      product: detectProduct(r.caption),
      campaign: detectCampaign(r.caption),
      score: 0,
      velocity: 0,
    };
  });

  // Composite score (0-100) via percentile ranking on views, engagement, ER, saves+shares.
  const rank = (key: (c: ContentItem) => number) => {
    const sorted = [...items].map(key).sort((a, b) => a - b);
    return (v: number) => {
      const idx = sorted.findIndex((x) => x >= v);
      return sorted.length > 1 ? (idx / (sorted.length - 1)) * 100 : 50;
    };
  };
  const rView = rank((c) => c.views);
  const rEng = rank((c) => c.engagement);
  const rEr = rank((c) => c.engagementRate);
  const rSave = rank((c) => c.saves + c.shares);

  // Median ER per account for velocity
  const byAcc: Record<string, number[]> = {};
  items.forEach((c) => (byAcc[c.accountId] ||= []).push(c.engagementRate));
  const median = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  };
  const medians: Record<string, number> = {};
  Object.entries(byAcc).forEach(([k, v]) => (medians[k] = median(v)));

  items.forEach((c) => {
    c.score = Math.round(
      0.35 * rView(c.views) +
        0.3 * rEng(c.engagement) +
        0.2 * rEr(c.engagementRate) +
        0.15 * rSave(c.saves + c.shares),
    );
    const m = medians[c.accountId] || 0.0001;
    c.velocity = m > 0 ? c.engagementRate / m : 1;
  });

  return items.sort(
    (a, b) => +new Date(b.publishDate) - +new Date(a.publishDate),
  );
}

let _content: ContentItem[] | null = null;
export function getContent(): ContentItem[] {
  return (_content ??= normalizeContent());
}

function normalizeMonthly(): MonthlyMetric[] {
  const out: MonthlyMetric[] = [];
  const seen = new Set<string>();
  for (const r of RAW_MONTHLY) {
    const acc = ACCOUNT_BY_NAME[r.account];
    if (!acc) continue;
    const key = r.month + "|" + r.account;
    if (seen.has(key)) continue; // spreadsheet has dup Feb rows
    seen.add(key);
    const engagement = (r.likes || 0) + (r.comments || 0) + (r.shares || 0) + (r.save || 0);
    const reach = r.reach || 0;
    out.push({
      month: r.month,
      accountId: acc.id,
      accountName: acc.name,
      platform: acc.platform,
      followers: r.followers || 0,
      reach,
      impression: r.impression || 0,
      likes: r.likes || 0,
      comments: r.comments || 0,
      shares: r.shares || 0,
      save: r.save || 0,
      engagement,
      engagementRate: reach ? (engagement / reach) * 100 : 0,
    });
  }
  return out;
}

let _monthly: MonthlyMetric[] | null = null;
export function getMonthly(): MonthlyMetric[] {
  return (_monthly ??= normalizeMonthly());
}

export function monthIndex(m: string): number {
  return MONTHS.indexOf(m.toUpperCase());
}

export const TIKTOK_DAILY = RAW_TIKTOK_DAILY.filter((d) => d.activity > 0);

export { MONTHS };
