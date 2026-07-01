"use client";

import { useEffect, useState } from "react";
import { statusLabel } from "@/lib/status";

const STATUSES = ["idea", "building", "shipped", "stalled", "archived"];

interface VerdictFields {
  manual_status: string | null;
  score: number | null;
  linked_repo: string | null;
  linked_repo_override: string | null;
  evidence_commits: string | null;
  implementation_type: string | null;
}

interface Idea {
  id: number;
  title: string;
  status: string;
  total_cv: number;
  archived: boolean;
  verdict: VerdictFields | null;
}

function formatCV(cv: number): string {
  if (cv >= 1_000_000) return `${(cv / 1_000_000).toFixed(1)}M`;
  if (cv >= 1_000) return `${(cv / 1_000).toFixed(0)}K`;
  return String(cv);
}

function verdictFromResponse(
  data: { verdict?: Record<string, unknown> },
  fallback: VerdictFields | null
): VerdictFields {
  const v = data.verdict;
  return {
    manual_status: (v?.manual_status as string) ?? fallback?.manual_status ?? null,
    score: (v?.score as number) ?? fallback?.score ?? null,
    linked_repo: (v?.linked_repo as string) ?? fallback?.linked_repo ?? null,
    linked_repo_override:
      (v?.linked_repo_override as string) ?? fallback?.linked_repo_override ?? null,
    evidence_commits:
      (v?.evidence_commits as string) ?? fallback?.evidence_commits ?? null,
    implementation_type:
      (v?.implementation_type as string) ?? fallback?.implementation_type ?? null,
  };
}

