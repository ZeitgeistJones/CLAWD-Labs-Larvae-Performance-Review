import Anthropic from "@anthropic-ai/sdk";
import { getAllVerdicts, setBuilderSummary } from "@/lib/db";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MIN_SCORED_BUILDS = 3;

export interface BuilderSummaryResult {
  summary: string;
  scoredCount: number;
  updatedAt: string;
}

export async function generateBuilderSummary(): Promise<BuilderSummaryResult> {
  const verdicts = await getAllVerdicts();
  const scored = verdicts.filter(
    (v) =>
      v.score != null &&
      v.alignment_summary &&
      !v.alignment_summary.includes("Analysis failed")
  );

  if (scored.length < MIN_SCORED_BUILDS) {
    throw new Error(
      `Need at least ${MIN_SCORED_BUILDS} scored builds (have ${scored.length})`
    );
  }

  const avgScore =
    scored.reduce((sum, v) => sum + Number(v.score), 0) / scored.length;
  const delivered = scored.filter((v) => Number(v.score) >= 65).length;
  const fellShort = scored.length - delivered;

  const buildLines = scored
    .sort((a, b) => Number(b.score) - Number(a.score))
    .map((v) => {
      const summary = String(v.alignment_summary).slice(0, 200);
      const nested =
        v.implementation_type === "nested" ? " [nested in larger repo]" : "";
      return `- ${v.idea_title} (score ${v.score})${nested}: ${summary}`;
    })
    .join("\n");

  const prompt = `You are writing a brief performance overview of clawdbotatg as a labs builder for the CLAWD community.

AGGREGATE STATS:
- ${scored.length} builds scored
- Average score: ${avgScore.toFixed(1)} / 100
- Delivered well (65+): ${delivered}
- Fell short (<65): ${fellShort}

PER-BUILD SUMMARIES:
${buildLines}

Write exactly 4-5 sentences summarizing clawdbotatg's overall labs build performance. Identify overlapping themes across builds (what they consistently do well, where they consistently miss larvae consensus, patterns in scope or execution). Be specific and grounded in the data above. Plain language, no bullet points. Do not invent builds not listed.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  if (!text) {
    throw new Error("Empty summary from model");
  }

  await setBuilderSummary(text, scored.length);

  return {
    summary: text,
    scoredCount: scored.length,
    updatedAt: new Date().toISOString(),
  };
}
