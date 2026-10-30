import { parseTs } from "./format";
import { Txn } from "./stats";

export type ConnState = "connected" | "cutoff" | "none";

export interface Connection {
  state: ConnState;
  expiry: number | null;
  // True when the operator cut the customer off before their plan ended.
  manual: boolean;
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
    return { state: "cutoff", expiry: end === null ? manualAt : Math.min(end, manualAt), manual: end === null || manualAt < end };
  }
  if (end === null) return { state: "none", expiry: null, manual: false };
  return { state: end > now ? "connected" : "cutoff", expiry: end, manual: false };
}

export interface CustomerStatus {
  id: string;
  status: string;
  updated_at: string;
}

export function connectionsByCustomer(txns: Txn[], customers: CustomerStatus[], now = Date.now()): Map<string, Connection> {
  const plans = new Map<string, { at: number; days: number }[]>();
  for (const t of txns) {
    const list = plans.get(t.customer_id) ?? [];
    list.push({ at: parseTs(t.timestamp).getTime(), days: t.duration_days });
    plans.set(t.customer_id, list);
  }
  return new Map(
    customers.map((c) => [c.id, connectionOf(plans.get(c.id) ?? [], now, c.status === "Disabled" ? parseTs(c.updated_at).getTime() : null)])
  );
}

// "in 3 days", "in 5 hr", "2 days ago".
function relative(ms: number, now: number): string {
  const mins = Math.round(Math.abs(ms - now) / 60_000);
  const text = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} hr` : `${Math.round(mins / 1440)} day${Math.round(mins / 1440) === 1 ? "" : "s"}`;
  return ms >= now ? `in ${text}` : `${text} ago`;
}

export interface CutoffInfo {
  day: string;
  clock: string;
  rel: string;
  manual: boolean;
}

// "today", "tomorrow", "in 3 days", "yesterday", "2 days ago", by calendar day.
function dayRelative(ms: number, now: number): string {
  const diff = Math.round((dayStart(ms) - dayStart(now)) / 86_400_000);
  if (diff === 0) return "today";
  if (Math.abs(diff) === 1) return diff > 0 ? "tomorrow" : "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

// When the customer is (or was) cut off; null if they never bought a plan and were never cut off.
// A plan runs through the end of its last day, so that day is shown with "end of day" as the time.
export function cutoffInfo(c: Connection | undefined, now = Date.now()): CutoffInfo | null {
  if (!c || c.expiry === null) return null;
  const when = c.manual ? c.expiry : dayStart(c.expiry, -1);
  const d = new Date(when);
  return {
    day: d.toLocaleDateString("en-PH", { dateStyle: "medium" }),
    clock: c.manual ? d.toLocaleTimeString("en-PH", { timeStyle: "short" }) : "End of day",
    rel: c.manual ? relative(when, now) : dayRelative(when, now),
    manual: c.manual,
  };
}
