import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { listExpensesForExport, listSalesForExport, parseTs } from "../db/repo";
import { getDb } from "../db/schema";
import { localStamp, toCsv } from "./csv";
import { tierName } from "./format";

export type ExportRange = "month" | "all";

const sinceFor = (range: ExportRange): string | null => {
  if (range === "all") return null;
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

const stamp = () => localStamp(new Date()).replace(/[: ]/g, "-");

// Writes the file into the app's cache and opens the system share sheet (save to Drive, send by chat, email).
async function shareFile(name: string, content: string | Uint8Array, mimeType: string, title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this phone");
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: title });
}

export async function shareSalesCsv(range: ExportRange): Promise<number> {
  const rows = await listSalesForExport(sinceFor(range));
  const csv = toCsv(
    ["Date", "Client", "Plan", "Amount (PHP)", "Status"],
    rows.map((r) => [localStamp(parseTs(r.timestamp)), r.client ?? "Unknown client", tierName(r.duration_days), r.amount_received, r.status])
  );
  await shareFile(`netprofit-sales-${stamp()}.csv`, csv, "text/csv", "Share sales");
  return rows.length;
}

export async function shareExpensesCsv(range: ExportRange): Promise<number> {
  const rows = await listExpensesForExport(sinceFor(range));
  const csv = toCsv(
    ["Date", "Description", "Amount (PHP)"],
    rows.map((r) => [localStamp(parseTs(r.timestamp)), r.description, r.amount])
  );
  await shareFile(`netprofit-expenses-${stamp()}.csv`, csv, "text/csv", "Share expenses");
  return rows.length;
}

// A copy of the whole local database. It holds every sale and client, so it should be kept private.
export async function shareDatabaseBackup(): Promise<void> {
  const db = await getDb();
  const bytes = await db.serializeAsync();
  await shareFile(`netprofit-backup-${stamp()}.db`, bytes, "application/octet-stream", "Back up NetProfit data");
}
