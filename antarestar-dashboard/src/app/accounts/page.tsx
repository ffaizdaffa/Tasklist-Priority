"use client";
import { useMemo } from "react";
import { ACCOUNTS, getContent, getMonthly, MONTHS } from "@/lib/normalize";
import { aggregate } from "@/lib/analytics";
import { Page } from "@/components/Page";
import { PageHeader, Card, fmt, PlatformBadge } from "@/components/ui";
import { MiniLine } from "@/components/charts";

const ROLE_COLOR: Record<string, string> = {
  Official: "bg-brand-500/15 text-brand-500",
  Store: "bg-emerald-500/15 text-emerald-500",
  Affiliate: "bg-violet-500/15 text-violet-500",
  Community: "bg-blue-500/15 text-blue-500",
  Brand: "bg-amber-500/15 text-amber-500",
};

export default function Accounts() {
  const content = getContent();
  const monthly = getMonthly();

  const rows = useMemo(
    () =>
      ACCOUNTS.map((a) => {
        const items = content.filter((c) => c.accountId === a.id);
        const agg = aggregate(items);
        const accMonthly = monthly
          .filter((m) => m.accountId === a.id)
          .sort((x, y) => MONTHS.indexOf(x.month) - MONTHS.indexOf(y.month));
        const followerSeries = accMonthly.map((m) => m.followers);
        const erSeries = accMonthly.map((m) => m.engagementRate);
        const followers = accMonthly.length
          ? accMonthly[accMonthly.length - 1].followers
          : a.followers;
        return { a, items, agg, followerSeries, erSeries, followers };
      }),
    [content, monthly],
  );

  const metrics = [
    "Followers", "Posts", "Views", "Reach", "Likes", "Comments",
    "Shares", "Saves", "ER %", "Watch", "Profile visits",
  ];

  return (
    <Page>
      <PageHeader
        title="Account Performance"
        subtitle="Per-account read across the ANTARESTAR portfolio — Official, Store, Affiliate, Community & Brand."
      />

      {/* Cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
        {rows.map(({ a, agg, followerSeries, followers }) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="font-bold">{a.name}</div>
                <div className="muted text-xs">{a.handle}</div>
              </div>
              <span className={`pill ${ROLE_COLOR[a.role]}`}>{a.role}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <PlatformBadge platform={a.platform} />
              <span className="muted text-xs">{fmt(followers)} followers</span>
            </div>
            {followerSeries.length > 1 && (
              <div className="mb-3">
                <MiniLine data={followerSeries} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="Views" value={fmt(agg.views)} />
              <Mini label="Engage" value={fmt(agg.engagement)} />
              <Mini label="ER" value={agg.engagementRate.toFixed(1) + "%"} />
              <Mini label="Reach" value={fmt(agg.reach)} />
              <Mini label="Saves" value={fmt(agg.saves)} />
              <Mini label="Posts" value={fmt(agg.posts)} />
            </div>
          </div>
        ))}
      </div>

      {/* Full metric table */}
      <Card title="Full account matrix" subtitle="Every account × every metric">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left muted text-xs uppercase tracking-wide">
                <th className="py-2 px-2 sticky left-0">Account</th>
                {metrics.map((m) => (
                  <th key={m} className="py-2 px-2 text-right">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, agg, followers }) => (
                <tr key={a.id} className="border-t hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 font-semibold whitespace-nowrap">{a.name}</td>
                  <td className="px-2 text-right">{fmt(followers)}</td>
                  <td className="px-2 text-right">{fmt(agg.posts)}</td>
                  <td className="px-2 text-right">{fmt(agg.views)}</td>
                  <td className="px-2 text-right">{fmt(agg.reach)}</td>
                  <td className="px-2 text-right">{fmt(agg.likes)}</td>
                  <td className="px-2 text-right">{fmt(agg.comments)}</td>
                  <td className="px-2 text-right">{fmt(agg.shares)}</td>
                  <td className="px-2 text-right">{fmt(agg.saves)}</td>
                  <td className="px-2 text-right font-semibold">{agg.engagementRate.toFixed(2)}%</td>
                  <td className="px-2 text-right">{fmt(agg.watchTime)}s</td>
                  <td className="px-2 text-right">{fmt(agg.profileActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] dark:bg-white/[0.03] py-1.5">
      <div className="font-bold text-sm">{value}</div>
      <div className="muted text-[10px] uppercase">{label}</div>
    </div>
  );
}
