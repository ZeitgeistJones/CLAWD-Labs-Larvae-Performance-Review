export async function fetchLabsIdeas() {
  const res = await fetch("https://larv.ai/api/labs", {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("Failed to fetch labs ideas");
  return res.json();
}

export async function fetchLabsIdea(id: number) {
  const res = await fetch(`https://larv.ai/api/labs/${id}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Failed to fetch labs idea ${id}`);
  return res.json();
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

export async function fetchClawdRepos(): Promise<RepoInfo[]> {
  const res = await fetch(
    "https://api.github.com/users/clawdbotatg/repos?per_page=100&sort=updated",
    { headers: githubHeaders(), next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error("Failed to fetch GitHub repos");
  return res.json();
}

export async function fetchRepoInfo(repoName: string): Promise<RepoInfo | null> {
  const res = await fetch(
    `https://api.github.com/repos/clawdbotatg/${encodeURIComponent(repoName)}`,
    { headers: githubHeaders(), next: { revalidate: 300 } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchRepoCommits(
  repoName: string,
  limit = 10
): Promise<{ commit: { message: string; committer: { date: string } } }[]> {
  const res = await fetch(
    `https://api.github.com/repos/clawdbotatg/${encodeURIComponent(repoName)}/commits?per_page=${limit}`,
    { headers: githubHeaders(), next: { revalidate: 300 } }
  );
  if (!res.ok) {
    console.warn(`GitHub commits fetch failed for ${repoName}: ${res.status}`);
    return [];
  }
  return res.json();
}

export async function fetchRepoReadme(repoName: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/clawdbotatg/${encodeURIComponent(repoName)}/readme`,
    { headers: githubHeaders(), next: { revalidate: 600 } }
  );
  if (!res.ok) {
    console.warn(`GitHub readme fetch failed for ${repoName}: ${res.status}`);
    return "";
  }

  const data = await res.json();
  if (!data.content) return "";

  return Buffer.from(data.content, "base64").toString("utf-8");
}

export function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export type BuildStatus = "shipped" | "building" | "stalled" | "rejected" | "pending";

export interface LabsIdea {
  id: number;
  title: string;
  description: string;
  status: BuildStatus;
  total_cv: number;
  aggregated_opinion: string | null;
  aggregated_opinion_short: string | null;
  created_at: string;
  larva_triggered: boolean;
}

export interface RepoInfo {
  name: string;
  description: string | null;
  html_url: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
}

export interface VerdictRecord {
  idea_id: number;
  score: number;
  alignment_summary: string;
  quality_notes: string;
  stall_reason: string | null;
  linked_repo: string | null;
  scored_at: string;
  last_commit_days: number | null;
  is_stalled: boolean;
}
