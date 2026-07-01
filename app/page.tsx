import Link from "next/link";
import { ScoreRing } from "./components/ScoreRing";
import {
  getCommunityStatus,
  getReviewStatus,
  statusLabel,
  statusBadgeClass,
} from "@/lib/status";

export const dynamic = "force-dynamic";

interface Verdict {
  score: number | null;
  is_stalled: boolean;
  linked_repo: string | null;
  last_commit_days: number | null;
  larvae_consensus: string | null;
  manual_status: string | null;
}

interface Idea {
  id: number;
  title: string;
  status: string;
  archived: boolean;
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

function StatusBadges({ idea }: { idea: Idea }) {
  const community = getCommunityStatus(idea);
  const review = getReviewStatus(idea, idea.verdict);
  const mismatch = community !== review;

  return (
    <>
      <span className={`badge ${statusBadgeClass(review)}`}>
        Review: {statusLabel(review)}
      </span>
      {mismatch && (
        <span className="cv-tag" title="Status on larv.ai">
          Community: {statusLabel(community)}
        </span>
      )}
    </>
  );
}

export default async function Home() {
  const { ideas, stats } = await getData();

  const shipped = ideas.filter(
    (i) => getReviewStatus(i, i.verdict) === "shipped"
  );
  const building = ideas.filter(
    (i) => getReviewStatus(i, i.verdict) === "building"
  );
  const stalled = ideas.filter(
    (i) => getReviewStatus(i, i.verdict) === "stalled"
  );
  const active = ideas.filter(
    (i) =>
      getReviewStatus(i, i.verdict) === "pending" &&
      !i.archived
  );

  const byCV = (a: Idea, b: Idea) => (b.total_cv || 0) - (a.total_cv || 0);
  shipped.sort((a, b) => (b.verdict?.score || 0) - (a.verdict?.score || 0));
  building.sort(byCV);
  stalled.sort(byCV);
  active.sort(byCV);

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
              <span className="stat-value">{ideas.length}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Shipped</span>
              <span className="stat-value green">{shipped.length}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Avg Score</span>
              <span className="stat-value clawd">
                {stats.avg_score ? `${stats.avg_score}` : "—"}
              </span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Building</span>
              <span className="stat-value">{building.length}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Gone Quiet</span>
              <span className="stat-value amber">{stalled.length}</span>
            </div>
          </div>
        )}

        {shipped.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div className="section-header">
              <span className="section-title">Shipped</span>
              <span className="section-count">{shipped.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {shipped.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <StatusBadges idea={idea} />
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

        {building.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div className="section-header">
              <span className="section-title">In Progress</span>
              <span className="section-count">{building.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {building.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <StatusBadges idea={idea} />
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
                      <StatusBadges idea={idea} />
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

        {active.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div className="section-header">
              <span className="section-title">In Queue</span>
              <span className="section-count">{active.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {active.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <StatusBadges idea={idea} />
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
