"use client";
import { useEffect, useState } from "react";
import { Page } from "@/components/Page";
import { PageHeader, Card, PlatformBadge } from "@/components/ui";

interface Config {
  gemini: { configured: boolean; model: string };
  apify: { configured: boolean; actors: { key: string; label: string; actorId: string; platform: string }[] };
  supabase: { configured: boolean };
  cronSecret: boolean;
}

export default function Settings() {
  const [cfg, setCfg] = useState<Config | null>(null);
  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then(setCfg);
  }, []);

  return (
    <Page>
      <PageHeader
        title="Settings"
        subtitle="Integrations, actors, schedule & brand. Set secrets as environment variables (Vercel → Project → Settings → Environment Variables) — never in code."
      />

      <div className="grid lg:grid-cols-3 gap-3 mb-4">
        <StatusCard title="Google Gemini AI" ok={cfg?.gemini.configured} icon="✨"
          okText={`Connected · ${cfg?.gemini.model}`} badText="Add GEMINI_API_KEY" env="GEMINI_API_KEY" />
        <StatusCard title="Apify Data Source" ok={cfg?.apify.configured} icon="🔄"
          okText="Connected · live scraping" badText="Add APIFY_TOKEN" env="APIFY_TOKEN" />
        <StatusCard title="Supabase" ok={cfg?.supabase.configured} icon="🗄️"
          okText="Connected · persistence on" badText="Optional · seed fallback" env="NEXT_PUBLIC_SUPABASE_URL" />
      </div>

      <Card className="mb-4" title="Apify actors" subtitle="Data-source actors wired into the sync engine">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left muted text-xs uppercase">
                <th className="py-2">Source</th><th className="py-2">Platform</th><th className="py-2">Actor ID</th>
              </tr>
            </thead>
            <tbody>
              {cfg?.apify.actors.map((a) => (
                <tr key={a.key} className="border-t">
                  <td className="py-2.5 font-semibold">{a.label}</td>
                  <td><PlatformBadge platform={a.platform} /></td>
                  <td><code className="text-xs muted">{a.actorId}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted text-xs mt-3">
          Override any actor via <code>APIFY_ACTOR_*</code> env vars (see <code>.env.example</code>).
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Scheduled sync" subtitle="Auto-pull on a cron">
          <p className="text-sm muted mb-3">
            Add a <b>Vercel Cron Job</b> hitting <code>/api/sync</code> to auto-refresh. Protect it with <code>SYNC_CRON_SECRET</code>.
          </p>
          <pre className="text-xs bg-black/[0.04] dark:bg-white/[0.04] rounded-lg p-3 overflow-x-auto">{`// vercel.json
{
  "crons": [
    { "path": "/api/sync", "schedule": "0 */6 * * *" }
  ]
}`}</pre>
          <div className="mt-2 text-xs">
            Cron secret: {cfg?.cronSecret ? <span className="text-emerald-500 font-semibold">configured</span> : <span className="text-amber-500">not set</span>}
          </div>
        </Card>

        <Card title="Brand & environment" subtitle="ANTARESTAR command center">
          <div className="space-y-2 text-sm">
            <Row k="Brand" v="ANTARESTAR" />
            <Row k="Accounts" v="Outdoor · Store · Journey · Friendstar · TikTok" />
            <Row k="Palette" v="Navy · Orange · White · Soft gray" />
            <Row k="Framework" v="Objective→Audience→Positioning→Funnel→Pillar→CTA→Data" />
            <Row k="AI model" v={cfg?.gemini.model || "gemini-2.0-flash"} />
          </div>
          <div className="flex gap-2 mt-4">
            <span className="w-8 h-8 rounded-lg bg-navy-900" title="navy" />
            <span className="w-8 h-8 rounded-lg bg-brand-500" title="orange" />
            <span className="w-8 h-8 rounded-lg bg-white border" title="white" />
            <span className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600" title="gray" />
          </div>
        </Card>
      </div>

      <Card title="Setup checklist" subtitle="Go from demo to production">
        <ol className="space-y-2 text-sm list-decimal list-inside">
          <li>Deploy to Vercel (import repo, root dir <code>antarestar-dashboard</code>).</li>
          <li>Add <code>GEMINI_API_KEY</code> from Google AI Studio → unlocks full AI.</li>
          <li>Add <code>APIFY_TOKEN</code> → enables live TikTok/Instagram sync.</li>
          <li>Run <code>supabase/schema.sql</code> in your Supabase project → persistence + auth.</li>
          <li>Add a Vercel cron on <code>/api/sync</code> for scheduled pulls.</li>
        </ol>
      </Card>
    </Page>
  );
}

function StatusCard({ title, ok, icon, okText, badText, env }: { title: string; ok?: boolean; icon: string; okText: string; badText: string; env: string }) {
  return (
    <div className={`card p-5 border-l-4 ${ok ? "border-l-emerald-500" : "border-l-amber-500"}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`pill ${ok ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
          {ok == null ? "…" : ok ? "Connected" : "Not set"}
        </span>
      </div>
      <div className="font-bold mt-2">{title}</div>
      <p className="muted text-xs mt-1">{ok ? okText : badText}</p>
      <code className="text-[10px] muted mt-2 block">{env}</code>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-1.5 last:border-0">
      <span className="muted">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
