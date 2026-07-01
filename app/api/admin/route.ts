import { NextRequest, NextResponse } from "next/server";
import { initDb, setManualStatus, setRepoOverride } from "@/lib/db";
import { scoreIdea } from "@/lib/scoreIdea";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const { ideaId, manualStatus, repoOverride } = await request.json();

    if (!ideaId) {
      return NextResponse.json({ error: "ideaId required" }, { status: 400 });
    }

    let shouldRescore = false;

    if (manualStatus) {
      await setManualStatus(ideaId, manualStatus);
      shouldRescore = true;
    }

    if (repoOverride !== undefined) {
      await setRepoOverride(ideaId, repoOverride);
      shouldRescore = true;
    }

    let verdict = null;
    if (shouldRescore) {
      const result = await scoreIdea(Number(ideaId), {
        forceRescore: true,
        runLlm: true,
      });
      verdict = result.verdict;
    }

    return NextResponse.json({ success: true, verdict });
  } catch (err) {
    console.error("Admin API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
