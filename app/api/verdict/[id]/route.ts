import { NextRequest, NextResponse } from "next/server";
import { initDb, getVerdict } from "@/lib/db";
import { fetchLabsIdea } from "@/lib/data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ideaId = Number(id);
    if (!ideaId) {
      return NextResponse.json({ error: "Invalid idea id" }, { status: 400 });
    }

    await initDb();

    const [verdict, ideaData] = await Promise.all([
      getVerdict(ideaId),
      fetchLabsIdea(ideaId).catch(() => null),
    ]);

    const idea = ideaData?.idea ?? null;

    return NextResponse.json({
      verdict: verdict || null,
      idea: idea
        ? {
            title: idea.title,
            description: idea.description,
            status: idea.status,
            archived: idea.archived,
            total_cv: idea.total_cv,
            aggregated_opinion: idea.aggregated_opinion,
            aggregated_opinion_short: idea.aggregated_opinion_short,
          }
        : null,
    });
  } catch (err) {
    console.error("Verdict API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
