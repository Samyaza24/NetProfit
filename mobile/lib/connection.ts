import { formatDate, formatDateTime } from "./format";

export type ConnState = "connected" | "cutoff" | "none";

export interface Connection {
  state: ConnState;
  expiry: number | null;
  // True when the operator cut the customer off before their plan ended.
  manual: boolean;
  // True when the plan's last day is today or past and the operator has not cut the customer off yet.
  due: boolean;
}

// Local midnight n calendar days after the day of `ms`.
const dayStart = (ms: number, n = 0) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

// Plans count whole calendar days and the day of purchase is day 1, so 7 days bought Oct 30 is connected
// through Nov 5. expiry is the midnight that ends the last connected day. A plan bought while the previous
// one is running starts the day after it ends. Unpaid plans still count: the customer was connected, they just owe money.
// manualAt is when the operator cut the customer off by hand; it only counts if it came after
// the latest purchase, so buying a new plan reconnects them without any extra step.
export function connectionOf(plans: { at: number; days: number }[], now = Date.now(), manualAt: number | null = null): Connection {
  let end: number | null = null;
  let lastBuy = 0;
  for (const p of [...plans].sort((a, b) => a.at - b.at)) {
    end = dayStart(Math.max(end ?? 0, dayStart(p.at)), p.days);
    lastBuy = Math.max(lastBuy, p.at);
  }
  if (manualAt !== null && manualAt >= lastBuy) {
    return { state: "cutoff", expiry: end === null ? manualAt : Math.min(end, manualAt), manual: end === null || manualAt < end, due: false };
  }
  if (end === null) return { state: "none", expiry: null, manual: false, due: false };
  return { state: end > now ? "connected" : "cutoff", expiry: end, manual: false, due: end <= dayStart(now, 1) };
}

// "in 3 days", "in 5 hr", "2 days ago", "just now".
function relative(ms: number, now: number): string {
  const mins = Math.round(Math.abs(ms - now) / 60_000);
  if (mins < 1) return "just now";
  const days = Math.round(mins / 1440);
  const text = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} hr` : `${days} day${days === 1 ? "" : "s"}`;
  return ms >= now ? `in ${text}` : `${text} ago`;
}

// Sort key for lists: soonest cutoff first, then the most recently cut off, then clients with no plan.
export const urgency = (c: Connection | undefined): number =>
  !c || c.expiry === null ? Infinity : c.state === "connected" ? c.expiry : 1e15 - c.expiry;

// "7 days left" (today counts), "1 day left", "yesterday", "2 days ago", by calendar day.
function dayRelative(ms: number, now: number): string {
  const diff = Math.round((dayStart(ms) - dayStart(now)) / 86_400_000);
  if (diff >= 0) return `${diff + 1} day${diff === 0 ? "" : "s"} left`;
  return diff === -1 ? "yesterday" : `${-diff} days ago`;
}

// "Cuts off Nov 5, 2026 (7 days left)", "Cut off Nov 5, 2026 (yesterday)", "Cut off by you Oct 20, 2026, 3:00 PM (9 days ago)".
export function cutoffText(c: Connection | undefined, now = Date.now()): string {
  if (!c || c.expiry === null) return "No plan bought yet";
  if (c.manual) return `Cut off by you ${formatDateTime(c.expiry)} (${relative(c.expiry, now)})`;
  const last = dayStart(c.expiry, -1);
  return `${c.state === "connected" ? "Cuts off" : "Cut off"} ${formatDate(last)} (${dayRelative(last, now)})`;
}
