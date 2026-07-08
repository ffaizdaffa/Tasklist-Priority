import { getContent } from "./normalize";
import type {
  ContentItem,
  ContentPillar,
  FunnelStage,
  Platform,
} from "./types";

export const FUNNELS: FunnelStage[] = ["TOFU", "MOFU", "BOFU", "Retention"];
export const PILLARS: ContentPillar[] = [
  "Problem", "Practical", "Proof", "Personality", "Product", "Entertainment",
  "Education", "Storytelling", "Review", "UGC", "BGC", "Affiliate",
];

export const FUNNEL_META: Record<FunnelStage, { label: string; color: string; desc: string }> = {
  TOFU: { label: "TOFU · Awareness", color: "#3b82f6", desc: "Reach & discovery" },
  MOFU: { label: "MOFU · Consideration", color: "#8b5cf6", desc: "Trust & proof" },
  BOFU: { label: "BOFU · Conversion", color: "#f97316", desc: "Sales & offer" },
  Retention: { label: "Retention · Loyalty", color: "#10b981", desc: "Community & repeat" },
};

export interface Filters {
  platform?: Platform | "all";
  accountId?: string | "all";
  funnel?: FunnelStage | "all";
  pillar?: ContentPillar | "all";
  from?: string;
  to?: string;
  search?: string;
}

export function filterContent(items: ContentItem[], f: Filters): ContentItem[] {
  return items.filter((c) => {
    if (f.platform && f.platform !== "all" && c.platform !== f.platform) return false;
    if (f.accountId && f.accountId !== "all" && c.accountId !== f.accountId) return false;
    if (f.funnel && f.funnel !== "all" && c.funnel !== f.funnel) return false;
    if (f.pillar && f.pillar !== "all" && c.pillar !== f.pillar) return false;
    if (f.from && c.publishDate < f.from) return false;
    if (f.to && c.publishDate > f.to + "T23:59:59Z") return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!c.caption.toLowerCase().includes(q) && !(c.product || "").toLowerCase().includes(q))
        return false;
    }
    return true;
  });
}

export function sum<T>(arr: T[], key: (x: T) => number): number {
  return arr.reduce((a, x) => a + key(x), 0);
}

export function aggregate(items: ContentItem[]) {
  const reach = sum(items, (c) => c.reach);
  const engagement = sum(items, (c) => c.engagement);
  return {
    posts: items.length,
    views: sum(items, (c) => c.views),
    reach,
    likes: sum(items, (c) => c.likes),
    comments: sum(items, (c) => c.comments),
    shares: sum(items, (c) => c.shares),
    saves: sum(items, (c) => c.saves),
    engagement,
    watchTime: sum(items, (c) => c.watchTime),
    profileActivity: sum(items, (c) => c.profileActivity),
    engagementRate: reach ? (engagement / reach) * 100 : 0,
  };
}

export function deltaPct(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}

/** Split items into current vs previous window by a pivot date (median date). */
export function splitPeriods(items: ContentItem[]) {
  const sorted = [...items].sort(
    (a, b) => +new Date(a.publishDate) - +new Date(b.publishDate),
  );
  const mid = Math.floor(sorted.length / 2);
  return { previous: sorted.slice(0, mid), current: sorted.slice(mid) };
}

export function byFunnel(items: ContentItem[]) {
  return FUNNELS.map((f) => {
    const g = items.filter((c) => c.funnel === f);
    const agg = aggregate(g);
    return { funnel: f, count: g.length, ...agg, best: topBy(g, (c) => c.score)[0] || null };
  });
}

export function byPillar(items: ContentItem[]) {
  return PILLARS.map((p) => {
    const g = items.filter((c) => c.pillar === p);
    const agg = aggregate(g);
    return { pillar: p, count: g.length, ...agg };
  }).filter((x) => x.count > 0 || true);
}

export function topBy(items: ContentItem[], key: (c: ContentItem) => number, n = 10) {
  return [...items].sort((a, b) => key(b) - key(a)).slice(0, n);
}

// ── Advanced logic: the insight engine ──
export interface Insight {
  id: string;
  type: "rising" | "drop" | "account" | "fatigue" | "hook" | "funnel" | "pillar" | "product" | "boost" | "replicate" | "gap";
  severity: "positive" | "warning" | "critical" | "info";
  title: string;
  detail: string;
  metric?: string;
}

