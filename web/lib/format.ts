export const formatPHP = (n: number) =>
  `${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PHP`;

// The server sends naive UTC timestamps (no Z); treat them as UTC.
export function parseTs(s: string): Date {
  return new Date(/Z$|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}

export const formatDateTime = (s: string) =>
  parseTs(s).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

export function timeAgo(s: string | null): string {
  if (!s) return "Never";
  const mins = Math.max(0, Math.round((Date.now() - parseTs(s).getTime()) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const tierLabel = (days: number) => (days === 30 ? "1 month" : `${days} ${days === 1 ? "day" : "days"}`);
