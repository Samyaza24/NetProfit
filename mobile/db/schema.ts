import * as SQLite from "expo-sqlite";
import { notifyDataChange } from "./events";

// expo-sqlite's package.json exports map is misordered ("default" before "types"),
// so TS can't see its real types here; this local interface covers what we use.
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(
    sql: string,
    ...params: unknown[]
  ): Promise<{ lastInsertRowId: number; changes: number }>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
}

let dbPromise: Promise<Db> | null = null;

async function initDb(): Promise<Db> {
  const raw = (await SQLite.openDatabaseAsync("netprofit.db")) as Db;
  // Every write announces itself, so screens like the status strip refresh without polling.
  const db: Db = {
    execAsync: (sql) => raw.execAsync(sql),
    runAsync: async (sql, ...params) => {
      const result = await raw.runAsync(sql, ...params);
      notifyDataChange();
      return result;
    },
    getFirstAsync: (sql, ...params) => raw.getFirstAsync(sql, ...params),
    getAllAsync: (sql, ...params) => raw.getAllAsync(sql, ...params),
  };
  await db.execAsync(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          status TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          synced INTEGER NOT NULL DEFAULT 0,
          rev INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY NOT NULL,
          customer_id TEXT NOT NULL,
          device_id TEXT,
          amount_received REAL NOT NULL,
          duration_days INTEGER NOT NULL,
          status TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          synced INTEGER NOT NULL DEFAULT 0,
          rev INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY NOT NULL,
          device_id TEXT,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          timestamp TEXT NOT NULL,
          synced INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS sync_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT
        );
      `);
  // Phones created before `rev` existed get the column added once; safe to run on every start.
  for (const table of ["customers", "transactions"]) {
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === "rev")) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN rev INTEGER NOT NULL DEFAULT 0`);
    }
  }
  // Indexes for the lookups the screens do on every open (client history, recent sales, pending rows).
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_txn_customer ON transactions (customer_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_txn_timestamp ON transactions (timestamp);
    CREATE INDEX IF NOT EXISTS idx_txn_synced ON transactions (synced);
    CREATE INDEX IF NOT EXISTS idx_exp_timestamp ON expenses (timestamp);
    CREATE INDEX IF NOT EXISTS idx_exp_synced ON expenses (synced);
    CREATE INDEX IF NOT EXISTS idx_cust_synced ON customers (synced);
  `);
  return db;
}

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = initDb();
  }
  return dbPromise!;
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string | null }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    key
  );
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value
  );
}