export function buildInsights(items: ContentItem[]): Insight[] {
  const out: Insight[] = [];
  const agg = aggregate(items);

  // Rising content (high velocity)
  const rising = topBy(items.filter((c) => c.velocity > 1.8), (c) => c.velocity, 3);
  rising.forEach((c, i) =>
    out.push({
      id: "rise" + i,
      type: "rising",
      severity: "positive",
      title: `Rising fast: "${c.hook.slice(0, 48)}"`,
      detail: `${c.velocity.toFixed(1)}× above ${c.accountName}'s median ER. Reach ${c.reach.toLocaleString()}, ${c.engagement.toLocaleString()} engagement.`,
      metric: `${c.engagementRate.toFixed(1)}% ER`,
    }),
  );

  // Dropping content (low score, high reach = wasted distribution)
  const drops = topBy(
    items.filter((c) => c.reach > agg.reach / Math.max(items.length, 1) && c.score < 25),
    (c) => c.reach,
    2,
  );
  drops.forEach((c, i) =>
    out.push({
      id: "drop" + i,
      type: "drop",
      severity: "warning",
      title: `Underperforming despite reach: "${c.hook.slice(0, 42)}"`,
      detail: `Got ${c.reach.toLocaleString()} reach but only ${c.engagementRate.toFixed(2)}% ER — the hook or CTA is leaking. Rework and repost.`,
    }),
  );

  // Underperforming accounts
  const accScores: Record<string, { n: number; s: number; name: string }> = {};
  items.forEach((c) => {
    accScores[c.accountId] ||= { n: 0, s: 0, name: c.accountName };
    accScores[c.accountId].n++;
    accScores[c.accountId].s += c.score;
  });
  const accAvg = Object.entries(accScores).map(([id, v]) => ({ id, name: v.name, avg: v.s / v.n, n: v.n }));
  const mean = accAvg.reduce((a, x) => a + x.avg, 0) / Math.max(accAvg.length, 1);
  accAvg
    .filter((a) => a.avg < mean * 0.75)
    .forEach((a, i) =>
      out.push({
        id: "acc" + i,
        type: "account",
        severity: "critical",
        title: `${a.name} is underperforming`,
        detail: `Avg content score ${a.avg.toFixed(0)} vs portfolio ${mean.toFixed(0)}. Audit hooks & posting time, or shift its quota to higher-ROI accounts.`,
      }),
    );

  // Content fatigue: pillar overused with declining ER
  const pillarAgg = byPillar(items).filter((p) => p.count >= 4);
  pillarAgg
    .filter((p) => p.engagementRate < agg.engagementRate * 0.7)
    .slice(0, 2)
    .forEach((p, i) =>
      out.push({
        id: "fat" + i,
        type: "fatigue",
        severity: "warning",
        title: `Fatigue signal on "${p.pillar}" pillar`,
        detail: `${p.count} posts but only ${p.engagementRate.toFixed(2)}% ER (portfolio ${agg.engagementRate.toFixed(2)}%). Audience is tiring — rotate angle or format.`,
      }),
    );

  // Winning hook pattern
  const winners = topBy(items, (c) => c.score, 8);
  const hookWords: Record<string, number> = {};
  winners.forEach((c) => {
    const first = c.hook.split(/\s+/).slice(0, 3).join(" ");
    if (first.length > 4) hookWords[first] = (hookWords[first] || 0) + 1;
  });
  const capsWinner = winners.filter((c) => /[A-Z]{4,}|!/.test(c.hook)).length;
  if (capsWinner >= 4)
    out.push({
      id: "hook0",
      type: "hook",
      severity: "positive",
      title: "Winning hook pattern: bold ALL-CAPS + urgency",
      detail: `${capsWinner}/8 top posts open with capitalized urgency ("LAUNCH", "READY", "!"). Lead with this hook style on new drops.`,
    });

  // Funnel imbalance
  const fb = byFunnel(items);
  const total = fb.reduce((a, x) => a + x.count, 0) || 1;
  const bofu = fb.find((f) => f.funnel === "BOFU")!;
  const ret = fb.find((f) => f.funnel === "Retention")!;
  if (bofu.count / total < 0.15)
    out.push({
      id: "fun0",
      type: "funnel",
      severity: "critical",
      title: "BOFU underweight — conversion gap",
      detail: `Only ${((bofu.count / total) * 100).toFixed(0)}% of content is conversion-focused. You're building reach without capturing sales. Target 20-25% BOFU.`,
    });
  if (ret.count / total < 0.1)
    out.push({
      id: "fun1",
      type: "funnel",
      severity: "warning",
      title: "Retention content is thin",
      detail: `${((ret.count / total) * 100).toFixed(0)}% retention/community content. Add live, UGC & member posts to lift repeat purchase.`,
    });

  // Best pillar
  const bestPillar = [...pillarAgg].sort((a, b) => b.engagementRate - a.engagementRate)[0];
  if (bestPillar)
    out.push({
      id: "pil0",
      type: "pillar",
      severity: "info",
      title: `Most effective pillar: ${bestPillar.pillar}`,
      detail: `${bestPillar.engagementRate.toFixed(2)}% ER across ${bestPillar.count} posts. Double down and template it across accounts.`,
    });

  // Product with volume but weak performance
  const prodAgg: Record<string, { n: number; er: number; eng: number }> = {};
  items.filter((c) => c.product).forEach((c) => {
    const k = c.product!;
    prodAgg[k] ||= { n: 0, er: 0, eng: 0 };
    prodAgg[k].n++;
    prodAgg[k].er += c.engagementRate;
    prodAgg[k].eng += c.engagement;
  });
  Object.entries(prodAgg)
    .filter(([, v]) => v.n >= 3 && v.er / v.n < agg.engagementRate * 0.7)
    .slice(0, 2)
    .forEach(([name, v], i) =>
      out.push({
        id: "prod" + i,
        type: "product",
        severity: "warning",
        title: `${name}: pushed often, converts poorly`,
        detail: `${v.n} posts, avg ${(v.er / v.n).toFixed(2)}% ER. Either the offer/angle is off or it's the wrong product-market fit. Retest with a proof angle before more spend.`,
      }),
    );

  // Boost-worthy (high ER + high save/share = organic winner worth ad spend)
  const boost = topBy(
    items.filter((c) => c.engagementRate > agg.engagementRate * 1.5 && c.saves + c.shares > 10),
    (c) => c.saves + c.shares,
    2,
  );
  boost.forEach((c, i) =>
    out.push({
      id: "boost" + i,
      type: "boost",
      severity: "positive",
      title: `Boost candidate: "${c.hook.slice(0, 40)}"`,
      detail: `${c.engagementRate.toFixed(1)}% ER, ${c.saves + c.shares} saves+shares — proven organic. Put paid budget behind it to scale reach.`,
    }),
  );

  // Replicate for affiliates
  const rep = topBy(items.filter((c) => c.funnel === "BOFU" || c.pillar === "Product"), (c) => c.score, 1)[0];
  if (rep)
    out.push({
      id: "rep0",
      type: "replicate",
      severity: "info",
      title: `Replicate to affiliates: "${rep.hook.slice(0, 40)}"`,
      detail: `Score ${rep.score}. Hand this format/script to Friendstar affiliates to multiply BOFU reach at zero extra production cost.`,
    });

  return out;
}

/** Content gap analysis vs the 12 pillars & 4 funnels. */
export function gapAnalysis(items: ContentItem[]) {
  const total = items.length || 1;
  const pillarGaps = PILLARS.map((p) => {
    const n = items.filter((c) => c.pillar === p).length;
    return { key: p, count: n, share: (n / total) * 100 };
  }).sort((a, b) => a.count - b.count);

  const funnelGaps = FUNNELS.map((f) => {
    const n = items.filter((c) => c.funnel === f).length;
    return { key: f, count: n, share: (n / total) * 100 };
  });

  const accountGaps = Array.from(
    items.reduce((m, c) => m.set(c.accountName, (m.get(c.accountName) || 0) + 1), new Map<string, number>()),
  ).map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.count - b.count);

  return { pillarGaps, funnelGaps, accountGaps };
}
