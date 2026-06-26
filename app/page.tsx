import Link from "next/link";
import { ScoreRing } from "./components/ScoreRing";

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
      next: { revalidate: 120 },
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

function StatusBadge({ status, isStalled }: { status: string; isStalled: boolean }) {
  if (isStalled) return <span className="badge badge-stalled">⚠ Stalled</span>;
  const map: Record<string, string> = {
    shipped: "badge-shipped",
    building: "badge-building",
    pending: "badge-pending",
    rejected: "badge-rejected",
  };
  const labels: Record<string, string> = {
    shipped: "✓ Shipped",
    building: "◎ Building",
    pending: "○ Pending",
    rejected: "✕ Rejected",
  };
  return (
    <span className={`badge ${map[status] || "badge-pending"}`}>
      {labels[status] || status}
    </span>
  );
}

export default async function Home() {
  const { ideas, stats } = await getData();

  const shipped = ideas.filter((i) => i.status === "shipped");
  const active = ideas.filter(
    (i) => i.status === "building" && !i.verdict?.is_stalled
  );
  const stalled = ideas.filter(
    (i) =>
      i.verdict?.is_stalled ||
      (i.status === "building" &&
        i.verdict?.last_commit_days !== null &&
        (i.verdict?.last_commit_days || 0) > 30)
  );
  const pending = ideas.filter(
    (i) => i.status === "pending" || i.status === "rejected"
  );

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
              <span className="stat-label">Shipped</span>
              <span className="stat-value green">{stats.shipped}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Avg Score</span>
              <span className="stat-value clawd">
                {stats.avg_score ? `${stats.avg_score}` : "—"}
              </span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Delivered</span>
              <span className="stat-value green">{stats.delivered}</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Fell Short</span>
              <span className="stat-value amber">{stats.fell_short}</span>
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
                      <StatusBadge status={idea.status} isStalled={idea.verdict?.is_stalled || false} />
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
              <span className="section-title">In Progress</span>
              <span className="section-count">{active.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {active.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <StatusBadge status={idea.status} isStalled={false} />
                      <span className="cv-tag"><span>{formatCV(idea.total_cv)}</span> CV staked</span>
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
                      <span className="badge badge-stalled">⚠ Stalled</span>
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
                    <ScoreRing score={null} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {pending.length > 0 && (
          <section>
            <div className="section-header">
              <span className="section-title">Other</span>
              <span className="section-count">{pending.length}</span>
              <div className="section-divider" />
            </div>
            <div className="ideas-list">
              {pending.map((idea) => (
                <Link key={idea.id} href={`/idea/${idea.id}`} className="idea-card">
                  <div className="idea-card-left">
                    <span className="idea-card-title">{idea.title}</span>
                    <div className="idea-card-meta">
                      <StatusBadge status={idea.status} isStalled={false} />
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
