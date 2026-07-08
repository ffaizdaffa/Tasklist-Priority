"use client";
import { useMemo, useState } from "react";
import { ACCOUNTS } from "@/lib/normalize";
import { useContent } from "@/lib/dataClient";
import { Page } from "@/components/Page";
import { PageHeader, Card, fmt } from "@/components/ui";

const STAGES = [
  { key: "Research", icon: "🔍", desc: "Trend & audience scan" },
  { key: "Ideation", icon: "💡", desc: "Hooks & angles" },
  { key: "Scripting", icon: "✍️", desc: "Copy & storyboard" },
  { key: "Production", icon: "🎥", desc: "Shoot & edit" },
  { key: "Distribution", icon: "🚀", desc: "Publish & cross-post" },
  { key: "Measurement", icon: "📊", desc: "Track metrics" },
  { key: "Iteration", icon: "🔁", desc: "Double down / kill" },
];

const WEEKLY_TARGET = 5; // per account per week

export default function Workflow() {
  const content = useContent();

  // Build week buckets from publish dates
  const weeks = useMemo(() => {
    const map = new Map<string, number>();
    content.forEach((c) => {
      const d = new Date(c.publishDate);
      if (isNaN(+d)) return;
      const onejan = new Date(d.getFullYear(), 0, 1);
      const wk = Math.ceil(((+d - +onejan) / 86400000 + onejan.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${wk}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).sort().slice(-10);
  }, [content]);

  // day-of-week rhythm
  const dow = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = new Array(7).fill(0);
    content.forEach((c) => {
      const d = new Date(c.publishDate);
      if (!isNaN(+d)) counts[d.getDay()]++;
    });
    const max = Math.max(...counts, 1);
    return days.map((d, i) => ({ day: d, count: counts[i], pct: counts[i] / max }));
  }, [content]);

  // per-account actual vs target (last 4 weeks proxy = all content / weeks)
  const perAccount = useMemo(
    () =>
      ACCOUNTS.map((a) => {
        const n = content.filter((c) => c.accountId === a.id).length;
        const wkeeks = Math.max(weeks.length, 1);
        const perWeek = n / wkeeks;
        return { a, perWeek, target: WEEKLY_TARGET, gap: perWeek - WEEKLY_TARGET };
      }),
    [content, weeks],
  );

  return (
    <Page>
      <PageHeader
        title="Upload Rhythm & Workflow"
        subtitle="Research → Ideation → Scripting → Production → Distribution → Measurement → Iteration. Consistency compounds."
      />

      {/* Workflow pipeline */}
      <Card className="mb-4" title="Production pipeline" subtitle="The 7-stage operating loop">
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className="card !shadow-none p-3 min-w-[120px] text-center">
                <div className="text-xl">{s.icon}</div>
                <div className="font-semibold text-sm mt-1">{s.key}</div>
                <div className="muted text-[10px]">{s.desc}</div>
              </div>
              {i < STAGES.length - 1 && <span className="text-brand-500 font-bold hidden md:inline">→</span>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Weekly upload rhythm" subtitle="Posts published per week (last 10 weeks)">
          <div className="flex items-end gap-2 h-40">
            {weeks.map(([wk, n]) => {
              const max = Math.max(...weeks.map((w) => w[1]), 1);
              const hit = n >= WEEKLY_TARGET * ACCOUNTS.length * 0.5;
              return (
                <div key={wk} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-semibold">{n}</span>
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${(n / max) * 100}%`, background: hit ? "#10b981" : "#f97316", minHeight: 4 }}
                  />
                  <span className="text-[9px] muted">{wk.split("-")[1]}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Best posting days" subtitle="When content actually ships">
          <div className="space-y-2 pt-2">
            {dow.map((d) => (
              <div key={d.day} className="flex items-center gap-3">
                <span className="w-9 text-xs font-semibold">{d.day}</span>
                <div className="flex-1 h-6 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
                  <div className="h-full rounded-lg gradient-navy grid place-items-end pr-2" style={{ width: `${Math.max(d.pct * 100, 6)}%` }}>
                    <span className="text-[10px] text-white font-bold">{d.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mb-4" title="Upload target vs actual" subtitle={`Target: ${WEEKLY_TARGET} posts/account/week`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left muted text-xs uppercase">
                <th className="py-2">Account</th>
                <th className="py-2 text-right">Actual / wk</th>
                <th className="py-2 text-right">Target / wk</th>
                <th className="py-2 text-right">Gap</th>
                <th className="py-2 w-1/3">Status</th>
              </tr>
            </thead>
            <tbody>
              {perAccount.map(({ a, perWeek, target, gap }) => (
                <tr key={a.id} className="border-t">
                  <td className="py-2.5 font-semibold">{a.name}</td>
                  <td className="text-right">{perWeek.toFixed(1)}</td>
                  <td className="text-right">{target}</td>
                  <td className={`text-right font-bold ${gap >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {gap >= 0 ? "+" : ""}{gap.toFixed(1)}
                  </td>
                  <td>
                    <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((perWeek / target) * 100, 100)}%`, background: gap >= 0 ? "#10b981" : "#ef4444" }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Weekly execution checklist" subtitle="The non-negotiables">
        <div className="grid md:grid-cols-2 gap-2">
          {[
            "Scan 10 trending sounds/formats (Research)",
            "Lock 15 hooks for the week (Ideation)",
            "Script BOFU + retention content (Scripting)",
            "Batch-shoot 1 week ahead (Production)",
            "Cross-post winners to TikTok + affiliates (Distribution)",
            "Log metrics into command center (Measurement)",
            "Kill bottom 20%, replicate top 20% (Iteration)",
            "Review funnel balance vs target mix",
          ].map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm rounded-lg p-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer">
              <input type="checkbox" className="accent-brand-500 w-4 h-4" />
              {t}
            </label>
          ))}
        </div>
      </Card>
    </Page>
  );
}
