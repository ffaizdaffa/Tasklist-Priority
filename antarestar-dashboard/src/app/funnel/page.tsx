"use client";
import { useMemo, useState } from "react";
import { useContent } from "@/lib/dataClient";
import { byFunnel, filterContent, topBy, FUNNEL_META, FUNNELS, aggregate, type Filters } from "@/lib/analytics";
import { Page } from "@/components/Page";
import { PageHeader, Card, fmt, FunnelBadge, ScoreRing } from "@/components/ui";
import { FilterBar } from "@/components/Filters";
import { AiInsightPanel } from "@/components/AiPanel";
import { BarChartCard } from "@/components/charts";

export default function FunnelDashboard() {
  const [filters, setFilters] = useState<Filters>({});
  const all = useContent();
  const items = useMemo(() => filterContent(all, filters), [all, filters]);
  const fb = byFunnel(items);
  const total = items.length || 1;
  const agg = aggregate(items);

  // Ideal funnel weighting for a DTC brand
  const IDEAL: Record<string, number> = { TOFU: 40, MOFU: 25, BOFU: 25, Retention: 10 };

  return (
    <Page>
      <PageHeader
        title="Content Funnel Dashboard"
        subtitle="TOFU → MOFU → BOFU → Retention. Balance is everything: reach without conversion is vanity; conversion without retention is churn."
      />
      <FilterBar value={filters} onChange={setFilters} show={["platform", "account", "pillar"]} />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {fb.map((f) => {
          const share = (f.count / total) * 100;
          const ideal = IDEAL[f.funnel];
          const gap = share - ideal;
          const meta = FUNNEL_META[f.funnel];
          return (
            <div key={f.funnel} className="card p-5 border-t-4" style={{ borderTopColor: meta.color }}>
              <div className="flex items-center justify-between">
                <FunnelBadge stage={f.funnel} />
                <span className="text-xs muted">{meta.desc}</span>
              </div>
              <div className="mt-3 text-3xl font-extrabold">{f.count}</div>
              <div className="muted text-xs">pieces · {share.toFixed(0)}% of mix</div>
              <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(share, 100)}%`, background: meta.color }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px]">
                <span className="muted">Target {ideal}%</span>
                <span className={gap >= -5 ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                  {gap >= 0 ? "+" : ""}{gap.toFixed(0)}%
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded bg-black/[0.03] dark:bg-white/[0.03] py-1"><b>{fmt(f.reach)}</b><div className="muted">reach</div></div>
                <div className="rounded bg-black/[0.03] dark:bg-white/[0.03] py-1"><b>{f.engagementRate.toFixed(1)}%</b><div className="muted">ER</div></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Reach by funnel stage" subtitle="Where distribution is going">
          <BarChartCard
            data={fb.map((f) => ({ label: f.funnel, value: f.reach }))}
            colorByCell={(d) => FUNNEL_META[d.label as keyof typeof FUNNEL_META].color}
          />
        </Card>
        <Card title="Engagement rate by funnel" subtitle="Where the audience actually reacts">
          <BarChartCard
            data={fb.map((f) => ({ label: f.funnel, value: +f.engagementRate.toFixed(2) }))}
            colorByCell={(d) => FUNNEL_META[d.label as keyof typeof FUNNEL_META].color}
          />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {FUNNELS.map((stage) => {
          const g = items.filter((c) => c.funnel === stage);
          const best = topBy(g, (c) => c.score, 3);
          return (
            <Card key={stage} title={`Best in ${stage}`} subtitle={FUNNEL_META[stage].desc}>
              {best.length ? (
                <div className="space-y-2">
                  {best.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg p-2 bg-black/[0.02] dark:bg-white/[0.02]">
                      <ScoreRing score={c.score} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{c.hook}</div>
                        <div className="muted text-xs">{c.accountName} · {fmt(c.reach)} reach · {c.engagementRate.toFixed(1)}% ER</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted text-sm">No content in this stage — a gap to fill.</p>
              )}
            </Card>
          );
        })}
      </div>

      <AiInsightPanel mode="action_recommendation" filters={filters} title="✨ AI Funnel Rebalancing Plan" label="Recommend fixes" />
    </Page>
  );
}
