"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "./ThemeProvider";

const NAV: { group: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    group: "Overview",
    items: [
      { href: "/", label: "Executive Summary", icon: "📊" },
      { href: "/platforms", label: "Platform Overview", icon: "🌐" },
      { href: "/accounts", label: "Account Performance", icon: "👤" },
    ],
  },
  {
    group: "Content Intelligence",
    items: [
      { href: "/content", label: "Content Performance", icon: "🎬" },
      { href: "/funnel", label: "Content Funnel", icon: "🔻" },
      { href: "/pillars", label: "Content Pillars", icon: "🧱" },
      { href: "/winning", label: "Winning Library", icon: "🏆" },
      { href: "/gaps", label: "Content Gap Analysis", icon: "🧭" },
      { href: "/workflow", label: "Upload Rhythm", icon: "🗓️" },
    ],
  },
  {
    group: "AI Command",
    items: [
      { href: "/reports", label: "AI Report Generator", icon: "📝" },
      { href: "/brainstorm", label: "AI Brainstorm Room", icon: "💡" },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/sync", label: "Data Sync Status", icon: "🔄" },
      { href: "/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* mobile top bar */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 gradient-navy text-white"
      >
        <button onClick={() => setOpen((o) => !o)} className="text-2xl leading-none">
          ☰
        </button>
        <span className="font-bold tracking-tight">ANTARESTAR</span>
        <button onClick={toggle}>{dark ? "☀️" : "🌙"}</button>
      </div>

      <aside
        className={`fixed z-50 top-0 left-0 h-screen w-[248px] gradient-navy text-white flex flex-col transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl bg-brand-500 grid place-items-center font-black text-lg">
            A
          </div>
          <div>
            <div className="font-extrabold tracking-tight leading-none">ANTARESTAR</div>
            <div className="text-[10px] uppercase tracking-widest text-brand-400 font-semibold mt-0.5">
              Command Center
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="px-2 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
                {g.group}
              </div>
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const active = path === it.href;
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${
                        active
                          ? "bg-brand-500 text-white shadow"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-base w-5 text-center">{it.icon}</span>
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-white/50">v1.0 · 2026</span>
          <button
            onClick={toggle}
            className="text-[12px] rounded-md bg-white/10 hover:bg-white/20 px-2.5 py-1"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
