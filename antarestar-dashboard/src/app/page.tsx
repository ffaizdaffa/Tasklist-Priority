"use client";
import { useMemo, useState } from "react";
import { getContent, getMonthly, MONTHS } from "@/lib/normalize";
import {
  aggregate,
  buildInsights,
  deltaPct,
  filterContent,
  splitPeriods,
  topBy,
  byFunnel,
  FUNNEL_META,
  type Filters,
} from "@/lib/analytics";
import { Page } from "@/components/Page";
import { PageHeader, KpiCard, Card, fmt, FunnelBadge, ScoreRing } from "@/components/ui";
import { FilterBar, InsightList } from "@/components/Filters";
import { TrendArea, DonutChart, BarChartCard } from "@/components/charts";
import { AiOutput, useAi } from "@/components/AiPanel";

export default function ExecutiveSummary() {
  const [filters, setFilters] = useState<Filters>({});
  const all = getContent();
  const items = useMemo(() => filterContent(all, filters), [all, filters]);
  const ai = useAi();

  const agg = aggregate(items);
  const { previous, current } = splitPeriods(items);
  const aggPrev = aggregate(previous);
  const aggCur = aggregate(current);

  const monthly = getMonthly();
  const igMonthly = MONTHS.map((m) => {
    const rows = monthly.filter((x) => x.month === m);
    return {
      label: m.slice(0, 3),
      Followers: rows.reduce((a, x) => a + x.followers, 0),
      Engagement: rows.reduce((a, x) => a + x.engagement, 0),
      Reach: rows.reduce((a, x) => a + x.reach, 0),
    };
  }).filter((x) => x.Followers || x.Engagement);

  const insights = buildInsights(items);
  const top = topBy(items, (c) => c.score, 5);
  const worst = topBy(items, (c) => -c.score, 3);
  const funnel = byFunnel(items);

  const followerGrowth = igMonthly.length
    ? igMonthly[igMonthly.length - 1].Followers - igMonthly[0].Followers
    : 0;

  return (
    <Page>
      <PageHeader
        title="Executive Summary"
        subtitle="Command center for ANTARESTAR social performance — Apify data, Gemini reasoning. Not a dashboard, an operating system."
        right={
          <button className="btn-primary" onClick={() => ai.run("executive_summary", { filters })} disabled={ai.loading}>
            ✨ {ai.loading ? "Generating…" : "Generate AI Report"}
          </button>
        }
      />

      <FilterBar value={filters} onChange={setFilters} show={["platform", "account"]} />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        <KpiCard label="Total Views" value={fmt(agg.views)} delta={deltaPct(aggCur.views, aggPrev.views)} icon="👁️" />
        <KpiCard label="Total Reach" value={fmt(agg.reach)} delta={deltaPct(aggCur.reach, aggPrev.reach)} icon="📡" />
        <KpiCard label="Engagement" value={fmt(agg.engagement)} delta={deltaPct(aggCur.engagement, aggPrev.engagement)} icon="❤️" />
        <KpiCard label="Follower Growth" value={"+" + fmt(followerGrowth)} icon="📈" />
        <KpiCard label="Videos Published" value={fmt(agg.posts)} delta={deltaPct(aggCur.posts, aggPrev.posts)} icon="🎬" />
        <KpiCard label="Avg ER" value={agg.engagementRate.toFixed(2)} suffix="%" delta={deltaPct(aggCur.engagementRate, aggPrev.engagementRate)} icon="⚡" />
      </div>

      {(ai.text || ai.loading) && (
        <Card className="mb-4 border-brand-500/30" title="✨ AI Executive Summary">
          <AiOutput text={ai.text} loading={ai.loading} source={ai.source} />
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2" title="Monthly performance" subtitle="Followers · Engagement · Reach across all accounts">
          <TrendArea data={igMonthly} keys={["Reach", "Engagement", "Followers"]} colors={["#3b82f6", "#f97316", "#10b981"]} />
        </Card>
        <Card title="Funnel distribution" subtitle="Content by funnel stage">
          <DonutChart
            data={funnel.map((f) => ({ name: f.funnel, value: f.count, color: FUNNEL_META[f.funnel].color }))}
          />
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title="🏆 Top content" subtitle="Highest composite score this period">
            <div className="space-y-2">
              {top.map((c) => (
                <ContentRow key={c.id} c={c} />
              ))}
            </div>
          </Card>
          <Card title="🧊 Worst content" subtitle="Lowest performers — rework or retire">
            <div className="space-y-2">
              {worst.map((c) => (
                <ContentRow key={c.id} c={c} />
              ))}
            </div>
          </Card>
        </div>

        <Card title="🧠 Auto-detected signals" subtitle="Advanced logic engine">
          <div className="max-h-[560px] overflow-y-auto pr-1">
            <InsightList insights={insights.slice(0, 8)} />
          </div>
        </Card>
      </div>
    </Page>
  );
}

function ContentRow({ c }: { c: ReturnType<typeof getContent>[number] }) {
  return (
    <a
      href={c.permalink || "#"}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition"
    >
      <ScoreRing score={c.score} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm truncate">{c.hook || "(no hook)"}</div>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] muted">
          <FunnelBadge stage={c.funnel} />
          <span>{c.accountName}</span>
          <span>·</span>
          <span>{fmt(c.reach)} reach</span>
          <span>·</span>
          <span>{c.engagementRate.toFixed(1)}% ER</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-bold text-sm">{fmt(c.views)}</div>
        <div className="text-[10px] muted">views</div>
      </div>
    </a>
  );
}
