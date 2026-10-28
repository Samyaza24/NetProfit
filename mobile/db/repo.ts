import { Connection, connectionOf } from "../lib/connection";
import { getDb } from "./schema";
import { newUuid } from "../lib/uuid";

export interface Customer {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  synced: number;
  rev: number;
}

export interface Transaction {
  id: string;
  customer_id: string;
  device_id: string | null;
  amount_received: number;
  duration_days: number;
  status: "Paid" | "Unpaid";
  timestamp: string;
  synced: number;
  rev: number;
}

export interface Expense {
  id: string;
  device_id: string | null;
  description: string;
  amount: number;
  timestamp: string;
  synced: number;
}

export async function findCustomerByName(name: string): Promise<Customer | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Customer>(
    "SELECT * FROM customers WHERE name = ? COLLATE NOCASE",
    name
  );
  return row ?? null;
}

export async function searchCustomers(prefix: string, limit = 5): Promise<Customer[]> {
  const db = await getDb();
  return db.getAllAsync<Customer>(
    "SELECT * FROM customers WHERE name LIKE ? COLLATE NOCASE ORDER BY name COLLATE NOCASE LIMIT ?",
    `%${prefix.replace(/[%_]/g, "")}%`,
    limit
  );
}

// True when the same customer already got the same tier within the last few minutes.
export async function hasRecentTransaction(customerId: string, days: number, minutes = 2): Promise<boolean> {
  const db = await getDb();
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const row = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM transactions WHERE customer_id = ? AND duration_days = ? AND timestamp >= ? LIMIT 1",
    customerId,
    days,
    since
  );
  return row !== null;
}

export async function listRecentDescriptions(limit = 5): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ description: string }>(
    "SELECT description FROM expenses GROUP BY description ORDER BY MAX(timestamp) DESC LIMIT ?",
    limit
  );
  return rows.map((r) => r.description);
}

export async function createLocalCustomer(name: string): Promise<Customer> {
  const db = await getDb();
  const customer: Customer = {
    id: newUuid(),
    name,
    status: "Active",
    updated_at: new Date().toISOString(),
    synced: 0,
    rev: 0,
  };
  await db.runAsync(
    "INSERT INTO customers (id, name, status, updated_at, synced) VALUES (?, ?, ?, ?, 0)",
    customer.id,
    customer.name,
    customer.status,
    customer.updated_at
  );
  return customer;
}

export async function createTransaction(
  customerId: string,
  amountReceived: number,
  durationDays: number,
  status: "Paid" | "Unpaid"
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO transactions
      (id, customer_id, device_id, amount_received, duration_days, status, timestamp, synced)
     VALUES (?, ?, NULL, ?, ?, ?, ?, 0)`,
    newUuid(),
    customerId,
    amountReceived,
    durationDays,
    status,
    new Date().toISOString()
  );
}

export async function createExpense(description: string, amount: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO expenses (id, device_id, description, amount, timestamp, synced)
     VALUES (?, NULL, ?, ?, ?, 0)`,
    newUuid(),
    description,
    amount,
    new Date().toISOString()
  );
}

export async function getUnsyncedCustomers(): Promise<Customer[]> {
  const db = await getDb();
  return db.getAllAsync<Customer>("SELECT * FROM customers WHERE synced = 0");
}

export async function getUnsyncedTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>("SELECT * FROM transactions WHERE synced = 0");
}

export async function getUnsyncedExpenses(): Promise<Expense[]> {
  const db = await getDb();
  return db.getAllAsync<Expense>("SELECT * FROM expenses WHERE synced = 0");
}

