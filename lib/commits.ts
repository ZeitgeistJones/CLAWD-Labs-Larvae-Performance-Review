export interface CommitEvidence {
  sha: string;
  message: string;
  date: string;
  html_url: string;
  filesChanged: string[];
}

const COMMIT_URL_RE = /\/commit\/([0-9a-f]{7,40})/i;
const SHA_RE = /^[0-9a-f]{7,40}$/i;

export function parseEvidenceCommits(input: string): string[] {
  if (!input.trim()) return [];

  const shas = new Set<string>();
  for (const part of input.split(/[\s,]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const urlMatch = trimmed.match(COMMIT_URL_RE);
    if (urlMatch) {
      shas.add(urlMatch[1]);
      continue;
    }

    if (SHA_RE.test(trimmed)) {
      shas.add(trimmed);
    }
  }

  return Array.from(shas);
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

export async function fetchCommitEvidence(
  repoName: string,
  sha: string
): Promise<CommitEvidence | null> {
  const res = await fetch(
    `https://api.github.com/repos/clawdbotatg/${encodeURIComponent(repoName)}/commits/${encodeURIComponent(sha)}`,
    { headers: githubHeaders(), next: { revalidate: 300 } }
  );
  if (!res.ok) {
    console.warn(`GitHub commit fetch failed for ${repoName}@${sha}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const files = (data.files || [])
    .slice(0, 15)
    .map((f: { filename: string }) => f.filename as string);

  return {
    sha: data.sha || sha,
    message: data.commit?.message || "",
    date: data.commit?.committer?.date || data.commit?.author?.date || "",
    html_url: data.html_url || `https://github.com/clawdbotatg/${repoName}/commit/${sha}`,
    filesChanged: files,
  };
}

export async function fetchEvidenceCommits(
  repoName: string,
  input: string
): Promise<CommitEvidence[]> {
  const shas = parseEvidenceCommits(input);
  const results = await Promise.all(
    shas.map((sha) => fetchCommitEvidence(repoName, sha))
  );
  return results.filter((c): c is CommitEvidence => c !== null);
}

export function formatCommitEvidenceForPrompt(
  repoName: string,
  commits: CommitEvidence[]
): { commitMessages: string[]; contextNote: string } {
  const commitMessages = commits.map((c) => {
    const subject = c.message.split("\n")[0];
    const files =
      c.filesChanged.length > 0
        ? ` [files: ${c.filesChanged.slice(0, 8).join(", ")}${c.filesChanged.length > 8 ? ", ..." : ""}]`
        : "";
    return `${subject}${files}`;
  });

  const contextNote = `Nested implementation inside existing repo "${repoName}". Evaluate only the evidence commits below — not the full product scope.`;

  return { commitMessages, contextNote };
}
