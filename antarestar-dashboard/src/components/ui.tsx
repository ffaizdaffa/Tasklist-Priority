"use client";
import type { FunnelStage, ContentPillar } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="muted text-sm mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  title,
  subtitle,
  right,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className={`card p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="font-bold">{title}</h3>}
            {subtitle && <p className="muted text-xs mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function fmt(n: number): string {
  if (n == null || isNaN(n)) return "0";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Math.round(n).toLocaleString();
}

export function KpiCard({
  label,
  value,
  delta,
  icon,
  suffix,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  icon?: string;
  suffix?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="muted text-xs font-semibold uppercase tracking-wide">{label}</span>
        {icon && <span className="text-lg opacity-70">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight">
        {value}
        {suffix && <span className="text-base font-bold muted ml-0.5">{suffix}</span>}
      </div>
      {delta != null && (
        <div
          className={`mt-1 text-xs font-bold ${up ? "text-emerald-500" : "text-rose-500"}`}
        >
          {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs prev
        </div>
      )}
    </div>
  );
}

const FUNNEL_COLORS: Record<FunnelStage, string> = {
  TOFU: "bg-blue-500/15 text-blue-500",
  MOFU: "bg-violet-500/15 text-violet-500",
  BOFU: "bg-brand-500/15 text-brand-500",
  Retention: "bg-emerald-500/15 text-emerald-500",
};

export function FunnelBadge({ stage }: { stage: FunnelStage }) {
  return <span className={`pill ${FUNNEL_COLORS[stage]}`}>{stage}</span>;
}

export function PillarBadge({ pillar }: { pillar: ContentPillar }) {
  return (
    <span className="pill bg-navy-600/10 text-navy-600 dark:bg-white/10 dark:text-white/80">
      {pillar}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, string> = {
    Instagram: "bg-pink-500/15 text-pink-500",
    TikTok: "bg-slate-500/15 text-slate-400",
    Facebook: "bg-blue-600/15 text-blue-500",
    YouTube: "bg-red-500/15 text-red-500",
  };
  return <span className={`pill ${map[platform] || "bg-gray-500/15"}`}>{platform}</span>;
}

export function ScoreRing({ score }: { score: number }) {
  const color = score >= 66 ? "#10b981" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <div
      className="relative w-10 h-10 shrink-0 rounded-full grid place-items-center text-[11px] font-bold"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--border) 0deg)` }}
    >
      <div
        className="absolute inset-[3px] rounded-full grid place-items-center"
        style={{ background: "var(--panel)" }}
      >
        {score}
      </div>
    </div>
  );
}

export function Empty({ label }: { label: string }) {
  return (
    <div className="card p-10 text-center muted text-sm">{label}</div>
  );
}