export async function countUnsynced(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM customers WHERE synced = 0)
          + (SELECT COUNT(*) FROM transactions WHERE synced = 0)
          + (SELECT COUNT(*) FROM expenses WHERE synced = 0) AS n`
  );
  return row?.n ?? 0;
}

// Points local rows at the server's customer when it already had that name, then drops our duplicate.
// Returns true when the target customer is not on this phone yet (a full pull is then needed).
export async function applyCustomerRemap(remap: Record<string, string>): Promise<boolean> {
  const db = await getDb();
  let missing = false;
  for (const [oldId, newId] of Object.entries(remap)) {
    await db.runAsync("UPDATE transactions SET customer_id = ? WHERE customer_id = ?", newId, oldId);
    await db.runAsync("DELETE FROM customers WHERE id = ?", oldId);
    const have = await db.getFirstAsync<{ id: string }>("SELECT id FROM customers WHERE id = ?", newId);
    if (!have) missing = true;
  }
  return missing;
}

// Clears the pending flag only for rows unchanged since they were read (same rev), so an edit made
// while a sync was running stays pending and goes out on the next sync.
export async function markSynced(
  table: "customers" | "transactions",
  rows: { id: string; rev: number }[]
): Promise<void> {
  const db = await getDb();
  for (const r of rows) await db.runAsync(`UPDATE ${table} SET synced = 1 WHERE id = ? AND rev = ?`, r.id, r.rev);
}

// Expenses never change after they are written, so there is nothing to race with.
export async function markExpensesSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.runAsync(`UPDATE expenses SET synced = 1 WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids);
}

