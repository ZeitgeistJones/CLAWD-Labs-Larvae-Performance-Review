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

    const merged = ideas.map((idea: {
      id: number;
      title: string;
      status: string;
      total_cv: number;
      aggregated_opinion: string | null;
      created_at: string;
    }) => ({
      ...idea,
      verdict: verdictMap.get(idea.id) || null,
    }));

    return NextResponse.json({ ideas: merged, stats });
  } catch (err) {
    console.error("Labs API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
