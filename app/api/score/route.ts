import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { scoreIdea } from "@/lib/scoreIdea";

export async function POST(request: NextRequest) {
  try {
    const { ideaId, forceRescore, runLlm, refreshGitHubOnly } =
      await request.json();

    if (!ideaId) {
      return NextResponse.json({ error: "ideaId required" }, { status: 400 });
    }

    await initDb();

    const result = await scoreIdea(Number(ideaId), {
      forceRescore: !!forceRescore,
      runLlm: runLlm !== false,
      refreshGitHubOnly: !!refreshGitHubOnly,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Score API error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message === "Idea not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
