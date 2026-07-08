"use client";
import { useState } from "react";
import { Page } from "@/components/Page";
import { PageHeader, Card } from "@/components/ui";
import { FilterBar } from "@/components/Filters";
import { AiOutput, useAi } from "@/components/AiPanel";
import type { Filters } from "@/lib/analytics";

const PERIODS = [
  { key: "daily", label: "Daily", icon: "☀️" },
  { key: "weekly", label: "Weekly", icon: "📅" },
  { key: "monthly", label: "Monthly", icon: "🗓️" },
];

export default function Reports() {
  const [period, setPeriod] = useState("weekly");
  const [filters, setFilters] = useState<Filters>({});
  const ai = useAi();

  return (
    <Page>
      <PageHeader
        title="AI Report Generator"
        subtitle="One click → executive summary, what happened, why, winning & losing content, recommendation, action plan, next ideas."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`btn text-sm ${period === p.key ? "bg-brand-500 text-white" : "btn-ghost"}`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => ai.run("report", { filters, period })} disabled={ai.loading}>
            ✨ {ai.loading ? "Writing report…" : "Generate Report"}
          </button>
        </div>
        <div className="mt-4">
          <FilterBar value={filters} onChange={setFilters} show={["platform", "account", "funnel"]} />
        </div>
      </Card>

      <Card title={`📝 ${period[0].toUpperCase() + period.slice(1)} Report`}>
        {ai.text || ai.loading ? (
          <AiOutput text={ai.text} loading={ai.loading} source={ai.source} />
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-2">📝</div>
            <p className="muted text-sm max-w-md mx-auto">
              Pick a period and hit <b>Generate Report</b>. The AI reads your filtered data and produces a full
              structured brief you can paste straight into your team channel.
            </p>
          </div>
        )}
      </Card>
    </Page>
  );
}
