"use client";
import { useState } from "react";
import type { Filters } from "@/lib/analytics";
import type { AiMode } from "@/lib/gemini";

function renderMarkdown(md: string) {
  // Lightweight markdown → HTML (headers, bold, bullets, blockquote).
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  for (let raw of lines) {
    let l = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, '<code class="px-1 rounded bg-black/10 dark:bg-white/10 text-xs">$1</code>');
    if (/^#{1,6}\s/.test(l)) {
      if (inList) { html.push("</ul>"); inList = false; }
      const lvl = l.match(/^#+/)![0].length;
      html.push(`<div class="font-bold mt-3 mb-1 ${lvl <= 2 ? "text-base" : "text-sm"}">${l.replace(/^#+\s/, "")}</div>`);
    } else if (/^\s*[-*]\s/.test(l)) {
      if (!inList) { html.push('<ul class="space-y-1 my-1">'); inList = true; }
      html.push(`<li class="flex gap-2 text-sm"><span class="text-brand-500">•</span><span>${l.replace(/^\s*[-*]\s/, "")}</span></li>`);
    } else if (/^>\s/.test(l)) {
      html.push(`<div class="text-xs muted italic border-l-2 border-brand-500 pl-2 my-2">${l.replace(/^>\s/, "")}</div>`);
    } else if (l.trim() === "") {
      if (inList) { html.push("</ul>"); inList = false; }
    } else {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<p class="text-sm my-1 leading-relaxed">${l}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("");
}

export function useAi() {
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [source, setSource] = useState<string>("");

  async function run(mode: AiMode, opts: { filters?: Filters; question?: string; contentId?: string; period?: string } = {}) {
    setLoading(true);
    setText("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, ...opts }),
      });
      const json = await res.json();
      setText(json.text || "No response.");
      setSource(json.source);
    } catch (e: any) {
      setText("⚠️ AI request failed: " + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }
  return { loading, text, source, run, setText };
}

export function AiOutput({ text, loading, source }: { text: string; loading: boolean; source?: string }) {
  if (loading)
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="shimmer h-4 rounded" style={{ width: `${90 - i * 8}%` }} />
        ))}
        <p className="text-xs muted pt-1">✨ AI is analyzing your data…</p>
      </div>
    );
  if (!text) return null;
  return (
    <div>
      {source && (
        <div className="mb-2">
          <span className={`pill ${source === "gemini" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
            {source === "gemini" ? "⚡ Gemini" : "⚙️ Local engine"}
          </span>
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
    </div>
  );
}

/** A self-contained AI insight panel with a trigger button. */
export function AiInsightPanel({
  mode,
  filters,
  label = "Generate AI Insight",
  title = "AI Insight",
  icon = "✨",
}: {
  mode: AiMode;
  filters?: Filters;
  label?: string;
  title?: string;
  icon?: string;
}) {
  const { loading, text, source, run } = useAi();
  return (
    <div className="card p-5 border-brand-500/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <span>{icon}</span> {title}
        </h3>
        <button className="btn-primary text-xs" onClick={() => run(mode, { filters })} disabled={loading}>
          {loading ? "Analyzing…" : label}
        </button>
      </div>
      {text ? (
        <AiOutput text={text} loading={loading} source={source} />
      ) : loading ? (
        <AiOutput text="" loading source={source} />
      ) : (
        <p className="muted text-sm">
          Click <b>{label}</b> to let the AI read this view and summarize what happened, why, and what to do next.
        </p>
      )}
    </div>
  );
}
