import { NextResponse } from "next/server";
import { ACTORS, apifyConfigured } from "@/lib/apify";
import { geminiConfigured } from "@/lib/gemini";
import { supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    gemini: { configured: geminiConfigured(), model: process.env.GEMINI_MODEL || "gemini-2.0-flash" },
    apify: { configured: apifyConfigured(), actors: ACTORS.map((a) => ({ key: a.key, label: a.label, actorId: a.actorId, platform: a.platform })) },
    supabase: { configured: supabaseConfigured() },
    sheet: { configured: !!process.env.SHEET_API_URL },
    cronSecret: !!process.env.SYNC_CRON_SECRET,
  });
}
