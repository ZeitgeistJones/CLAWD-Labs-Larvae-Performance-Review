export type ReviewStatus =
  | "shipped"
  | "building"
  | "stalled"
  | "pending"
  | "archived"
  | "rejected";

export interface StatusVerdict {
  manual_status?: string | null;
  is_stalled?: boolean;
  linked_repo?: string | null;
}

export interface StatusIdea {
  status?: string;
  archived?: boolean;
}

export function getCommunityStatus(idea: StatusIdea): string {
  if (idea.archived) return "archived";
  return idea.status || "pending";
}

export function getReviewStatus(
  idea: StatusIdea,
  verdict: StatusVerdict | null | undefined
): ReviewStatus {
  if (verdict?.manual_status) return verdict.manual_status as ReviewStatus;
  if (idea.archived) return "archived";
  if (verdict?.is_stalled) return "stalled";
  if (verdict?.linked_repo) return "building";
  return "pending";
}

export function statusLabel(status: string): string {
  switch (status) {
    case "shipped":
      return "Shipped";
    case "building":
      return "Building";
    case "stalled":
      return "Gone quiet";
    case "archived":
      return "Archived";
    case "rejected":
      return "Rejected";
    default:
      return "Pending";
  }
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "shipped":
      return "badge-shipped";
    case "building":
      return "badge-building";
    case "stalled":
      return "badge-stalled";
    case "archived":
      return "badge-pending";
    default:
      return "badge-pending";
  }
}
