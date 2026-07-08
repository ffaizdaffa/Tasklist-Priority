"use client";
import { ACCOUNTS } from "@/lib/normalize";
import { FUNNELS, PILLARS, type Filters } from "@/lib/analytics";
import type { Insight } from "@/lib/analytics";

export function FilterBar({
  value,
  onChange,
  show = ["platform", "account", "funnel", "pillar", "search"],
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  show?: string[];
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {show.includes("platform") && (
        <select className="input" value={value.platform || "all"} onChange={(e) => set({ platform: e.target.value as any })}>
          <option value="all">All platforms</option>
          <option>Instagram</option>
          <option>TikTok</option>
        </select>
      )}
      {show.includes("account") && (
        <select className="input" value={value.accountId || "all"} onChange={(e) => set({ accountId: e.target.value })}>
          <option value="all">All accounts</option>
          {ACCOUNTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      {show.includes("funnel") && (
        <select className="input" value={value.funnel || "all"} onChange={(e) => set({ funnel: e.target.value as any })}>
          <option value="all">All funnels</option>
          {FUNNELS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      )}
      {show.includes("pillar") && (
        <select className="input" value={value.pillar || "all"} onChange={(e) => set({ pillar: e.target.value as any })}>
          <option value="all">All pillars</option>
          {PILLARS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      )}
      {show.includes("search") && (
        <input
          className="input flex-1 min-w-[160px]"
          placeholder="Search caption or product…"
          value={value.search || ""}
          onChange={(e) => set({ search: e.target.value })}
        />
      )}
    </div>
  );
}

const SEV: Record<Insight["severity"], string> = {
  positive: "border-l-emerald-500",
  warning: "border-l-amber-500",
  critical: "border-l-rose-500",
  info: "border-l-blue-500",
};
const SEV_ICON: Record<Insight["severity"], string> = {
  positive: "📈",
  warning: "⚠️",
  critical: "🚨",
  info: "💡",
};

export function InsightList({ insights }: { insights: Insight[] }) {
  if (!insights.length)
    return <p className="muted text-sm">No signals for this view.</p>;
  return (
    <div className="space-y-2">
      {insights.map((i) => (
        <div
          key={i.id}
          className={`card p-3.5 border-l-4 ${SEV[i.severity]} flex gap-3`}
        >
          <span className="text-lg leading-none mt-0.5">{SEV_ICON[i.severity]}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm flex items-center gap-2">
              {i.title}
              {i.metric && <span className="pill bg-brand-500/15 text-brand-500">{i.metric}</span>}
            </div>
            <p className="muted text-xs mt-0.5 leading-relaxed">{i.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
