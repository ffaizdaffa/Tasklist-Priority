"use client";
import { useMemo, useState } from "react";
import { getContent } from "@/lib/normalize";
import { filterContent, topBy, type Filters } from "@/lib/analytics";
import type { ContentItem } from "@/lib/types";
import { Page } from "@/components/Page";
import { PageHeader, Card, fmt, FunnelBadge, PillarBadge, ScoreRing } from "@/components/ui";
import { FilterBar } from "@/components/Filters";
import { AiOutput, useAi } from "@/components/AiPanel";

type Tab = "views" | "engagement" | "saveshare" | "conversion";
const TABS: { key: Tab; label: string; icon: string; sort: (c: ContentItem) => number }[] = [
  { key: "views", label: "Top by Views", icon: "👁️", sort: (c) => c.views },
  { key: "engagement", label: "Top by Engagement", icon: "❤️", sort: (c) => c.engagement },
  { key: "saveshare", label: "Top by Save/Share", icon: "🔖", sort: (c) => c.saves + c.shares },
  { key: "conversion", label: "Top by Conversion", icon: "🛒", sort: (c) => c.profileActivity + (c.product ? c.engagement * 0.5 : 0) },
];

export default function Winning() {
  const [filters, setFilters] = useState<Filters>({});
  const [tab, setTab] = useState<Tab>("views");
  const all = getContent();
  const items = useMemo(() => filterContent(all, filters), [all, filters]);
  const active = TABS.find((t) => t.key === tab)!;
  const top = topBy(items, active.sort, 10);
  const ai = useAi();

  return (
    <Page>
      <PageHeader
        title="Winning Content Library"
        subtitle="Your proven winners. Break them down with AI, then replicate the format across accounts & affiliates."
        right={
          <button className="btn-primary" onClick={() => ai.run("winning_breakdown", { filters })} disabled={ai.loading}>
            ✨ {ai.loading ? "Analyzing…" : "AI Breakdown All"}
          </button>
        }
      />
      <FilterBar value={filters} onChange={setFilters} show={["platform", "account", "funnel", "pillar"]} />

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn text-sm ${tab === t.key ? "bg-brand-500 text-white" : "btn-ghost"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {(ai.text || ai.loading) && (
        <Card className="mb-4 border-brand-500/30" title="✨ AI Winning Breakdown">
          <AiOutput text={ai.text} loading={ai.loading} source={ai.source} />
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {top.map((c, i) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg gradient-navy text-white grid place-items-center font-bold text-sm">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm truncate">{c.hook}</div>
                  <ScoreRing score={c.score} />
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <FunnelBadge stage={c.funnel} />
                  <PillarBadge pillar={c.pillar} />
                  {c.product && <span className="pill bg-brand-500/10 text-brand-500">{c.product}</span>}
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
                  <div><b className="block">{fmt(c.views)}</b><span className="muted">views</span></div>
                  <div><b className="block">{c.engagementRate.toFixed(1)}%</b><span className="muted">ER</span></div>
                  <div><b className="block">{fmt(c.saves + c.shares)}</b><span className="muted">save+sh</span></div>
                  <div><b className="block">{c.watchTime}s</b><span className="muted">watch</span></div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <a href={c.permalink || "#"} target="_blank" rel="noreferrer" className="btn-ghost text-xs !py-1 !px-2">🔗 Open</a>
                  <ReplicateButton c={c} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function ReplicateButton({ c }: { c: ContentItem }) {
  const [copied, setCopied] = useState(false);
  const brief = `REPLICATE BRIEF — ${c.hook}
Format: ${c.mediaType} | Funnel: ${c.funnel} | Pillar: ${c.pillar} | CTA: ${c.cta}
Product: ${c.product || "—"} | Ref ER: ${c.engagementRate.toFixed(1)}%
Hook to reuse: "${c.hook}"
Original caption:
${c.caption}`;
  return (
    <button
      className="btn-ghost text-xs !py-1 !px-2"
      onClick={() => {
        navigator.clipboard?.writeText(brief);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "✓ Copied brief" : "♻️ Replicate"}
    </button>
  );
}
