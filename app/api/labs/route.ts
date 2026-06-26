import { NextResponse } from "next/server";
import { fetchLabsIdeas } from "@/lib/data";
import { initDb, getAllVerdicts, getStats } from "@/lib/db";

export async function GET() {
  try {
    await initDb();

    const [ideas, verdicts, stats] = await Promise.all([
      fetchLabsIdeas(),
      getAllVerdicts(),
      getStats(),
    ]);

    const verdictMap = new Map(
      verdicts.map((v: any) => [v.idea_id, v])
    );

    const merged = ideas.map((idea: any) => ({
      ...idea,
      verdict: verdictMap.get(idea.id) || null,
    }));

    // sort by total_cv descending
    merged.sort((a: any, b: any) => (b.total_cv || 0) - (a.total_cv || 0));

    return NextResponse.json({ ideas: merged, stats });
  } catch (err) {
    console.error("Labs API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
