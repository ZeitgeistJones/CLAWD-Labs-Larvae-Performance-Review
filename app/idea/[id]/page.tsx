"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScoreRing } from "../../components/ScoreRing";

interface Verdict {
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
  linked_repo_override: string | null;
  repo_url: string | null;
  last_commit_days: number | null;
  is_stalled: boolean;
  larvae_consensus: string | null;
  idea_status: string;
  manual_status: string | null;
  total_cv: number;
  updated_at: string;
}

function scoreClass(score: number) {
  if (score >= 65) return "high";
  if (score >= 45) return "mid";
  return "low";
}

function formatCV(cv: number): string {
  if (cv >= 1_000_000) return `${(cv / 1_000_000).toFixed(1)}M`;
  if (cv >= 1_000) return `${(cv / 1_000).toFixed(0)}K`;
  return String(cv);
}

export default function IdeaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [ideaId, setIdeaId] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [ideaData, setIdeaData] = useState<{
    title: string;
    description: string;
    status: string;
    total_cv: number;
    aggregated_opinion: string | null;
    aggregated_opinion_short: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setIdeaId(Number(p.id)));
  }, [params]);

  useEffect(() => {
    if (!ideaId) return;

    fetch(`https://larv.ai/api/labs/${ideaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.idea) setIdeaData(data.idea);
      })
      .catch(() => {});

    fetch(`/api/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.verdict) setVerdict(data.verdict);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ideaId]);

  const runScore = async () => {
    if (!ideaId) return;
    setScoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, forceRescore: true }),
      });
      const data = await res.json();
      if (data.verdict) setVerdict(data.verdict);
      else setError(data.reason || "Nothing to score yet.");
    } catch {
      setError("Failed to run analysis.");
    } finally {
      setScoring(false);
    }
  };

  const title = verdict?.idea_title || ideaData?.title || `Idea #${ideaId}`;
  const status = verdict?.manual_status || verdict?.idea_status || ideaData?.status || "pending";
  const consensus =
    verdict?.larvae_consensus ||
    ideaData?.aggregated_opinion_short ||
    ideaData?.aggregated_opinion;
  const totalCV = verdict?.total_cv || ideaData?.total_cv || 0;
  const repoName = verdict?.linked_repo_override || verdict?.linked_repo;

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
        <Link href="/" className="back-link">
          ← All builds
        </Link>

        <div className="detail-header">
          <h1 className="detail-title">{title}</h1>
          <div className="detail-meta">
            <span className={`badge badge-${verdict?.is_stalled ? "stalled" : status}`}>
              {verdict?.is_stalled ? "⚠ Stalled" : status === "shipped" ? "✓ Shipped" : status === "building" ? "◎ Building" : status === "stalled" ? "⚠ Stalled" : status === "archived" ? "✕ Archived" : "○ Pending"}
            </span>
            <span className="cv-tag">
              <span style={{ color: "var(--clawd)" }}>{formatCV(totalCV)}</span> CV staked by community
            </span>
            {repoName && (
              
                href={verdict?.repo_url || `https://github.com/clawdbotatg/${repoName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="repo-link"
              >
                ↗ {repoName}
              </a>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Pulling data...</div>
        ) : (
          <div className="detail-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {verdict?.is_stalled && verdict.stall_reason && (
                <div className="stall-box">
                  <span className="stall-icon">⚠</span>
                  <div className="stall-content">
                    <div className="stall-title">
                      Gone quiet · {verdict.last_commit_days}d since last commit
                      {verdict.stall_confidence && ` · ${verdict.stall_confidence} confidence`}
                    </div>
                    <p className="stall-text">{verdict.stall_reason}</p>
                  </div>
                </div>
              )}

              {consensus && (
                <div className="card">
                  <div className="card-header">
                    What the larvae asked for
                    <span style={{ color: "var(--clawd)", fontSize: 10 }}>larv.ai consensus</span>
                  </div>
                  <div className="card-body">
                    <p>{consensus}</p>
                  </div>
                </div>
              )}

              {ideaData?.description && (
                <div className="card">
                  <div className="card-header">Original idea</div>
                  <div className="card-body">
                    <p>{ideaData.description}</p>
                  </div>
                </div>
              )}

              {verdict?.alignment_summary && (
                <div className="card">
                  <div className="card-header">Alignment analysis</div>
                  <div className="card-body">
                    <p style={{ marginBottom: 12 }}>{verdict.alignment_summary}</p>
                    {verdict.quality_notes && (
                      <p style={{ borderTop: "1px solid var(--border)", paddingTop: 12, color: "var(--text-muted)" }}>
                        {verdict.quality_notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!verdict?.score && (
                <div className="score-cta">
                  <p className="score-cta-text">
                    {status === "shipped"
                      ? "This build is marked shipped but hasn't been scored yet."
                      : "No analysis yet for this build."}
                  </p>
                  <button className="score-btn" onClick={runScore} disabled={scoring}>
                    {scoring ? "Analyzing..." : "Analyze now"}
                  </button>
                  {error && (
                    <p style={{ fontSize: 12, color: "var(--amber)", marginTop: 4 }}>{error}</p>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="card">
                <div className="card-header">Alignment Score</div>
                <div className="card-body">
                  {verdict?.score !== null && verdict?.score !== undefined ? (
                    <>
                      <div className="score-total">
                        <ScoreRing score={verdict.score} size={80} />
                        <div style={{ marginLeft: 12 }}>
                          <div className={`score-total-number ${scoreClass(verdict.score)}`} style={{ fontSize: 36 }}>
                            {verdict.score}
                          </div>
                          <div className="score-total-label">out of 100</div>
                        </div>
                      </div>

                      <div className="score-breakdown">
                        <div className="score-row">
                          <span className="score-row-label">Built what was asked</span>
                          <div className="score-bar-track">
                            <div className="score-bar-fill primary" style={{ width: `${((verdict.primary_score || 0) / 75) * 100}%` }} />
                          </div>
                          <span className="score-row-value">{verdict.primary_score ?? "—"}/75</span>
                        </div>
                        <div className="score-row">
                          <span className="score-row-label">Works & looks decent</span>
                          <div className="score-bar-track">
                            <div className="score-bar-fill secondary" style={{ width: `${((verdict.secondary_score || 0) / 24) * 100}%` }} />
                          </div>
                          <span className="score-row-value">{verdict.secondary_score ?? "—"}/24</span>
                        </div>
                      </div>

                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace" }}>
                          Scored by Claude
                        </span>
                        <button onClick={runScore} disabled={scoring} style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 10, fontFamily: "IBM Plex Mono, monospace", padding: "4px 10px", borderRadius: 3, cursor: "pointer", letterSpacing: "0.04em" }}>
                          {scoring ? "..." : "Rescore"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>
                      Score pending
                    </div>
                  )}
                </div>
              </div>

              {verdict?.last_commit_days !== null && verdict?.last_commit_days !== undefined && (
                <div className="card">
                  <div className="card-header">Repo activity</div>
                  <div className="card-body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Last commit</span>
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: verdict.last_commit_days > 30 ? "var(--amber)" : "var(--text-primary)" }}>
                        {verdict.last_commit_days}d ago
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.03em" }}>
                Analysis sourced from larv.ai public API and GitHub. Scoring is automated — not editorial.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
