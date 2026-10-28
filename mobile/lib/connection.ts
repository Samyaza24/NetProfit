import { formatDateTime } from "./format";

export type ConnState = "connected" | "cutoff" | "none";

export interface Connection {
  state: ConnState;
  expiry: number | null;
  // True when the operator cut the customer off before their plan ended.
  manual: boolean;
}

const DAY = 86_400_000;

// A plan starts when bought, or when the previous plan ends if that is still running.
// Unpaid plans still count: the customer was connected, they just owe money.
// manualAt is when the operator cut the customer off by hand; it only counts if it came after
// the latest purchase, so buying a new plan reconnects them without any extra step.
export function connectionOf(plans: { at: number; days: number }[], now = Date.now(), manualAt: number | null = null): Connection {
  let end: number | null = null;
  let lastBuy = 0;
  for (const p of [...plans].sort((a, b) => a.at - b.at)) {
    end = Math.max(end ?? 0, p.at) + p.days * DAY;
    lastBuy = Math.max(lastBuy, p.at);
  }
  if (manualAt !== null && manualAt >= lastBuy) {
    return { state: "cutoff", expiry: end === null ? manualAt : Math.min(end, manualAt), manual: end === null || manualAt < end };
  }
  if (end === null) return { state: "none", expiry: null, manual: false };
  return { state: end > now ? "connected" : "cutoff", expiry: end, manual: false };
}

// "in 3 days", "in 5 hr", "2 days ago", "just now".
function relative(ms: number, now: number): string {
  const mins = Math.round(Math.abs(ms - now) / 60_000);
  if (mins < 1) return "just now";
  const days = Math.round(mins / 1440);
  const text = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} hr` : `${days} day${days === 1 ? "" : "s"}`;
  return ms >= now ? `in ${text}` : `${text} ago`;
}

// "Cuts off Nov 28, 2026, 12:08 AM (in 30 days)", "Cut off Oct 20, 2026, 3:00 PM (9 days ago)".
export function cutoffText(c: Connection | undefined, now = Date.now()): string {
  if (!c || c.expiry === null) return "No plan bought yet";
  const verb = c.state === "connected" ? "Cuts off" : c.manual ? "Cut off by you" : "Cut off";
  return `${verb} ${formatDateTime(c.expiry)} (${relative(c.expiry, now)})`;
}
