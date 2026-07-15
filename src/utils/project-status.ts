export type ProjectRole = "owner" | "maintainer" | "contributor" | "client-work";

export const PROJECT_ROLES: ProjectRole[] = [
  "owner",
  "maintainer",
  "contributor",
  "client-work",
];

export type ActivityLevel = "active" | "recent" | "dormant" | "archived";

export interface ProjectRepoMetaInput {
  pushedAt: string;
  archived?: boolean;
  lastCommitMessage?: string;
}

export interface ProjectStatusContext {
  activityLevel: ActivityLevel | null;
  activityLabel: string | null;
  relativeAt: string | undefined;
  commitUrl: string | undefined;
}

const DAY_MS = 1000 * 60 * 60 * 24;

export function getActivityLevel(
  date: Date,
  archived = false
): ActivityLevel {
  if (archived) return "archived";

  const days = (Date.now() - date.getTime()) / DAY_MS;
  if (days < 14) return "active";
  if (days < 90) return "recent";
  return "dormant";
}

export function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}

export function formatShortMonth(date: Date): string {
  return date
    .toLocaleDateString("en-US", { month: "short", year: "numeric" })
    .toLowerCase();
}

export function getCommitHistoryUrl(github: string): string {
  return `${github.replace(/\/$/, "")}/commits`;
}

export function formatActivityLabel(
  level: ActivityLevel,
  pushedAt?: Date,
  lastTouched?: Date
): string {
  if (level === "archived") return "archived";
  if (pushedAt) return `updated ${formatRelativeTime(pushedAt)}`;
  if (lastTouched) return `updated ${formatShortMonth(lastTouched)}`;
  return "";
}

export function getActivityTimestamp(
  pubDate: Date,
  lastTouched?: Date,
  repoMeta?: ProjectRepoMetaInput
): number {
  if (repoMeta?.pushedAt) return new Date(repoMeta.pushedAt).valueOf();
  if (lastTouched) return lastTouched.valueOf();
  return pubDate.valueOf();
}

export function getProjectStatusContext({
  lastTouched,
  github,
  repoMeta,
}: {
  lastTouched?: Date;
  github?: string;
  repoMeta?: ProjectRepoMetaInput;
}): ProjectStatusContext {
  const pushedAt = repoMeta ? new Date(repoMeta.pushedAt) : undefined;
  const activityDate = pushedAt ?? lastTouched;
  const activityLevel = activityDate
    ? getActivityLevel(activityDate, repoMeta?.archived)
    : null;
  const activityLabel = activityLevel
    ? formatActivityLabel(activityLevel, pushedAt, lastTouched)
    : null;
  const commitUrl =
    github && repoMeta?.lastCommitMessage
      ? getCommitHistoryUrl(github)
      : undefined;

  return {
    activityLevel,
    activityLabel,
    relativeAt: pushedAt?.toISOString(),
    commitUrl,
  };
}
