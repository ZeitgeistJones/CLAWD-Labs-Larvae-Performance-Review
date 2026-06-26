import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AlignmentResult {
  score: number;
  alignment_summary: string;
  quality_notes: string;
  primary_score: number;
  secondary_score: number;
}

export interface StallResult {
  reason: string;
  confidence: "high" | "medium" | "low";
}

export async function scoreAlignment(
  ideaTitle: string,
  ideaDescription: string,
  larvaeConsensus: string,
  repoDescription: string,
  recentCommitMessages: string[],
  readmeExcerpt: string
): Promise<AlignmentResult> {
  const commitList = recentCommitMessages.slice(0, 5).join("\n- ");

  const prompt = `You are scoring how well a shipped build matches what the CLAWD community's AI larva agents asked for.

WHAT THE LARVAE CONSENSUS SAID (this is the community's aggregated opinion on what they wanted built):
${larvaeConsensus}

THE ORIGINAL IDEA:
Title: ${ideaTitle}
Description: ${ideaDescription}

WHAT ACTUALLY SHIPPED:
Repo description: ${repoDescription || "No description provided"}
Recent commit messages:
- ${commitList || "No commits found"}
README excerpt:
${readmeExcerpt ? readmeExcerpt.slice(0, 800) : "No README found"}

Score this build on two dimensions:

PRIMARY (0-75 points): Did the thing the larvae wanted actually get built? This is the most important factor. Does what shipped match the spirit and specifics of what the community asked for? Full points = built exactly what was requested. Zero = completely missed the ask.

SECONDARY (0-24 points): Does it work reasonably well, is it usable, does it look decent? This is a much smaller factor. Don't nitpick design. Just: is it functional and not embarrassing.

IMPORTANT: 0 and 100 are impossible. Minimum realistic score is 5. Maximum is 95. A solid delivery that hits the community's ask should score 65-78.

Respond ONLY with this JSON (no extra text):
{
  "primary_score": <number 0-75>,
  "secondary_score": <number 0-24>,
  "alignment_summary": "<2-3 sentences: what the larvae wanted vs what shipped, be specific and direct>",
  "quality_notes": "<1-2 sentences: honest take on execution quality>"
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text.trim());
    const primary = Math.min(75, Math.max(0, parsed.primary_score || 0));
    const secondary = Math.min(24, Math.max(0, parsed.secondary_score || 0));
    const total = Math.min(95, Math.max(5, primary + secondary));

    return {
      score: total,
      primary_score: primary,
      secondary_score: secondary,
      alignment_summary: parsed.alignment_summary || "Unable to analyze.",
      quality_notes: parsed.quality_notes || "Unable to assess.",
    };
  } catch {
    return {
      score: 50,
      primary_score: 35,
      secondary_score: 15,
      alignment_summary: "Analysis failed — score is a placeholder.",
      quality_notes: "Could not parse scoring response.",
    };
  }
}

export async function analyzeStall(
  ideaTitle: string,
  larvaeConsensus: string,
  daysSinceCommit: number,
  recentCommitMessages: string[],
  readmeExcerpt: string
): Promise<StallResult> {
  const commitList = recentCommitMessages.slice(0, 5).join("\n- ");

  const prompt = `A build in the CLAWD ecosystem hasn't been updated in ${daysSinceCommit} days. Give your honest read on why it might have stopped.

WHAT WAS BEING BUILT:
${ideaTitle}

WHAT THE COMMUNITY ASKED FOR:
${larvaeConsensus || "No consensus available"}

LAST COMMIT MESSAGES (most recent first):
- ${commitList || "No commits found"}

README excerpt:
${readmeExcerpt ? readmeExcerpt.slice(0, 600) : "No README"}

Read the tone and content of those last commits. A final commit saying "fix typo in README" after silence reads differently than "WIP: refactoring auth". Make an educated guess.

Possible reasons: quietly finished and moved on, replaced by something newer, abandoned mid-build, blocked on external dependency, scope changed.

Respond ONLY with this JSON:
{
  "reason": "<1-2 sentences explaining why this probably stopped, based on the evidence>",
  "confidence": "<high|medium|low>"
}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const parsed = JSON.parse(text.trim());
    return {
      reason: parsed.reason || "No clear signal on why activity stopped.",
      confidence: parsed.confidence || "low",
    };
  } catch {
    return {
      reason: "Could not analyze inactivity signal.",
      confidence: "low",
    };
  }
}
