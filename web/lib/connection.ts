import { parseTs } from "./format";
import { Txn } from "./stats";

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

// When the customer is (or was) cut off; null if they never bought a plan and were never cut off.
export function cutoffInfo(c: Connection | undefined, now = Date.now()): CutoffInfo | null {
  if (!c || c.expiry === null) return null;
  const d = new Date(c.expiry);
  return {
    day: d.toLocaleDateString("en-PH", { dateStyle: "medium" }),
    clock: d.toLocaleTimeString("en-PH", { timeStyle: "short" }),
    rel: relative(c.expiry, now),
    manual: c.manual,
  };
}
