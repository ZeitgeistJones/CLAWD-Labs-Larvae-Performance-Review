import Link from "next/link";
import { ScoreRing } from "./components/ScoreRing";

export const dynamic = "force-dynamic";

interface Verdict {
  score: number | null;
  is_stalled: boolean;
  linked_repo: string | null;
  last_commit_days: number | null;
  larvae_consensus: string | null;
}

interface Idea {
  id: number;
  title: string;
  status: string;
  total_cv: number;
  aggregated_opinion: string | null;
  aggregated_opinion_short: string | null;
  verdict: Verdict | null;
}

interface Stats {
  total: string;
  shipped: string;
  stalled: string;
  building: string;
  avg_score: string | null;
  delivered: string;
  fell_short: string;
}

async function getData(): Promise<{ ideas: Idea[]; stats: Stats | null }> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const res = await fetch(`${baseUrl}/api/labs`, {
      cache: "no-store",
    });

    if (!res.ok) return { ideas: [], stats: null };
    return res.json();
  } catch {
    return { ideas: [], stats: null };
  }
}

function formatCV(cv: number): string {
  if (cv >= 1_000_000) return `${(cv / 1_000_000).toFixed(1)}M`;
  if (cv >= 1_000) return `${(cv / 1_000).toFixed(0)}K`;
  return String(cv);
}

export default async function Home() {
  const { ideas, stats } = await getData();

  const scored = ideas.filter(
    (i) => i.verdict?.score !== null && i.verdict?.score !== undefined && !i.verdict?.is_stalled
  );
  const stalled = ideas.filter((i) => i.verdict?.is_stalled);
  const repoFound = ideas.filter(
    (i) => i.verdict?.linked_repo && !i.verdict?.score && !i.verdict?.is_stalled
  );
  const noRepo = ideas.filter((i) => !i.verdict?.linked_repo);

  // sort scored by score descending
  scored.sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));

  // sort everything else by cv descending
  const byCV = (a: Idea, b: Idea) => (b.total_cv || 0) - (a.total_cv || 0);
  stalled.sort(byCV);
  repoFound.sort(byCV);
  noRepo.sort(byCV);

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-mark">🦞</div>
          CLAWD Labs
        </div>
        <span className="header-sub">Larvae Performance Review</span>
      </header>

      <main className="main">
        {stats && (
          <div className="stats-bar">
            <div className="stat-cell">
              <span className="stat-label">Total Tracked</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Scored</span>
              <span className="stat-value green">{scored.length}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Avg Score</span>
              <span className="stat-value clawd">
                {stats.avg_score ? `${stats.avg_score}` : "—"}
              </span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Gone Quiet</span>
              <span className="stat-value amber">{stalled.length}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">No Repo</span>
              <span className="stat-value">{noRepo.length}</span>
            </div>
          </div>
        )}

        {scored.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div className="section-header">
              <span className="section-title">Scored</span>
              <span className="section-count">{scored.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {scored.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <span className="badge badge-shipped">✓ Analyzed</span>
                      <span className="cv-tag"><span>{formatCV(idea.total_cv)}</span> CV staked</span>
                      {idea.verdict?.linked_repo && (
                        <span className="cv-tag">{idea.verdict.linked_repo}</span>
                      )}
                      {idea.verdict?.last_commit_days !== null && idea.verdict?.last_commit_days !== undefined && (
                        <span className="cv-tag">last commit {idea.verdict.last_commit_days}d ago</span>
                      )}
                    </div>
                    {idea.verdict?.larvae_consensus && (
                      <p className="idea-card-consensus">{idea.verdict.larvae_consensus}</p>
                    )}
                  </div>
                  <div className="idea-card-right">
                    <ScoreRing score={idea.verdict?.score ?? null} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {repoFound.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div className="section-header">
              <span className="section-title">Repo Found — Unscored</span>
              <span className="section-count">{repoFound.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {repoFound.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <span className="badge badge-building">◎ Active</span>
                      <span className="cv-tag"><span>{formatCV(idea.total_cv)}</span> CV staked</span>
                      {idea.verdict?.linked_repo && (
                        <span className="cv-tag">{idea.verdict.linked_repo}</span>
                      )}
                    </div>
                    {idea.verdict?.larvae_consensus && (
                      <p className="idea-card-consensus">{idea.verdict.larvae_consensus}</p>
                    )}
                  </div>
                  <div className="idea-card-right">
                    <ScoreRing score={null} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {stalled.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div className="section-header">
              <span className="section-title">Gone Quiet</span>
              <span className="section-count">{stalled.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {stalled.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <span className="badge badge-stalled">⚠ Gone Quiet</span>
                      <span className="cv-tag"><span>{formatCV(idea.total_cv)}</span> CV staked</span>
                      {idea.verdict?.last_commit_days !== null && idea.verdict?.last_commit_days !== undefined && (
                        <span className="cv-tag">{idea.verdict.last_commit_days}d since last commit</span>
                      )}
                    </div>
                    {idea.verdict?.larvae_consensus && (
                      <p className="idea-card-consensus">{idea.verdict.larvae_consensus}</p>
                    )}
                  </div>
                  <div className="idea-card-right">
                    <ScoreRing score={idea.verdict?.score ?? null} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {noRepo.length > 0 && (
          <section>
            <div className="section-header">
              <span className="section-title">No Repo Found</span>
              <span className="section-count">{noRepo.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {noRepo.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <span className="badge badge-pending">○ No repo</span>
                      <span className="cv-tag"><span>{formatCV(idea.total_cv)}</span> CV staked</span>
                    </div>
                  </div>
                  <div className="idea-card-right">
                    <ScoreRing score={null} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {ideas.length === 0 && (
          <div className="empty-state">
            <p>No ideas found. The larv.ai API may be unavailable.</p>
          </div>
        )}

        <p className="ledger-note">
          Data sourced from larv.ai public API · GitHub: clawdbotatg · Scores generated by Claude · CLAWD Labs: Larvae Performance Review
        </p>
      </main>
    </>
  );
}