export async function upsertCustomer(customer: {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Customer>(
    "SELECT * FROM customers WHERE id = ?",
    customer.id
  );
  if (existing && existing.updated_at >= customer.updated_at) return;
  await db.runAsync(
    `INSERT INTO customers (id, name, status, updated_at, synced) VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, status = excluded.status,
       updated_at = excluded.updated_at, synced = 1`,
    customer.id,
    customer.name,
    customer.status,
    customer.updated_at
  );
}

export async function upsertTransaction(t: {
  id: string;
  customer_id: string;
  device_id: string | null;
  amount_received: number;
  duration_days: number;
  status: string;
  timestamp: string;
}): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM transactions WHERE id = ?",
    t.id
  );
  if (existing) {
    // Rows are immutable except Unpaid to Paid, which the server allows in one direction only.
    if (t.status === "Paid") {
      await db.runAsync("UPDATE transactions SET status = 'Paid', synced = 1 WHERE id = ? AND status = 'Unpaid'", t.id);
    }
    return;
  }
  await db.runAsync(
    `INSERT INTO transactions
      (id, customer_id, device_id, amount_received, duration_days, status, timestamp, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    t.id,
    t.customer_id,
    t.device_id,
    t.amount_received,
    t.duration_days,
    t.status,
    t.timestamp
  );
}

export async function upsertExpense(e: {
  id: string;
  device_id: string | null;
  description: string;
  amount: number;
  timestamp: string;
}): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM expenses WHERE id = ?",
    e.id
  );
  if (existing) return;
  await db.runAsync(
    `INSERT INTO expenses (id, device_id, description, amount, timestamp, synced)
     VALUES (?, ?, ?, ?, ?, 1)`,
    e.id,
    e.device_id,
    e.description,
    e.amount,
    e.timestamp
  );
}

export type TransactionWithName = Transaction & { customer_name: string | null };

export async function listRecentTransactions(limit = 50): Promise<TransactionWithName[]> {
  const db = await getDb();
  return db.getAllAsync<TransactionWithName>(
    `SELECT t.*, c.name AS customer_name
     FROM transactions t LEFT JOIN customers c ON c.id = t.customer_id
     ORDER BY t.timestamp DESC LIMIT ?`,
    limit
  );
}

export interface CustomerSummary {
  id: string;
  name: string;
  total_visits: number;
  lifetime_value: number;
  outstanding_debt: number;
}

// Same definitions as the backend dashboard: value is Paid sum, debt is Unpaid sum.
export async function listCustomerSummaries(): Promise<CustomerSummary[]> {
  const db = await getDb();
  return db.getAllAsync<CustomerSummary>(
    `SELECT c.id, c.name,
            COUNT(t.id) AS total_visits,
            COALESCE(SUM(CASE WHEN t.status = 'Paid' THEN t.amount_received END), 0) AS lifetime_value,
            COALESCE(SUM(CASE WHEN t.status = 'Unpaid' THEN t.amount_received END), 0) AS outstanding_debt
     FROM customers c LEFT JOIN transactions t ON t.customer_id = c.id
     GROUP BY c.id, c.name
     ORDER BY c.name COLLATE NOCASE`
  );
}

// Marks an unpaid transaction as paid and queues it for the next sync.
export async function markTransactionPaid(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE transactions SET status = 'Paid', synced = 0, rev = rev + 1 WHERE id = ? AND status = 'Unpaid'", id);
}

// Connection state (connected / cut off) per customer, worked out from their purchased plans.
export async function listConnections(): Promise<Record<string, Connection>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ customer_id: string; timestamp: string; duration_days: number }>(
    "SELECT customer_id, timestamp, duration_days FROM transactions"
  );
  const customers = await db.getAllAsync<{ id: string; status: string; updated_at: string }>(
    "SELECT id, status, updated_at FROM customers"
  );
  const plans: Record<string, { at: number; days: number }[]> = {};
  for (const r of rows) (plans[r.customer_id] ??= []).push({ at: parseTs(r.timestamp).getTime(), days: r.duration_days });
  return Object.fromEntries(
    customers.map((c) => [c.id, connectionOf(plans[c.id] ?? [], undefined, c.status === "Disabled" ? parseTs(c.updated_at).getTime() : null)])
  );
}

// Cuts a customer off by hand ("Disabled") or hands control back to their plan ("Active"); syncs like any edit.
export async function setCustomerStatus(id: string, status: "Active" | "Disabled"): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE customers SET status = ?, updated_at = ?, synced = 0, rev = rev + 1 WHERE id = ?", status, new Date().toISOString(), id);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const db = await getDb();
  return (await db.getFirstAsync<Customer>("SELECT * FROM customers WHERE id = ?", id)) ?? null;
}

export async function listCustomerTransactions(customerId: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.getAllAsync<Transaction>(
    "SELECT * FROM transactions WHERE customer_id = ? ORDER BY timestamp DESC",
    customerId
  );
}

// Server-pulled timestamps are naive UTC (no Z); treat them as UTC like the phone's own.
export function parseTs(s: string): Date {
  return new Date(/Z$|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
}

export interface DayTotal {
  date: Date;
  amount: number;
}

// Paid amount per local day for the last `days` days, oldest first.
export async function getDailyReceived(days = 7): Promise<DayTotal[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const db = await getDb();
  const rows = await db.getAllAsync<{ timestamp: string; amount_received: number }>(
    "SELECT timestamp, amount_received FROM transactions WHERE status = 'Paid' AND timestamp >= ?",
    new Date(start.getTime() - 86_400_000).toISOString()
  );
  const out: DayTotal[] = Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return { date, amount: 0 };
  });
  for (const r of rows) {
    const t = parseTs(r.timestamp);
    const idx = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime() - start.getTime()) / 86_400_000);
    if (idx >= 0 && idx < days) out[idx].amount += r.amount_received;
  }
  return out;
}

export interface Totals {
  received: number;
  unpaid: number;
  expenses: number;
}

// since is an ISO timestamp lower bound, or null for all time.
export async function getTotals(since: string | null): Promise<Totals> {
  const db = await getDb();
  const from = since ?? "";
  const t = await db.getFirstAsync<{ received: number; unpaid: number }>(
    `SELECT COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount_received END), 0) AS received,
            COALESCE(SUM(CASE WHEN status = 'Unpaid' THEN amount_received END), 0) AS unpaid
     FROM transactions WHERE timestamp >= ?`,
    from
  );
  const e = await db.getFirstAsync<{ expenses: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS expenses FROM expenses WHERE timestamp >= ?",
    from
  );
  return { received: t?.received ?? 0, unpaid: t?.unpaid ?? 0, expenses: e?.expenses ?? 0 };
}

export async function listRecentExpenses(limit = 50): Promise<Expense[]> {
  const db = await getDb();
  return db.getAllAsync<Expense>("SELECT * FROM expenses ORDER BY timestamp DESC LIMIT ?", limit);
}
