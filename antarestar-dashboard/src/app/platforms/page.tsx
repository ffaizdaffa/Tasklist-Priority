"use client";
import { useMemo } from "react";
import { TIKTOK_DAILY } from "@/lib/normalize";
import { useContent } from "@/lib/dataClient";
import { aggregate, topBy } from "@/lib/analytics";
import { Page } from "@/components/Page";
import { PageHeader, Card, KpiCard, fmt, PlatformBadge } from "@/components/ui";
import { TrendArea, BarChartCard } from "@/components/charts";
import type { Platform } from "@/lib/types";

const PLATFORMS: Platform[] = ["Instagram", "TikTok", "Facebook", "YouTube"];
const ICON: Record<string, string> = { Instagram: "📸", TikTok: "🎵", Facebook: "👍", YouTube: "▶️" };

export default function Platforms() {
  const all = useContent();

  const groups = useMemo(
    () =>
      PLATFORMS.map((p) => {
        const items = all.filter((c) => c.platform === p);
        return { platform: p, items, agg: aggregate(items), active: items.length > 0 };
      }),
    [all],
  );

  const ttTrend = TIKTOK_DAILY.map((d) => ({
    label: d.date.slice(5),
    Activity: d.activity,
    "Bio clicks": d.bio_clicks,
  }));

  return (
    <Page>
      <PageHeader
        title="Platform Overview"
        subtitle="Cross-platform performance. Instagram & TikTok are live from the dataset; Facebook & YouTube Shorts are wired and activate on first sync."
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        {groups.map((g) => (
          <div key={g.platform} className={`card p-5 ${!g.active ? "opacity-55" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{ICON[g.platform]}</span>
                <PlatformBadge platform={g.platform} />
              </div>
              {!g.active && <span className="pill bg-gray-500/15 text-gray-400">Not connected</span>}
            </div>
            {g.active ? (
              <>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                  <Stat label="Posts" value={fmt(g.agg.posts)} />
                  <Stat label="Views" value={fmt(g.agg.views)} />
                  <Stat label="Reach" value={fmt(g.agg.reach)} />
                  <Stat label="Engagement" value={fmt(g.agg.engagement)} />
                  <Stat label="Avg ER" value={g.agg.engagementRate.toFixed(2) + "%"} />
                  <Stat label="Saves+Shares" value={fmt(g.agg.saves + g.agg.shares)} />
                </div>
              </>
            ) : (
              <p className="muted text-sm mt-2">Add the account handle in Settings and run a sync to populate this platform.</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="🎵 TikTok audience activity" subtitle="Daily active-audience count & bio-link clicks (organic)">
          <TrendArea data={ttTrend} keys={["Activity"]} colors={["#f97316"]} />
        </Card>
        <Card title="📸 Instagram engagement mix" subtitle="Likes vs comments vs shares vs saves">
          {(() => {
            const ig = groups.find((g) => g.platform === "Instagram")!.agg;
            const data = [
              { label: "Likes", value: ig.likes },
              { label: "Comments", value: ig.comments },
              { label: "Shares", value: ig.shares },
              { label: "Saves", value: ig.saves },
            ];
            return <BarChartCard data={data} colorByCell={() => "#3b82f6"} />;
          })()}
        </Card>
      </div>

      <Card title="Platform leaderboard" subtitle="Best content per active platform">
        <div className="grid md:grid-cols-2 gap-4">
          {groups.filter((g) => g.active).map((g) => (
            <div key={g.platform}>
              <div className="font-semibold text-sm mb-2 flex items-center gap-2">
                {ICON[g.platform]} {g.platform}
              </div>
              <div className="space-y-1.5">
                {topBy(g.items, (c) => c.score, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm rounded-lg p-2 bg-black/[0.02] dark:bg-white/[0.02]">
                    <span className="truncate mr-2">{c.hook}</span>
                    <span className="font-bold shrink-0">{fmt(c.views)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="muted text-[11px] uppercase tracking-wide">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
