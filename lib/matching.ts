import { fetchClawdRepos, fetchRepoInfo, type RepoInfo } from "@/lib/data";

export function normalizeSlug(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[-_\s]+/g, "");
}

export function matchScore(ideaTitle: string, repoName: string): number {
  const ideaSlug = normalizeSlug(ideaTitle);
  const repoSlug = normalizeSlug(repoName);
  if (!ideaSlug || !repoSlug) return 0;
  if (ideaSlug === repoSlug) return 1;
  if (repoSlug.includes(ideaSlug) || ideaSlug.includes(repoSlug)) return 0.85;

  const ideaWords = ideaTitle.toLowerCase().split(/[-_\W]+/).filter(Boolean);
  const repoWords = repoName.toLowerCase().split(/[-_\W]+/).filter(Boolean);
  const overlap = ideaWords.filter((w) => repoWords.includes(w)).length;
  return overlap / Math.max(ideaWords.length, 1);
}

function titleCandidates(title: string): string[] {
  const trimmed = title.trim();
  const candidates = new Set<string>([trimmed]);
  const slug = normalizeSlug(trimmed);
  if (slug) candidates.add(slug);
  return [...candidates];
}

export async function resolveLinkedRepo(
  ideaTitle: string,
  repoOverride?: string | null
): Promise<{ repo: RepoInfo | null; repoName: string | null }> {
  if (repoOverride) {
    const repo = await fetchRepoInfo(repoOverride);
    return { repo, repoName: repoOverride };
  }

  for (const candidate of titleCandidates(ideaTitle)) {
    const direct = await fetchRepoInfo(candidate);
    if (direct) return { repo: direct, repoName: direct.name };
  }

  const repos = await fetchClawdRepos();
  let best: RepoInfo | null = null;
  let bestScore = 0;

  for (const repo of repos) {
    const nameScore = matchScore(ideaTitle, repo.name);
    const descMatch = ideaTitle
      .toLowerCase()
      .split(/[-_\W]+/)
      .some(
        (word) => word.length > 3 && repo.description?.toLowerCase().includes(word)
      );
    const total = nameScore + (descMatch ? 0.25 : 0);
    if (total > bestScore) {
      bestScore = total;
      best = repo;
    }
  }

  if (best && bestScore >= 0.5) {
    return { repo: best, repoName: best.name };
  }

  return { repo: null, repoName: null };
}
