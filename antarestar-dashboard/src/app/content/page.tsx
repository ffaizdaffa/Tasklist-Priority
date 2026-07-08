"use client";
import { useEffect, useMemo, useState } from "react";
import { useContent } from "@/lib/dataClient";
import { filterContent, type Filters } from "@/lib/analytics";
import type { ContentItem } from "@/lib/types";
import { Page } from "@/components/Page";
import { PageHeader, Card, fmt, FunnelBadge, PillarBadge, PlatformBadge, ScoreRing } from "@/components/ui";
import { FilterBar } from "@/components/Filters";
import { AiOutput, useAi } from "@/components/AiPanel";

type Sort = "date" | "views" | "er" | "score" | "saves";

export default function ContentPerformance() {
  const [filters, setFilters] = useState<Filters>({});
  const [view, setView] = useState<"table" | "card">("table");
  const [sort, setSort] = useState<Sort>("score");
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const all = useContent();

  const items = useMemo(() => {
    const f = filterContent(all, filters);
    const key: Record<Sort, (c: ContentItem) => number> = {
      date: (c) => +new Date(c.publishDate),
      views: (c) => c.views,
      er: (c) => c.engagementRate,
      score: (c) => c.score,
      saves: (c) => c.saves + c.shares,
    };
    return [...f].sort((a, b) => key[sort](b) - key[sort](a));
  }, [all, filters, sort]);

  return (
    <Page>
      <PageHeader
        title="Content Performance"
        subtitle={`${items.length} pieces of content, auto-classified by funnel, pillar, CTA & product.`}
        right={
          <div className="flex items-center gap-2">
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="score">Sort: Score</option>
              <option value="views">Sort: Views</option>
              <option value="er">Sort: ER</option>
              <option value="saves">Sort: Saves+Shares</option>
              <option value="date">Sort: Newest</option>
            </select>
            <div className="flex rounded-lg border overflow-hidden">
              <button className={`px-3 py-2 text-sm ${view === "table" ? "bg-brand-500 text-white" : ""}`} onClick={() => setView("table")}>☰</button>
              <button className={`px-3 py-2 text-sm ${view === "card" ? "bg-brand-500 text-white" : ""}`} onClick={() => setView("card")}>▦</button>
            </div>
          </div>
        }
      />

      <FilterBar value={filters} onChange={setFilters} />

      {view === "table" ? (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="text-left muted text-[11px] uppercase tracking-wide border-b">
                  {["", "Content / Hook", "Platform", "Account", "Date", "Funnel", "Pillar", "CTA", "Product", "Views", "ER", "Watch", "Saves", ""].map((h, i) => (
                    <th key={i} className="py-3 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="pl-3"><ScoreRing score={c.score} /></td>
                    <td className="py-2.5 px-3 max-w-[280px]">
                      <div className="font-semibold truncate">{c.hook || "(no hook)"}</div>
                      <div className="muted text-xs truncate">{c.mediaType} · {c.campaign || "—"}</div>
                    </td>
                    <td className="px-3"><PlatformBadge platform={c.platform} /></td>
                    <td className="px-3 whitespace-nowrap text-xs">{c.accountName}</td>
                    <td className="px-3 whitespace-nowrap text-xs muted">{c.publishDate.slice(0, 10)}</td>
                    <td className="px-3"><FunnelBadge stage={c.funnel} /></td>
                    <td className="px-3"><PillarBadge pillar={c.pillar} /></td>
                    <td className="px-3 text-xs">{c.cta}</td>
                    <td className="px-3 text-xs">{c.product || "—"}</td>
                    <td className="px-3 text-right font-semibold">{fmt(c.views)}</td>
                    <td className="px-3 text-right">{c.engagementRate.toFixed(1)}%</td>
                    <td className="px-3 text-right">{c.watchTime}s</td>
                    <td className="px-3 text-right">{fmt(c.saves + c.shares)}</td>
                    <td className="px-3">
                      <button className="btn-ghost text-xs !py-1 !px-2" onClick={() => setSelected(c)}>✨ AI</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((c) => (
            <ContentCard key={c.id} c={c} onDiagnose={() => setSelected(c)} />
          ))}
        </div>
      )}

      {selected && <DiagnosisModal c={selected} onClose={() => setSelected(null)} />}
    </Page>
  );
}

function ContentCard({ c, onDiagnose }: { c: ContentItem; onDiagnose: () => void }) {
  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={c.platform} />
          <FunnelBadge stage={c.funnel} />
        </div>
        <ScoreRing score={c.score} />
      </div>
      <div className="font-semibold text-sm mb-1 line-clamp-2">{c.hook}</div>
      <p className="muted text-xs line-clamp-2 mb-3">{c.caption}</p>
      <div className="grid grid-cols-4 gap-1 text-center mb-3 mt-auto">
        <M label="Views" v={fmt(c.views)} />
        <M label="ER" v={c.engagementRate.toFixed(1) + "%"} />
        <M label="Save" v={fmt(c.saves)} />
        <M label="Share" v={fmt(c.shares)} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap"><PillarBadge pillar={c.pillar} />{c.product && <span className="pill bg-brand-500/10 text-brand-500">{c.product}</span>}</div>
        <button className="btn-ghost text-xs !py-1 !px-2" onClick={onDiagnose}>✨ Diagnose</button>
      </div>
    </div>
  );
}

function M({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-md bg-black/[0.03] dark:bg-white/[0.03] py-1">
      <div className="font-bold text-xs">{v}</div>
      <div className="muted text-[9px] uppercase">{label}</div>
    </div>
  );
}

function DiagnosisModal({ c, onClose }: { c: ContentItem; onClose: () => void }) {
  const ai = useAi();
  useEffect(() => {
    ai.run("content_diagnosis", { contentId: c.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="card p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold flex items-center gap-2">✨ AI Content Diagnosis</h3>
            <p className="muted text-xs mt-0.5">{c.hook}</p>
          </div>
          <button className="btn-ghost !py-1 !px-2" onClick={onClose}>✕</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <FunnelBadge stage={c.funnel} />
          <PillarBadge pillar={c.pillar} />
          <span className="pill bg-black/5 dark:bg-white/10">{c.cta}</span>
          <span className="pill bg-black/5 dark:bg-white/10">{fmt(c.views)} views</span>
          <span className="pill bg-black/5 dark:bg-white/10">{c.engagementRate.toFixed(1)}% ER</span>
        </div>
        <AiOutput text={ai.text} loading={ai.loading} source={ai.source} />
      </div>
    </div>
  );
}
