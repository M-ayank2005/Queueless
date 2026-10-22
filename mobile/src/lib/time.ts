/**
 * Time formatting helpers matching Figma design specs
 */

export function timeAgo(input: string | Date | number): string {
  if (!input) return "";
  const date = typeof input === "object" ? input : new Date(input);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) {
    return "just now";
  }
  if (diffMin < 60) {
    return `${diffMin} mins ago`;
  }
  if (diffHours === 1) {
    return "1 hr ago";
  }
  if (diffHours < 24) {
    return `${diffHours} hrs ago`;
  }
  if (diffDays === 1) {
    return "1 Day ago";
  }
  if (diffDays < 30) {
    return `${diffDays} Days ago`;
  }

  // Short date format: "12 Oct"
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export interface DayGroup<T> {
  title: string;
  data: T[];
}

export function groupByDay<T extends { createdAt?: string | Date }>(items: T[]): DayGroup<T>[] {
  const groups: Record<string, T[]> = {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 3600 * 1000;

  for (const item of items) {
    if (!item.createdAt) continue;
    const itemDate = new Date(item.createdAt);
    const itemDayStart = new Date(
      itemDate.getFullYear(),
      itemDate.getMonth(),
      itemDate.getDate()
    ).getTime();

    const diffDays = Math.round((todayStart - itemDayStart) / dayMs);

    let label: string;
    if (diffDays <= 0) {
      label = "Today";
    } else if (diffDays === 1) {
      label = "Yesterday";
    } else if (diffDays < 30) {
      label = `${diffDays} days ago`;
    } else {
      label = itemDate.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(item);
  }

  return Object.keys(groups).map((title) => ({
    title,
    data: groups[title],
  }));
}
