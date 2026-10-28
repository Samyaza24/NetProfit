import { parseTs } from "./format";
import { Txn } from "./stats";

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

export function connectionsByCustomer(txns: Txn[], now = Date.now()): Map<string, Connection> {
  const plans = new Map<string, { at: number; days: number }[]>();
  for (const t of txns) {
    const list = plans.get(t.customer_id) ?? [];
    list.push({ at: parseTs(t.timestamp).getTime(), days: t.duration_days });
    plans.set(t.customer_id, list);
  }
  return new Map([...plans].map(([id, list]) => [id, connectionOf(list, now)]));
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
}

// When the customer is (or was) cut off; null if they never bought a plan.
export function cutoffInfo(c: Connection | undefined, now = Date.now()): CutoffInfo | null {
  if (!c || c.expiry === null) return null;
  const d = new Date(c.expiry);
  return {
    day: d.toLocaleDateString("en-PH", { dateStyle: "medium" }),
    clock: d.toLocaleTimeString("en-PH", { timeStyle: "short" }),
    rel: relative(c.expiry, now),
  };
}
