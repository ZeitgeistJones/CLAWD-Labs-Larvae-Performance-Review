import { NextRequest, NextResponse } from "next/server";
import {
  fetchLabsIdea,
  fetchClawdRepos,
  fetchRepoCommits,
  fetchRepoReadme,
  daysSince,
} from "@/lib/data";
import { scoreAlignment, analyzeStall } from "@/lib/scoring";
import { initDb, upsertVerdict, getVerdict } from "@/lib/db";

const STALE_DAYS = 30;
const RESCORE_AFTER_DAYS = 1;

function fuzzyMatch(ideaTitle: string, repoName: string): number {
  const ideaWords = ideaTitle.toLowerCase().split(/\W+/).filter(Boolean);
  const repoWords = repoName.toLowerCase().split(/[-_\W]+/).filter(Boolean);
  const overlap = ideaWords.filter((w) => repoWords.includes(w)).length;
  return overlap / Math.max(ideaWords.length, 1);
}

export async function POST(request: NextRequest) {
  try {
    const { ideaId, forceRescore } = await request.json();
    if (!ideaId) return NextResponse.json({ error: "ideaId required" }, { status: 400 });

    await initDb();

    if (!forceRescore) {
      const existing = await getVerdict(ideaId);
      if (existing) {
        const daysSinceScore = daysSince(existing.updated_at);
        if (daysSinceScore < RESCORE_AFTER_DAYS) {
          return NextResponse.json({ verdict: existing, cached: true });
        }
      }
    }

    const ideaData = await fetchLabsIdea(ideaId);
    const idea = ideaData.idea;

    if (!idea) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    const consensus = idea.aggregated_opinion || "";
    const consensusShort = idea.aggregated_opinion_short || "";

    if (!consensus && idea.status !== "shipped") {
      return NextResponse.json({
        verdict: null,
        reason: "No consensus yet — larvae haven't weighed in",
      });
    }

    const repos = await fetchClawdRepos();
    let bestRepo = null;
    let bestScore = 0;

    for (const repo of repos) {
      const matchScore = fuzzyMatch(idea.title, repo.name);
      const descMatch = idea.title
        .toLowerCase()
        .split(/\W+/)
        .some(
          (w: string) =>
            w.length > 3 && repo.description?.toLowerCase().includes(w)
        );
      const totalScore = matchScore + (descMatch ? 0.3 : 0);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestRepo = repo;
      }
    }

    const linkedRepo = bestScore > 0.2 ? bestRepo : null;

    let commits: { commit: { message: string; committer: { date: string } } }[] = [];
    let readme = "";
    let lastCommitDays: number | null = null;
    let isStalled = false;

    if (linkedRepo) {
      commits = await fetchRepoCommits(linkedRepo.name);
      readme = await fetchRepoReadme(linkedRepo.name);

      if (commits.length > 0) {
        lastCommitDays = daysSince(commits[0].commit.committer.date);
        isStalled = lastCommitDays > STALE_DAYS;
      } else {
        lastCommitDays = daysSince(linkedRepo.pushed_at || linkedRepo.updated_at);
        isStalled = lastCommitDays > STALE_DAYS;
      }
    }

    const commitMessages = commits.map(
      (c: { commit: { message: string } }) => c.commit.message.split("\n")[0]
    );

    let score = null;
    let primaryScore = null;
    let secondaryScore = null;
    let alignmentSummary = null;
    let qualityNotes = null;

    if (idea.status === "shipped" && consensus) {
      const result = await scoreAlignment(
        idea.title,
        idea.description,
        consensus,
        linkedRepo?.description || "",
        commitMessages,
        readme
      );
      score = result.score;
      primaryScore = result.primary_score;
      secondaryScore = result.secondary_score;
      alignmentSummary = result.alignment_summary;
      qualityNotes = result.quality_notes;
    }

    let stallReason = null;
    let stallConfidence = null;

    if (isStalled && consensus) {
      const stallResult = await analyzeStall(
        idea.title,
        consensus,
        lastCommitDays || 30,
        commitMessages,
        readme
      );
      stallReason = stallResult.reason;
      stallConfidence = stallResult.confidence;
    }

    const verdictData = {
      idea_id: idea.id,
      idea_title: idea.title,
      score,
      primary_score: primaryScore,
      secondary_score: secondaryScore,
      alignment_summary: alignmentSummary,
      quality_notes: qualityNotes,
      stall_reason: stallReason,
      stall_confidence: stallConfidence,
      linked_repo: linkedRepo?.name || null,
      repo_url: linkedRepo?.html_url || null,
      last_commit_days: lastCommitDays,
      is_stalled: isStalled,
      larvae_consensus: consensusShort || consensus?.slice(0, 500) || null,
      idea_status: idea.status,
      total_cv: idea.total_cv || 0,
    };

    await upsertVerdict(verdictData);

    return NextResponse.json({ verdict: verdictData, cached: false });
  } catch (err) {
    console.error("Score API error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
