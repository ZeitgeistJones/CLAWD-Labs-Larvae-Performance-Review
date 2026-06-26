"use client";

import { useEffect, useState } from "react";

const STATUSES = ["idea", "building", "shipped", "stalled", "archived"];

interface Idea {
  id: number;
  title: string;
  total_cv: number;
  archived: boolean;
  verdict: {
    manual_status: string | null;
    score: number | null;
    linked_repo: string | null;
    linked_repo_override: string | null;
  } | null;
}

function formatCV(cv: number): string {
  if (cv >= 1_000_000) return `${(cv / 1_000_000).toFixed(1)}M`;
  if (cv >= 1_000) return `${(cv / 1_000).toFixed(0)}K`;
  return String(cv);
}

export default function AdminPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [repoInputs, setRepoInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("/api/labs")
      .then((r) => r.json())
      .then((data) => {
        setIdeas(data.ideas || []);
        const inputs: Record<number, string> = {};
        for (const idea of data.ideas || []) {
          inputs[idea.id] = idea.verdict?.linked_repo_override || idea.verdict?.linked_repo || "";
        }
        setRepoInputs(inputs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveStatus = async (ideaId: number, manualStatus: string) => {
    setSaving(ideaId);
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, manualStatus }),
      });
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === ideaId
            ? { ...i, verdict: { ...i.verdict, manual_status: manualStatus, score: i.verdict?.score ?? null, linked_repo: i.verdict?.linked_repo ?? null, linked_repo_override: i.verdict?.linked_repo_override ?? null } }
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
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId, repoOverride: repoInputs[ideaId] || "" }),
      });
      setSaved(ideaId);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert("Failed to save repo");
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
          <p style={{ fontSize: 13, color: "#888" }}>Set the real status and manually link a GitHub repo for each idea. Repo name must match exactly what's in the clawdbotatg GitHub org.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: "#555" }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "#242424", border: "1px solid #242424", borderRadius: 6, overflow: "hidden" }}>
            {ideas.map((idea) => {
              const current = idea.verdict?.manual_status || "idea";
              return (
                <div key={idea.id} style={{ background: "#111", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      #{idea.id} — {idea.title}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {saved === idea.id && (
                        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#22c55e" }}>saved ✓</span>
                      )}
                      <select
                        value={current}
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

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#555", flexShrink: 0 }}>repo:</span>
                    <input
                      type="text"
                      placeholder="exact-repo-name (e.g. leftclaw-services)"
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
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#555" }}>{formatCV(idea.total_cv)} CV</span>
                      {idea.archived && <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, color: "#555", background: "#181818", border: "1px solid #242424", padding: "2px 6px", borderRadius: 3 }}>archived</span>}
                      {idea.verdict?.score !== null && idea.verdict?.score !== undefined && (
                        <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#22c55e" }}>score: {idea.verdict.score}</span>
                      )}
                    </div>
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
