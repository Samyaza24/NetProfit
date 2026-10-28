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
  const epoch = await getMeta("data_epoch");

  const customers = await getUnsyncedCustomers();
  const transactions = await getUnsyncedTransactions();
  const expenses = await getUnsyncedExpenses();

  const pushBody = {
    data_epoch: epoch ?? undefined,
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      updated_at: c.updated_at,
    })),
    transactions: transactions.map((t) => ({
      id: t.id,
      customer_id: t.customer_id,
      device_id: t.device_id,
      amount_received: t.amount_received,
      duration_days: t.duration_days,
      status: t.status,
      timestamp: t.timestamp,
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      device_id: e.device_id,
      description: e.description,
      amount: e.amount,
      timestamp: e.timestamp,
    })),
  };

  const pushRes = await fetchWithTimeout(`${serverUrl}/sync`, {
    method: "POST",
    headers,
    body: JSON.stringify(pushBody),
  });
  if (pushRes.status === 401) throw new AuthError("Device token invalid or revoked");

  // The PC was reset since this phone last synced: drop the old data, adopt the new version, start fresh.
  if (pushRes.status === 409) {
    const body = await pushRes.json().catch(() => null);
    const next: string | undefined = body?.detail?.code === "data_reset" ? body.detail.data_epoch : undefined;
    if (!next || afterReset) throw new Error("Push failed: 409");
    await eraseAllLocalData();
    await setMeta("data_epoch", next);
    return { ...(await runSync(true)), wasReset: true };
  }
  if (!pushRes.ok) throw new Error(`Push failed: ${pushRes.status}`);

  // Names the server already had under another id: follow the server's customer.
  const pushed: { customer_remap?: Record<string, string>; data_epoch?: string } = await pushRes.json();
  if (!epoch && pushed.data_epoch) await setMeta("data_epoch", pushed.data_epoch); // first sync: learn the version
  const needFullPull = await applyCustomerRemap(pushed.customer_remap ?? {});

  await markSynced("customers", customers);
  await markSynced("transactions", transactions);
  await markExpensesSynced(expenses.map((e) => e.id));

  const since = needFullPull ? null : await getMeta("last_synced_at");
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const pullRes = await fetchWithTimeout(`${serverUrl}/sync${query}`, { headers });
  if (pullRes.status === 401) throw new AuthError("Device token invalid or revoked");
  if (!pullRes.ok) throw new Error(`Pull failed: ${pullRes.status}`);

  const pulled = await pullRes.json();
  for (const c of pulled.customers) await upsertCustomer(c);
  for (const t of pulled.transactions) await upsertTransaction(t);
  for (const e of pulled.expenses) await upsertExpense(e);

  await setMeta("last_synced_at", pulled.server_time);

  return {
    pushed: {
      customers: customers.length,
      transactions: transactions.length,
      expenses: expenses.length,
    },
    pulled: {
      customers: pulled.customers.length,
      transactions: pulled.transactions.length,
      expenses: pulled.expenses.length,
    },
  };
}
