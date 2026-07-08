# ANTARESTAR — Social Media Command Center

Not just a dashboard — an **internal social-media operating system** for ANTARESTAR.
Pulls data from **Apify**, reads performance across accounts / platforms / campaigns /
content / funnel, and turns it into **action plans** with **Google Gemini AI**.

Built on the ANTARESTAR framework:
**Objective → Audience → Positioning → Content Funnel → Content Pillar → CTA → Data & Iteration.**

> ⚡ **It runs out of the box.** With zero API keys the app is fully explorable on the real
> ANTARESTAR data bundled from `Marketing_Antarestar_2026.xlsx` (164 real posts + 12 months
> of per-account metrics). Add keys to switch integrations from *seed* to *live*.

## Modules

| # | Module | What it does |
|---|--------|--------------|
| 1 | **Executive Summary** | Views, reach, engagement, follower growth, top/worst content, period-over-period, one-click AI report |
| 2 | **Platform Overview** | TikTok · Instagram · Facebook · YouTube Shorts |
| 3 | **Account Performance** | Per-account matrix (Official, Store, Affiliate, Community, Brand) — 11 metrics each |
| 4 | **Content Performance** | Table + card view, auto-classified funnel/pillar/CTA/product, per-item AI diagnosis |
| 5 | **Content Funnel** | TOFU / MOFU / BOFU / Retention balance vs target mix + best per stage |
| 6 | **Content Pillars** | 12-pillar volume vs engagement, best per pillar |
| 7 | **Winning Library** | Top 10 by views / engagement / save-share / conversion, AI breakdown, replicate brief |
| 8 | **Content Gap Analysis** | Inactive pillars, unproductive accounts, funnel imbalance, under-distributed products |
| 9 | **Upload Rhythm & Workflow** | 7-stage pipeline, weekly rhythm, target vs actual, execution checklist |
| 10 | **AI Report Generator** | Daily / weekly / monthly structured reports |
| + | **AI Brainstorm Room** | Ask anything, grounded in your data · Campaign Planner |
| + | **Sync Status & Settings** | Apify actors, last sync, error log, integration health |

## AI features (Gemini)

Executive Summary · Content Diagnosis · Winning Content Breakdown · Action Recommendation ·
Brainstorming Room · Campaign Planner — each grounded in the filtered dashboard data.
A deterministic **local analytics engine** answers when no `GEMINI_API_KEY` is present.

## Advanced logic engine

Rising & dropping content · underperforming accounts · content fatigue · winning hook
patterns · funnel imbalance · best pillar · over-pushed weak products · boost-worthy posts ·
affiliate-replication candidates — all computed in `src/lib/analytics.ts`.

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind · Recharts ·
Apify API · Google Gemini API · Supabase (Postgres + Auth) · Vercel.

## Run locally

```bash
cd antarestar-dashboard
npm install
cp .env.example .env.local   # optional — app works without keys
npm run dev                  # http://localhost:3000
```

## Deploy to Vercel

1. Import the repo, set **Root Directory** = `antarestar-dashboard`.
2. Add env vars from `.env.example` (all optional; add what you have).
3. Deploy. `vercel.json` registers a 6-hourly cron on `/api/sync`.

## Integrations

- **Apify** — `src/lib/apify.ts` wires the 5 named actors (TikTok Profile/Scraper/Video,
  Instagram Scraper/Profile), runs them via `run-sync-get-dataset-items`, and normalizes
  results. Trigger from **Sync Status** or the cron.
- **Gemini** — `src/lib/gemini.ts` (prompt builders + call) via `POST /api/ai`.
- **Supabase** — `supabase/schema.sql` persists accounts, raw items, normalized content,
  monthly rollups, sync state, and saved AI reports (with RLS).

## Data flow

```
Apify actors ──▶ /api/sync ──▶ normalizeApifyItem ──▶ classify (funnel/pillar/CTA/product)
                                          │
                                          ▼
                         Supabase (or bundled seed) ──▶ analytics engine ──▶ dashboard + Gemini
```

Bundled seed lives in `src/lib/seed.ts` (generated from the real spreadsheet) and is
normalized by `src/lib/normalize.ts`, so every screen has real numbers on first load.
