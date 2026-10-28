import * as SecureStore from "expo-secure-store";
import { getMeta, setMeta } from "../db/schema";
import {
  applyCustomerRemap,
  getUnsyncedCustomers,
  getUnsyncedExpenses,
  getUnsyncedTransactions,
  markSynced,
  upsertCustomer,
  upsertExpense,
  upsertTransaction,
} from "../db/repo";

const TOKEN_KEY = "netprofit_device_token";

export class AuthError extends Error {}

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
}

export async function syncNow(): Promise<SyncResult> {
  const serverUrl = await getMeta("server_url");
  if (!serverUrl) throw new AuthError("Not paired");
  const headers = await authHeaders();

  const customers = await getUnsyncedCustomers();
  const transactions = await getUnsyncedTransactions();
  const expenses = await getUnsyncedExpenses();

  const pushBody = {
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

  const pushRes = await fetch(`${serverUrl}/sync`, {
    method: "POST",
    headers,
    body: JSON.stringify(pushBody),
  });
  if (pushRes.status === 401) throw new AuthError("Device token invalid or revoked");
  if (!pushRes.ok) throw new Error(`Push failed: ${pushRes.status}`);

  // Names the server already had under another id: follow the server's customer.
  const pushed: { customer_remap?: Record<string, string> } = await pushRes.json();
  const needFullPull = await applyCustomerRemap(pushed.customer_remap ?? {});

  await markSynced(
    "customers",
    customers.map((c) => c.id)
  );
  await markSynced(
    "transactions",
    transactions.map((t) => t.id)
  );
  await markSynced(
    "expenses",
    expenses.map((e) => e.id)
  );

  const since = needFullPull ? null : await getMeta("last_synced_at");
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const pullRes = await fetch(`${serverUrl}/sync${query}`, { headers });
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
