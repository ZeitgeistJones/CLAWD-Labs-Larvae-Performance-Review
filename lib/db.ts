import { sql } from "@vercel/postgres";

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS verdicts (
      idea_id INTEGER PRIMARY KEY,
      idea_title TEXT NOT NULL,
      score INTEGER,
      primary_score INTEGER,
      secondary_score INTEGER,
      alignment_summary TEXT,
      quality_notes TEXT,
      stall_reason TEXT,
      stall_confidence TEXT,
      linked_repo TEXT,
      repo_url TEXT,
      last_commit_days INTEGER,
      is_stalled BOOLEAN DEFAULT FALSE,
      larvae_consensus TEXT,
      idea_status TEXT,
      total_cv BIGINT,
      scored_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function upsertVerdict(data: {
  idea_id: number;
  idea_title: string;
  score: number | null;
  primary_score: number | null;
  secondary_score: number | null;
  alignment_summary: string | null;
  quality_notes: string | null;
  stall_reason: string | null;
  stall_confidence: string | null;
  linked_repo: string | null;
  repo_url: string | null;
  last_commit_days: number | null;
  is_stalled: boolean;
  larvae_consensus: string | null;
  idea_status: string;
  total_cv: number;
}) {
  await sql`
    INSERT INTO verdicts (
      idea_id, idea_title, score, primary_score, secondary_score,
      alignment_summary, quality_notes, stall_reason, stall_confidence,
      linked_repo, repo_url, last_commit_days, is_stalled,
      larvae_consensus, idea_status, total_cv, scored_at, updated_at
    ) VALUES (
      ${data.idea_id}, ${data.idea_title}, ${data.score}, ${data.primary_score},
      ${data.secondary_score}, ${data.alignment_summary}, ${data.quality_notes},
      ${data.stall_reason}, ${data.stall_confidence}, ${data.linked_repo},
      ${data.repo_url}, ${data.last_commit_days}, ${data.is_stalled},
      ${data.larvae_consensus}, ${data.idea_status}, ${data.total_cv},
      NOW(), NOW()
    )
    ON CONFLICT (idea_id) DO UPDATE SET
      score = EXCLUDED.score,
      primary_score = EXCLUDED.primary_score,
      secondary_score = EXCLUDED.secondary_score,
      alignment_summary = EXCLUDED.alignment_summary,
      quality_notes = EXCLUDED.quality_notes,
      stall_reason = EXCLUDED.stall_reason,
      stall_confidence = EXCLUDED.stall_confidence,
      linked_repo = EXCLUDED.linked_repo,
      repo_url = EXCLUDED.repo_url,
      last_commit_days = EXCLUDED.last_commit_days,
      is_stalled = EXCLUDED.is_stalled,
      larvae_consensus = EXCLUDED.larvae_consensus,
      idea_status = EXCLUDED.idea_status,
      total_cv = EXCLUDED.total_cv,
      updated_at = NOW()
  `;
}

export async function getAllVerdicts() {
  const { rows } = await sql`
    SELECT * FROM verdicts ORDER BY updated_at DESC
  `;
  return rows;
}

export async function getVerdict(ideaId: number) {
  const { rows } = await sql`
    SELECT * FROM verdicts WHERE idea_id = ${ideaId}
  `;
  return rows[0] || null;
}

export async function getStats() {
  const { rows } = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE idea_status = 'shipped') as shipped,
      COUNT(*) FILTER (WHERE is_stalled = true) as stalled,
      COUNT(*) FILTER (WHERE idea_status = 'building' AND is_stalled = false) as building,
      ROUND(AVG(score) FILTER (WHERE score IS NOT NULL AND idea_status = 'shipped'), 1) as avg_score,
      COUNT(*) FILTER (WHERE score >= 65 AND idea_status = 'shipped') as delivered,
      COUNT(*) FILTER (WHERE score < 65 AND idea_status = 'shipped') as fell_short
    FROM verdicts
  `;
  return rows[0];
}
