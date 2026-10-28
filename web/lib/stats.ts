import { parseTs } from "./format";

export interface Txn {
  id: string;
  customer_id: string;
  device_id: string | null;
  amount_received: number;
  duration_days: number;
  status: string;
  timestamp: string;
}

export interface Exp {
  id: string;
  device_id: string | null;
  description: string;
  amount: number;
  timestamp: string;
}

export interface Totals {
  received: number;
  unpaid: number;
  expenses: number;
  net: number;
}

export const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

// Same definitions as the phone: received counts Paid only, net is received minus expenses.
export function totals(txns: Txn[], exps: Exp[], since: Date | null): Totals {
  const after = (ts: string) => !since || parseTs(ts) >= since;
  let received = 0;
  let unpaid = 0;
  for (const t of txns) {
    if (!after(t.timestamp)) continue;
    if (t.status === "Paid") received += t.amount_received;
    else if (t.status === "Unpaid") unpaid += t.amount_received;
  }
  const expenses = exps.filter((e) => after(e.timestamp)).reduce((sum, e) => sum + e.amount, 0);
  return { received, unpaid, expenses, net: received - expenses };
}

export interface DayTotal {
  date: Date;
  amount: number;
}

// Paid amount per local day for the last `days` days, oldest first.
export function dailyReceived(txns: Txn[], days = 7): DayTotal[] {
  const start = startOfToday();
  start.setDate(start.getDate() - (days - 1));
  const out: DayTotal[] = Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date, amount: 0 };
  });
  for (const t of txns) {
    if (t.status !== "Paid") continue;
    const d = parseTs(t.timestamp);
    const idx = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime()) / 86_400_000);
    if (idx >= 0 && idx < days) out[idx].amount += t.amount_received;
  }
  return out;
}
