import { NextResponse } from "next/server";
import { getServerRows } from "@/lib/serverData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns raw content rows the dashboard renders — live Supabase data when
// available, else bundled seed. The client derives funnel/pillar/score.
export async function GET() {
  const { rows, source } = await getServerRows();
  return NextResponse.json({ source, count: rows.length, content: rows });
}
