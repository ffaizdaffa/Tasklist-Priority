"use client";
import { useMemo, useState } from "react";
import { getContent } from "@/lib/normalize";
import { byPillar, filterContent, topBy, type Filters } from "@/lib/analytics";
import { Page } from "@/components/Page";
import { PageHeader, Card, fmt, PillarBadge } from "@/components/ui";
import { FilterBar } from "@/components/Filters";
import { BarChartCard } from "@/components/charts";
import { AiInsightPanel } from "@/components/AiPanel";

export default function Pillars() {
  const [filters, setFilters] = useState<Filters>({});
  const all = getContent();
  const items = useMemo(() => filterContent(all, filters), [all, filters]);
  const pb = byPillar(items).filter((p) => p.count > 0).sort((a, b) => b.count - a.count);

  return (
    <Page>
      <PageHeader
        title="Content Pillar Dashboard"
        subtitle="12 pillars from the framework — Problem, Practical, Proof, Personality, Product, Entertainment, Education, Storytelling, Review, UGC, BGC, Affiliate."
      />
      <FilterBar value={filters} onChange={setFilters} show={["platform", "account", "funnel"]} />

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Volume by pillar" subtitle="How the content mix is distributed">
          <BarChartCard data={pb.map((p) => ({ label: p.pillar, value: p.count }))} horizontal height={Math.max(240, pb.length * 30)} color="#f97316" />
        </Card>
        <Card title="Engagement rate by pillar" subtitle="Which themes the audience rewards">
          <BarChartCard
            data={[...pb].sort((a, b) => b.engagementRate - a.engagementRate).map((p) => ({ label: p.pillar, value: +p.engagementRate.toFixed(2) }))}
            horizontal
            height={Math.max(240, pb.length * 30)}
            color="#10b981"
          />
        </Card>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
        {pb.map((p) => {
          const best = topBy(items.filter((c) => c.pillar === p.pillar), (c) => c.score, 1)[0];
          return (
            <div key={p.pillar} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <PillarBadge pillar={p.pillar} />
                <span className="muted text-xs">{p.count} posts</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                <div><b className="block">{fmt(p.views)}</b><span className="muted">views</span></div>
                <div><b className="block">{p.engagementRate.toFixed(1)}%</b><span className="muted">ER</span></div>
                <div><b className="block">{fmt(p.saves + p.shares)}</b><span className="muted">save+share</span></div>
              </div>
              {best && (
                <div className="text-xs muted border-t pt-2 truncate">🏆 {best.hook}</div>
              )}
            </div>
          );
        })}
      </div>

      <AiInsightPanel mode="action_recommendation" filters={filters} title="✨ AI Pillar Strategy" label="Analyze pillars" />
    </Page>
  );
}
