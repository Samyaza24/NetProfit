export type ConnState = "connected" | "cutoff" | "none";

export interface Connection {
  state: ConnState;
  expiry: number | null;
}

const DAY = 86_400_000;

// A plan starts when bought, or when the previous plan ends if that is still running.
// Unpaid plans still count: the customer was connected, they just owe money.
export function connectionOf(plans: { at: number; days: number }[], now = Date.now()): Connection {
  if (plans.length === 0) return { state: "none", expiry: null };
  let end = 0;
  for (const p of [...plans].sort((a, b) => a.at - b.at)) end = Math.max(end, p.at) + p.days * DAY;
  return { state: end > now ? "connected" : "cutoff", expiry: end };
}

// "in 3 days", "in 5 hr", "2 days ago".
function relative(ms: number, now: number): string {
  const mins = Math.round(Math.abs(ms - now) / 60_000);
  const days = Math.round(mins / 1440);
  const text = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} hr` : `${days} day${days === 1 ? "" : "s"}`;
  return ms >= now ? `in ${text}` : `${text} ago`;
}

export const whenText = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

// "Cuts off Nov 28, 2026, 12:08 AM (in 30 days)" or "Cut off Oct 20, 2026, 3:00 PM (9 days ago)".
export function cutoffText(c: Connection | undefined, now = Date.now()): string {
  if (!c || c.expiry === null) return "No plan bought yet";
  return `${c.state === "connected" ? "Cuts off" : "Cut off"} ${whenText(c.expiry)} (${relative(c.expiry, now)})`;
}
