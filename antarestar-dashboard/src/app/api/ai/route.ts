import { NextRequest, NextResponse } from "next/server";
import { getContent } from "@/lib/normalize";
import {
  aggregate,
  buildInsights,
  filterContent,
  topBy,
  byFunnel,
  byPillar,
  type Filters,
} from "@/lib/analytics";
import {
  buildPrompt,
  callGemini,
  geminiConfigured,
  localFallback,
  type AiMode,
} from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function compact(c: any) {
  return {
    hook: c.hook,
    account: c.accountName,
    platform: c.platform,
    funnel: c.funnel,
    pillar: c.pillar,
    cta: c.cta,
    product: c.product,
    views: c.views,
    reach: c.reach,
    engagementRate: +c.engagementRate.toFixed(2),
    saves: c.saves,
    shares: c.shares,
    score: c.score,
    watchTime: c.watchTime,
    mediaType: c.mediaType,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode: AiMode = body.mode || "executive_summary";
  const filters: Filters = body.filters || {};
  const question: string | undefined = body.question;
  const contentId: string | undefined = body.contentId;

  const all = getContent();
  const items = filterContent(all, filters);
  const summary = aggregate(items);
  const insights = buildInsights(items);
  const top = topBy(items, (c) => c.score, 8).map(compact);
  const worst = topBy(items, (c) => -c.score, 5).map(compact);

  let context: any = { summary, insights, top, worst };

  if (mode === "content_diagnosis" && contentId) {
    const c = all.find((x) => x.id === contentId);
    if (c) context = compact(c);
  }
  if (mode === "winning_breakdown") {
    context = { items: top, funnels: byFunnel(items), pillars: byPillar(items) };
  }
  if (mode === "report") {
    context = {
      period: body.period || "monthly",
      summary,
      insights,
      top,
      worst,
      funnels: byFunnel(items).map((f) => ({ funnel: f.funnel, count: f.count, er: +f.engagementRate.toFixed(2) })),
      pillars: byPillar(items).filter((p) => p.count).map((p) => ({ pillar: p.pillar, count: p.count, er: +p.engagementRate.toFixed(2) })),
    };
  }

  try {
    let text: string;
    let source: "gemini" | "local";
    if (geminiConfigured()) {
      text = await callGemini(buildPrompt(mode, context, question));
      source = "gemini";
    } else {
      text = localFallback(mode, context, question) || "No output.";
      source = "local";
    }
    return NextResponse.json({ ok: true, source, mode, text });
  } catch (err: any) {
    // Graceful fallback if Gemini errors mid-flight
    const text = localFallback(mode, context, question) || "No output.";
    return NextResponse.json({
      ok: true,
      source: "local",
      mode,
      text,
      warning: String(err?.message || err),
    });
  }
}
