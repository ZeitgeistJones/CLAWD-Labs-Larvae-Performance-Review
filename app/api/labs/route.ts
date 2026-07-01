import { NextResponse } from "next/server";
import { fetchLabsIdeas } from "@/lib/data";
import { initDb, getAllVerdicts, getStats, getBuilderSummary } from "@/lib/db";

export async function GET() {
  try {
    await initDb();

    const [ideas, verdicts, stats, builderMeta] = await Promise.all([
      fetchLabsIdeas(),
      getAllVerdicts(),
      getStats(),
      getBuilderSummary(),
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

    return NextResponse.json({
      ideas: merged,
      stats,
      builderSummary: builderMeta?.builder_summary || null,
      builderSummaryAt: builderMeta?.updated_at || null,
      builderSummaryCount: builderMeta?.summary_scored_count ?? null,
    });
  } catch (err) {
    console.error("Labs API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
