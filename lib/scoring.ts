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
  readmeExcerpt: string,
  options?: { nested?: boolean; contextNote?: string }
): Promise<AlignmentResult> {
  const commitList = recentCommitMessages.slice(0, 5).join("\n- ");
  const consensusTrimmed = larvaeConsensus.slice(0, 1500);
  const nested = options?.nested ?? false;
  const readmeTrimmed = nested
    ? "Not used — nested implementation; see evidence commits only."
    : readmeExcerpt
      ? readmeExcerpt.slice(0, 600)
      : "No README found";

  const nestedNote = nested
    ? `\nIMPORTANT CONTEXT: ${options?.contextNote || "This labs idea was implemented inside an existing larger repo, not as its own project. Score ONLY whether the evidence commits deliver what the larvae asked for. Do not penalize for unrelated repo scope or missing standalone README."}\n`
    : "";

  const prompt = `You are scoring how well a shipped build matches what the CLAWD community's AI larva agents asked for.
${nestedNote}
WHAT THE LARVAE CONSENSUS SAID:
${consensusTrimmed}

THE ORIGINAL IDEA:
Title: ${ideaTitle}
Description: ${ideaDescription.slice(0, 500)}

WHAT ACTUALLY SHIPPED:
Repo description: ${nested ? "(parent repo — may describe the whole product, not just this labs idea)" : repoDescription || "No description provided"}
Evidence commit messages:
- ${commitList || "No commits found"}
README excerpt:
${readmeTrimmed}

Score this build on two dimensions:

PRIMARY (0-75 points): Did the thing the larvae wanted actually get built? Does what shipped match the spirit and specifics of what the community asked for?

SECONDARY (0-24 points): Does it work reasonably well, is it usable, does it look decent?

IMPORTANT: 0 and 100 are impossible. Min score is 5, max is 95. A solid delivery should score 65-78.

Respond ONLY with this JSON and nothing else:
{"primary_score":35,"secondary_score":15,"alignment_summary":"2-3 sentences here","quality_notes":"1-2 sentences here"}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response even if there's extra text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;

  try {
    const parsed = JSON.parse(jsonStr);
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
  const consensusTrimmed = larvaeConsensus.slice(0, 500);

  const prompt = `A build in the CLAWD ecosystem hasn't been updated in ${daysSinceCommit} days.

WHAT WAS BEING BUILT: ${ideaTitle}

WHAT THE COMMUNITY ASKED FOR: ${consensusTrimmed}

LAST COMMIT MESSAGES:
- ${commitList || "No commits found"}

README: ${readmeExcerpt ? readmeExcerpt.slice(0, 400) : "No README"}

Make an educated guess on why it stopped. Possible reasons: quietly finished, replaced by something newer, abandoned mid-build, blocked on external dependency, scope changed.

Respond ONLY with this JSON and nothing else:
{"reason":"1-2 sentences here","confidence":"low"}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;

  try {
    const parsed = JSON.parse(jsonStr);
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
