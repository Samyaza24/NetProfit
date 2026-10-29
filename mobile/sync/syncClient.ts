import * as SecureStore from "expo-secure-store";
import { fetchWithTimeout } from "../lib/http";
import { getMeta, setMeta } from "../db/schema";
import {
  applyCustomerRemap,
  eraseAllLocalData,
  getUnsyncedCustomers,
  getUnsyncedExpenses,
  getUnsyncedTransactions,
  markExpensesSynced,
  markSynced,
  upsertCustomer,
  upsertExpense,
  upsertTransaction,
} from "../db/repo";

const TOKEN_KEY = "netprofit_device_token";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function storeCredentials(token: string, serverUrl: string, deviceId: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await setMeta("server_url", serverUrl);
  await setMeta("device_id", deviceId);
}

export async function isPaired(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const serverUrl = await getMeta("server_url");
  return Boolean(token && serverUrl);
}

async function authHeaders(): Promise<{ "X-NetProfit-Key": string; "Content-Type": string }> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new AuthError("Not paired");
  return { "X-NetProfit-Key": token, "Content-Type": "application/json" };
}

export interface SyncResult {
  pushed: { customers: number; transactions: number; expenses: number };
  pulled: { customers: number; transactions: number; expenses: number };
  // True when the PC had been reset, so this phone erased its old data and started fresh.
  wasReset?: boolean;
}

const PUSH_CHUNK = 1000; // the PC accepts at most 1000 rows per list in one push
const PULL_PAGE = 500;

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += PUSH_CHUNK) out.push(rows.slice(i, i + PUSH_CHUNK));
  return out;
}

// Only one sync runs at a time; a second caller gets the one already in progress.
let inflight: Promise<SyncResult> | null = null;

export const isSyncing = () => inflight !== null;

export function syncNow(): Promise<SyncResult> {
  if (!inflight) {
    inflight = runSync().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

// Erases all shop data on the PC and on this phone; other phones erase theirs on their next sync.
// The PC must be reachable, so the phone and the PC can never disagree about what was erased.
export async function resetEverything(): Promise<void> {
  const serverUrl = await getMeta("server_url");
  if (!serverUrl) throw new AuthError("Not paired");
  const headers = await authHeaders();
  await inflight?.catch(() => undefined); // let a sync in progress finish first

  const res = await fetchWithTimeout(`${serverUrl}/sync/reset`, {
    method: "POST",
    headers,
    body: JSON.stringify({ confirm: "RESET" }),
  });
  if (res.status === 401) throw new AuthError("Device token invalid or revoked");
  if (!res.ok) throw new Error(`Reset failed: ${res.status}`);
  const { data_epoch }: { data_epoch: string } = await res.json();

  await eraseAllLocalData();
  await setMeta("data_epoch", data_epoch);
}

async function runSync(afterReset = false): Promise<SyncResult> {
  const serverUrl = await getMeta("server_url");
  if (!serverUrl) throw new AuthError("Not paired");
  const headers = await authHeaders();
  let epoch = await getMeta("data_epoch");
  let needFullPull = false;
  let pushes = 0;

  // Sends one batch. Returns the PC's new data version when it was reset since this phone last synced.
  const send = async (batch: object): Promise<string | undefined> => {
    pushes++;
    const res = await fetchWithTimeout(`${serverUrl}/sync`, {
      method: "POST",
      headers,
      body: JSON.stringify({ data_epoch: epoch ?? undefined, ...batch }),
    });
    if (res.status === 401) throw new AuthError("Device token invalid or revoked");
    if (res.status === 409) {
      const body = await res.json().catch(() => null);
      const next: string | undefined = body?.detail?.code === "data_reset" ? body.detail.data_epoch : undefined;
      if (!next || afterReset) throw new Error("Push failed: 409");
      return next;
    }
    if (!res.ok) throw new Error(`Push failed: ${res.status}`);

    const reply: { customer_remap?: Record<string, string>; data_epoch?: string } = await res.json();
    if (!epoch && reply.data_epoch) {
      epoch = reply.data_epoch; // first sync: learn the version
      await setMeta("data_epoch", epoch);
    }
    // Names the server already had under another id: follow the server's customer.
    if (await applyCustomerRemap(reply.customer_remap ?? {})) needFullPull = true;
    return undefined;
  };

  // The PC was reset since this phone last synced: drop the old data, adopt the new version, start fresh.
  const startFresh = async (next: string): Promise<SyncResult> => {
    await eraseAllLocalData();
    await setMeta("data_epoch", next);
    return { ...(await runSync(true)), wasReset: true };
  };

  // Customers go first so a remap can re-point local sales before those are read and sent.
  const customers = await getUnsyncedCustomers();
  for (const part of chunks(customers)) {
    const next = await send({
      customers: part.map((c) => ({ id: c.id, name: c.name, status: c.status, updated_at: c.updated_at })),
    });
    if (next) return startFresh(next);
    await markSynced("customers", part);
  }

  const transactions = await getUnsyncedTransactions();
  const expenses = await getUnsyncedExpenses();
  const txnParts = chunks(transactions);
  const expParts = chunks(expenses);
  // Always push at least once so a revoked token or a reset PC is noticed even with nothing to send.
  const rounds = Math.max(txnParts.length, expParts.length, pushes === 0 ? 1 : 0);
  for (let i = 0; i < rounds; i++) {
    const txns = txnParts[i] ?? [];
    const exps = expParts[i] ?? [];
    const next = await send({
      transactions: txns.map((t) => ({
        id: t.id,
        customer_id: t.customer_id,
        device_id: t.device_id,
        amount_received: t.amount_received,
        duration_days: t.duration_days,
        status: t.status,
        timestamp: t.timestamp,
      })),
      expenses: exps.map((e) => ({
        id: e.id,
        device_id: e.device_id,
        description: e.description,
        amount: e.amount,
        timestamp: e.timestamp,
      })),
    });
    if (next) return startFresh(next);
    await markSynced("transactions", txns);
    await markExpensesSynced(exps.map((e) => e.id));
  }

  // Pull in pages; the cursor saved is from the first page, taken before any later change on the PC.
  let since = needFullPull ? null : await getMeta("last_synced_at");
  let cursor: string | undefined;
  const pulled = { customers: 0, transactions: 0, expenses: 0 };
  for (;;) {
    const query = `?limit=${PULL_PAGE}${since ? `&since=${encodeURIComponent(since)}` : ""}`;
    const pullRes = await fetchWithTimeout(`${serverUrl}/sync${query}`, { headers });
    if (pullRes.status === 401) throw new AuthError("Device token invalid or revoked");
    if (!pullRes.ok) throw new Error(`Pull failed: ${pullRes.status}`);

    const page = await pullRes.json();
    for (const c of page.customers) await upsertCustomer(c);
    for (const t of page.transactions) await upsertTransaction(t);
    for (const e of page.expenses) await upsertExpense(e);
    pulled.customers += page.customers.length;
    pulled.transactions += page.transactions.length;
    pulled.expenses += page.expenses.length;
    cursor ??= page.server_time;

    if (!page.next_since) break;
    if (page.next_since === since) throw new Error("Pull failed: the PC repeated the same page");
    since = page.next_since;
  }
  await setMeta("last_synced_at", cursor!);

  return {
    pushed: { customers: customers.length, transactions: transactions.length, expenses: expenses.length },
    pulled,
  };
}
