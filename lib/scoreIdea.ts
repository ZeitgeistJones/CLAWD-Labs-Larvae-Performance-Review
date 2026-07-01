import {
  fetchLabsIdea,
  fetchRepoCommits,
  fetchRepoReadme,
  daysSince,
} from "@/lib/data";
import { resolveLinkedRepo } from "@/lib/matching";
import { getReviewStatus } from "@/lib/status";
import { scoreAlignment } from "@/lib/scoring";
import { getVerdict, upsertVerdict } from "@/lib/db";

const STALE_DAYS = 30;
const RESCORE_AFTER_DAYS = 1;

export interface ScoreIdeaOptions {
  forceRescore?: boolean;
  runLlm?: boolean;
  refreshGitHubOnly?: boolean;
}

export interface ScoreIdeaResult {
  verdict: Record<string, unknown>;
  cached: boolean;
}

export async function scoreIdea(
  ideaId: number,
  options: ScoreIdeaOptions = {}
): Promise<ScoreIdeaResult> {
  const { forceRescore = false, runLlm = true, refreshGitHubOnly = false } =
    options;

  const existing = await getVerdict(ideaId);

  if (
    !forceRescore &&
    !refreshGitHubOnly &&
    existing &&
    existing.updated_at
  ) {
    const daysSinceScore = daysSince(existing.updated_at);
    if (daysSinceScore < RESCORE_AFTER_DAYS) {
      return { verdict: existing, cached: true };
    }
  }

  const ideaData = await fetchLabsIdea(ideaId);
  const idea = ideaData.idea;
  if (!idea) {
    throw new Error("Idea not found");
  }

  const consensus = idea.aggregated_opinion || "";
  const consensusShort = idea.aggregated_opinion_short || "";
  const repoOverride = existing?.linked_repo_override || null;

  const { repo: linkedRepo } = await resolveLinkedRepo(idea.title, repoOverride);

  let commits: { commit: { message: string; committer: { date: string } } }[] =
    [];
  let readme = "";
  let lastCommitDays: number | null = null;
  let isStalled = false;

  if (linkedRepo) {
    commits = await fetchRepoCommits(linkedRepo.name);
    readme = await fetchRepoReadme(linkedRepo.name);

    if (commits.length > 0) {
      lastCommitDays = daysSince(commits[0].commit.committer.date);
      isStalled = lastCommitDays > STALE_DAYS;
    } else if (linkedRepo.pushed_at || linkedRepo.updated_at) {
      lastCommitDays = daysSince(linkedRepo.pushed_at || linkedRepo.updated_at);
      isStalled = lastCommitDays > STALE_DAYS;
    }
  }

  const commitMessages = commits.map(
    (c) => c.commit.message.split("\n")[0]
  );

  const reviewStatus = getReviewStatus(
    { status: idea.status, archived: idea.archived },
    {
      manual_status: existing?.manual_status,
      is_stalled: isStalled,
      linked_repo: linkedRepo?.name || null,
    }
  );

  const hasEvidence =
    !!linkedRepo && (commitMessages.length > 0 || readme.length > 0);

  let score: number | null = refreshGitHubOnly
    ? (existing?.score ?? null)
    : null;
  let primaryScore: number | null = refreshGitHubOnly
    ? (existing?.primary_score ?? null)
    : null;
  let secondaryScore: number | null = refreshGitHubOnly
    ? (existing?.secondary_score ?? null)
    : null;
  let alignmentSummary: string | null = refreshGitHubOnly
    ? (existing?.alignment_summary ?? null)
    : null;
  let qualityNotes: string | null = refreshGitHubOnly
    ? (existing?.quality_notes ?? null)
    : null;

  if (runLlm && reviewStatus === "shipped" && consensus) {
    if (hasEvidence) {
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
    } else {
      alignmentSummary = linkedRepo
        ? "Repo linked but no commits or README found — check the repo name or GitHub access."
        : "No GitHub repo linked — set a repo override in admin or verify the build title matches the repo name.";
      qualityNotes = null;
    }
  }

  const verdictData = {
    idea_id: idea.id,
    idea_title: idea.title,
    score,
    primary_score: primaryScore,
    secondary_score: secondaryScore,
    alignment_summary: alignmentSummary,
    quality_notes: qualityNotes,
    stall_reason: null,
    stall_confidence: null,
    linked_repo: linkedRepo?.name || null,
    repo_url: linkedRepo?.html_url || null,
    linked_repo_override: repoOverride,
    last_commit_days: lastCommitDays,
    is_stalled: isStalled,
    larvae_consensus: consensusShort || consensus?.slice(0, 500) || null,
    idea_status: idea.status,
    manual_status: existing?.manual_status || null,
    total_cv: idea.total_cv || 0,
  };

  await upsertVerdict(verdictData);

  return { verdict: verdictData, cached: false };
}