export default function AdminPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [repoInputs, setRepoInputs] = useState<Record<number, string>>({});
  const [evidenceInputs, setEvidenceInputs] = useState<Record<number, string>>({});
  const [builderSummary, setBuilderSummary] = useState<string | null>(null);
  const [builderSummaryAt, setBuilderSummaryAt] = useState<string | null>(null);
  const [builderSummaryCount, setBuilderSummaryCount] = useState<number | null>(null);
  const [refreshingSummary, setRefreshingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/labs")
      .then((r) => r.json())
      .then((data) => {
        setIdeas(data.ideas || []);
        setBuilderSummary(data.builderSummary || null);
        setBuilderSummaryAt(data.builderSummaryAt || null);
        setBuilderSummaryCount(data.builderSummaryCount ?? null);
        const repos: Record<number, string> = {};
        const evidence: Record<number, string> = {};
        for (const idea of data.ideas || []) {
          repos[idea.id] =
            idea.verdict?.linked_repo_override || idea.verdict?.linked_repo || "";
          evidence[idea.id] = idea.verdict?.evidence_commits || "";
        }
        setRepoInputs(repos);
        setEvidenceInputs(evidence);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const refreshBuilderSummary = async () => {
    setRefreshingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshBuilderSummary: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSummaryError(data.error || "Failed to refresh summary");
        return;
      }
      setBuilderSummary(data.builderSummary?.summary || null);
      setBuilderSummaryAt(data.builderSummary?.updatedAt || null);
      setBuilderSummaryCount(data.builderSummary?.scoredCount ?? null);
    } catch {
      setSummaryError("Failed to refresh summary");
    } finally {
      setRefreshingSummary(false);
    }
  };

  const saveStatus = async (ideaId: number, manualStatus: string) => {
    setSaving(ideaId);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, manualStatus }),
      });
      const data = await res.json();
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === ideaId
            ? { ...i, verdict: verdictFromResponse(data, i.verdict) }
            : i
        )
      );
      setSaved(ideaId);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert("Failed to save status");
    } finally {
      setSaving(null);
    }
  };

  const saveRepo = async (ideaId: number) => {
    setSaving(ideaId);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, repoOverride: repoInputs[ideaId] || "" }),
      });
      const data = await res.json();
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === ideaId
            ? { ...i, verdict: verdictFromResponse(data, i.verdict) }
            : i
        )
      );
      setSaved(ideaId);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert("Failed to save repo");
    } finally {
      setSaving(null);
    }
  };

  const saveEvidence = async (ideaId: number) => {
    setSaving(ideaId);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          evidenceCommits: evidenceInputs[ideaId] || "",
        }),
      });
      const data = await res.json();
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === ideaId
            ? { ...i, verdict: verdictFromResponse(data, i.verdict) }
            : i
        )
      );
      setSaved(ideaId);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert("Failed to save evidence commits");
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      <header style={{ borderBottom: "1px solid #242424", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0a0a", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          <div style={{ width: 28, height: 28, background: "#cc2b2b", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🦞</div>
          Admin
        </div>
        <a href="/" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>← Back to dashboard</a>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Status & Repo Override</h1>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
            Set review status and link the GitHub repo. For labs work inside an existing repo,
            paste the commit SHA(s) or URL(s) that implemented the idea. Saving auto-rescores.
          </p>

          <div style={{ background: "#111", border: "1px solid #242424", borderRadius: 6, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: builderSummary ? 12 : 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Dashboard builder summary</div>
                <div style={{ fontSize: 11, color: "#555", fontFamily: "IBM Plex Mono, monospace" }}>
                  {builderSummaryAt
                    ? `Last updated ${new Date(builderSummaryAt).toLocaleDateString()} · ${builderSummaryCount ?? 0} builds`
                    : "Not generated yet · needs 3+ scored builds"}
                </div>
              </div>
              <button
                onClick={refreshBuilderSummary}
                disabled={refreshingSummary}
                style={{ background: "#333", border: "1px solid #444", color: "#e8e8e8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, padding: "8px 16px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.04em", flexShrink: 0 }}
              >
                {refreshingSummary ? "Generating..." : "Refresh summary"}
              </button>
            </div>
            {summaryError && (
              <p style={{ fontSize: 12, color: "#f59e0b", marginBottom: 12 }}>{summaryError}</p>
            )}
            {builderSummary && (
              <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6, margin: 0 }}>{builderSummary}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: "#555" }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#242424", border: "1px solid #242424", borderRadius: 6, overflow: "hidden" }}>
            {ideas.map((idea) => {
              const review = idea.verdict?.manual_status || "idea";
              return (
                <div key={idea.id} style={{ background: "#111", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      #{idea.id} — {idea.title}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {saved === idea.id && (
                        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#22c55e" }}>
                          {saving === idea.id ? "scoring..." : "saved ✓"}
                        </span>
                      )}
                      <select
                        value={review}
                        onChange={(e) => saveStatus(idea.id, e.target.value)}
                        disabled={saving === idea.id}
                        style={{ background: "#181818", border: "1px solid #333", color: "#e8e8e8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, padding: "6px 10px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#555" }}>
                      Community: {statusLabel(idea.status)}
                    </span>
                    {idea.verdict?.linked_repo && (
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#555" }}>
                        linked: {idea.verdict.linked_repo}
                      </span>
                    )}
                    {idea.verdict?.implementation_type === "nested" && (
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: "#888", background: "#181818", border: "1px solid #333", padding: "2px 6px", borderRadius: 3 }}>
                        nested
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#555", flexShrink: 0 }}>repo:</span>
                    <input
                      type="text"
                      placeholder="exact-repo-name (e.g. clawdviction)"
                      value={repoInputs[idea.id] || ""}
                      onChange={(e) => setRepoInputs((prev) => ({ ...prev, [idea.id]: e.target.value }))}
                      style={{ flex: 1, background: "#181818", border: "1px solid #333", color: "#e8e8e8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, padding: "6px 10px", borderRadius: 4, outline: "none" }}
                    />
                    <button
                      onClick={() => saveRepo(idea.id)}
                      disabled={saving === idea.id}
                      style={{ background: "#cc2b2b", border: "none", color: "white", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, padding: "6px 14px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.04em", flexShrink: 0 }}
                    >
                      Save
                    </button>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#555" }}>{formatCV(idea.total_cv)} CV</span>
                    {idea.verdict?.score !== null && idea.verdict?.score !== undefined && (
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#22c55e" }}>score: {idea.verdict.score}</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#555", flexShrink: 0 }}>evidence:</span>
                    <input
                      type="text"
                      placeholder="commit SHA or github.com/.../commit/..."
                      value={evidenceInputs[idea.id] || ""}
                      onChange={(e) => setEvidenceInputs((prev) => ({ ...prev, [idea.id]: e.target.value }))}
                      style={{ flex: 1, background: "#181818", border: "1px solid #333", color: "#e8e8e8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, padding: "6px 10px", borderRadius: 4, outline: "none" }}
                    />
                    <button
                      onClick={() => saveEvidence(idea.id)}
                      disabled={saving === idea.id}
                      style={{ background: "#333", border: "1px solid #444", color: "#e8e8e8", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, padding: "6px 14px", borderRadius: 4, cursor: "pointer", letterSpacing: "0.04em", flexShrink: 0 }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
