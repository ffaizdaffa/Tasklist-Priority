"use client";
import { useMemo, useState } from "react";
import { getContent } from "@/lib/normalize";
import { buildInsights, filterContent, gapAnalysis, FUNNEL_META, type Filters } from "@/lib/analytics";
import { Page } from "@/components/Page";
import { PageHeader, Card } from "@/components/ui";
import { FilterBar, InsightList } from "@/components/Filters";
import { AiInsightPanel } from "@/components/AiPanel";

export default function Gaps() {
  const [filters, setFilters] = useState<Filters>({});
  const all = getContent();
  const items = useMemo(() => filterContent(all, filters), [all, filters]);
  const { pillarGaps, funnelGaps, accountGaps } = gapAnalysis(items);
  const insights = buildInsights(items).filter((i) =>
    ["funnel", "pillar", "account", "product", "fatigue", "gap"].includes(i.type),
  );
  const total = items.length || 1;

  return (
    <Page>
      <PageHeader
        title="Content Gap Analysis"
        subtitle="Where the content strategy is imbalanced — inactive pillars, unproductive accounts, funnel gaps, under-distributed products."
      />
      <FilterBar value={filters} onChange={setFilters} show={["platform", "account"]} />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card title="🧱 Pillar coverage" subtitle="Least-active pillars first">
          <div className="space-y-1.5">
            {pillarGaps.slice(0, 8).map((p) => (
              <GapBar key={p.key} label={p.key} count={p.count} share={p.share} warn={p.count === 0} />
            ))}
          </div>
        </Card>
        <Card title="🔻 Funnel balance" subtitle="Distribution across stages">
          <div className="space-y-1.5">
            {funnelGaps.map((f) => (
              <GapBar
                key={f.key}
                label={f.key}
                count={f.count}
                share={f.share}
                color={FUNNEL_META[f.key as keyof typeof FUNNEL_META].color}
                warn={f.key === "BOFU" ? f.share < 15 : f.key === "Retention" ? f.share < 10 : false}
              />
            ))}
          </div>
        </Card>
        <Card title="👤 Account productivity" subtitle="Least-productive accounts first">
          <div className="space-y-1.5">
            {accountGaps.map((a) => (
              <GapBar key={a.name} label={a.name} count={a.count} share={(a.count / total) * 100} warn={a.count < total / accountGaps.length / 2} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="🚨 Detected imbalances" subtitle="Auto-flagged by the logic engine">
          <InsightList insights={insights} />
        </Card>
        <AiInsightPanel mode="action_recommendation" filters={filters} title="✨ AI Gap-Closing Plan" label="Close the gaps" />
      </div>
    </Page>
  );
}

function GapBar({ label, count, share, warn, color = "#f97316" }: { label: string; count: number; share: number; warn?: boolean; color?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="font-medium flex items-center gap-1">
          {warn && <span className="text-rose-500">●</span>}
          {label}
        </span>
        <span className="muted">{count} · {share.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(share * 2, 100)}%`, background: warn ? "#ef4444" : color }} />
      </div>
    </div>
  );
}
