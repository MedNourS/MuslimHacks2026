export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return diffMin + (diffMin === 1 ? " minute ago" : " minutes ago");
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return diffHour + (diffHour === 1 ? " hour ago" : " hours ago");
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return diffDay + (diffDay === 1 ? " day ago" : " days ago");

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: diffDay > 365 ? "numeric" : undefined });
}

export function formatVisitTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isSameDay) return "Today, " + time;
  if (isTomorrow) return "Tomorrow, " + time;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + time;
}
