"use client";
import { useEffect, useState } from "react";
import { Page } from "@/components/Page";
import { PageHeader, Card, fmt, PlatformBadge } from "@/components/ui";
import type { SyncSource } from "@/lib/types";

interface LogEntry { ts: string; source: string; level: string; message: string }

export default function Sync() {
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const r = await fetch("/api/sync");
    const j = await r.json();
    setSources(j.sources || []);
    setLog(j.log || []);
    setConfigured(j.configured);
  };
  useEffect(() => { load(); }, []);

  const sync = async (key?: string) => {
    setBusy(key || "all");
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(key ? { key } : {}),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const STATUS: Record<string, string> = {
    ok: "bg-emerald-500/15 text-emerald-500",
    error: "bg-rose-500/15 text-rose-500",
    running: "bg-amber-500/15 text-amber-500",
    idle: "bg-gray-500/15 text-gray-400",
  };

  return (
    <Page>
      <PageHeader
        title="Data Sync Status"
        subtitle="Apify integration health — actors, schedule, last sync, and error log."
        right={
          <button className="btn-primary" onClick={() => sync()} disabled={!!busy}>
            🔄 {busy === "all" ? "Syncing…" : "Sync all now"}
          </button>
        }
      />

      <div className={`card p-4 mb-4 border-l-4 ${configured ? "border-l-emerald-500" : "border-l-amber-500"}`}>
        <div className="flex items-center gap-2 font-semibold">
          {configured ? "🟢 Apify connected — live scraping enabled" : "🟡 Running on bundled seed cache"}
        </div>
        <p className="muted text-sm mt-1">
          {configured
            ? "Actors run against the configured account handles. Data normalizes into the command center automatically."
            : "Add APIFY_TOKEN in Settings (or Vercel env) to enable live TikTok & Instagram scraping. Sync buttons still work against the seed cache so you can test the flow."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
        {sources.map((s) => (
          <div key={s.key} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm">{s.label}</div>
              <span className={`pill ${STATUS[s.status]}`}>{s.status}</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <PlatformBadge platform={s.platform} />
              <code className="text-[10px] muted truncate">{s.actorId}</code>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div><b className="block">{fmt(s.items)}</b><span className="muted">items</span></div>
              <div><b className="block text-xs">{s.lastSync ? new Date(s.lastSync).toLocaleString() : "never"}</b><span className="muted">last sync</span></div>
            </div>
            {s.error && <div className="text-xs text-rose-500 mb-2 break-words">⚠️ {s.error}</div>}
            <button className="btn-ghost text-xs w-full" onClick={() => sync(s.key)} disabled={!!busy}>
              {busy === s.key ? "Syncing…" : "Refresh this source"}
            </button>
          </div>
        ))}
      </div>

      <Card title="Error & activity log" subtitle="Last 100 events">
        <div className="max-h-80 overflow-y-auto font-mono text-xs space-y-1">
          {log.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="muted shrink-0">{new Date(e.ts).toLocaleString()}</span>
              <span className={e.level === "error" ? "text-rose-500" : "text-emerald-500"}>[{e.source}]</span>
              <span>{e.message}</span>
            </div>
          ))}
          {!log.length && <p className="muted">No events yet.</p>}
        </div>
      </Card>
    </Page>
  );
}
