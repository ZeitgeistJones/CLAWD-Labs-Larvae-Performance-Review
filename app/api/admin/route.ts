import { NextRequest, NextResponse } from "next/server";
import {
  initDb,
  setManualStatus,
  setRepoOverride,
  setEvidenceCommits,
} from "@/lib/db";
import { scoreIdea } from "@/lib/scoreIdea";
import { generateBuilderSummary } from "@/lib/builderSummary";

export async function POST(request: NextRequest) {
  try {
    await initDb();
    const body = await request.json();

    if (body.refreshBuilderSummary) {
      const result = await generateBuilderSummary();
      return NextResponse.json({ success: true, builderSummary: result });
    }

    const { ideaId, manualStatus, repoOverride, evidenceCommits } = body;

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

    if (evidenceCommits !== undefined) {
      await setEvidenceCommits(ideaId, evidenceCommits);
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
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
