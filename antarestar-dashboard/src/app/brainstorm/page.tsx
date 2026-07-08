"use client";
import { useState } from "react";
import { Page } from "@/components/Page";
import { PageHeader, Card } from "@/components/ui";
import { AiOutput, useAi } from "@/components/AiPanel";
import type { AiMode } from "@/lib/gemini";

const SUGGESTIONS = [
  "Konten mana yang harus direplikasi minggu ini?",
  "Produk apa yang harus dipush bulan ini?",
  "Akun mana yang performanya turun dan kenapa?",
  "Kenapa engagement kita turun belakangan ini?",
  "Kasih 10 ide konten untuk minggu depan.",
  "Angle apa yang cocok untuk Jacket Stormz?",
  "Buat campaign plan 1 minggu untuk boost BOFU.",
];

export default function Brainstorm() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<AiMode>("brainstorm");
  const ai = useAi();

  const ask = (question: string, m: AiMode = "brainstorm") => {
    setQ(question);
    setMode(m);
    ai.run(m, { question });
  };

  return (
    <Page>
      <PageHeader
        title="AI Brainstorming Room"
        subtitle="Ask anything about your social performance. The AI answers grounded in your live dashboard data — not generic advice."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Tanya apa saja… mis. 'kenapa TikTok turun minggu ini?'"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && q.trim() && ask(q)}
              />
              <button className="btn-primary" disabled={ai.loading || !q.trim()} onClick={() => ask(q)}>
                {ai.loading ? "…" : "Ask"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <button
                className={`btn text-xs ${mode === "brainstorm" ? "bg-brand-500 text-white" : "btn-ghost"}`}
                onClick={() => setMode("brainstorm")}
              >
                💡 Brainstorm
              </button>
              <button
                className={`btn text-xs ${mode === "campaign_planner" ? "bg-brand-500 text-white" : "btn-ghost"}`}
                onClick={() => setMode("campaign_planner")}
              >
                🎯 Campaign Planner
              </button>
            </div>
          </Card>

          <Card title={mode === "campaign_planner" ? "🎯 Campaign Plan" : "💬 Answer"}>
            {ai.text || ai.loading ? (
              <AiOutput text={ai.text} loading={ai.loading} source={ai.source} />
            ) : (
              <p className="muted text-sm py-6 text-center">
                Ask a question or tap a suggestion. Switch to <b>Campaign Planner</b> to turn any idea into a full content plan.
              </p>
            )}
          </Card>
        </div>

        <Card title="Try asking" subtitle="Grounded in your data">
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s, s.toLowerCase().includes("campaign") || s.toLowerCase().includes("plan") ? "campaign_planner" : "brainstorm")}
                className="w-full text-left text-sm rounded-lg p-2.5 border hover:border-brand-500 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
