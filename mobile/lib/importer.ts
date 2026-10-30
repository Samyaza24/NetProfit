import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { createLocalCustomer, findCustomerByName, importExpense, importTransaction } from "../db/repo";
import { parseCsv } from "./csv";

export interface ImportResult {
  sales: number;
  expenses: number;
  // Rows left out because they were already stored or could not be read.
  skipped: number;
}

// "2026-10-29 01:42" (local time) to an ISO string, or null if it is not a date.
function toIso(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s.trim());
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// "1 Day", "5 Days", "1 Month" back to a number of days.
function toDays(s: string): number | null {
  const m = /^(\d+)\s*(day|days|month|months)$/i.exec(s.trim());
  if (!m) return null;
  const days = +m[1] * (m[2].toLowerCase().startsWith("month") ? 30 : 1);
  return days > 0 && days <= 3650 ? days : null;
}

const toAmount = (s: string): number | null => {
  const n = Number(s.trim());
  return s.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 10_000_000 ? n : null;
};

// Asks for a CSV file made by the export buttons and adds its sales or expenses; null if the picker was closed.
export async function importCsv(): Promise<ImportResult | null> {
  const pick = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values", "text/plain", "application/vnd.ms-excel"], copyToCacheDirectory: true });
  if (pick.canceled) return null;
  const [header, ...rows] = parseCsv(await new File(pick.assets[0].uri).text());
  const cols = (header ?? []).map((h) => h.trim().toLowerCase());
  const isSales = cols[1] === "client" && cols[2] === "plan";
  const isExpenses = cols[1] === "description";
  if (!isSales && !isExpenses) throw new Error("This is not a NetProfit sales or expenses CSV. Use a file made by the Share buttons.");

  const result: ImportResult = { sales: 0, expenses: 0, skipped: 0 };
  const customers = new Map<string, string>();
  for (const r of rows) {
    const at = toIso(r[0] ?? "");
    if (isExpenses) {
      const amount = toAmount(r[2] ?? "");
      const description = (r[1] ?? "").trim();
      if (!at || amount === null || !description) result.skipped++;
      else if (await importExpense(description, amount, at)) result.expenses++;
      else result.skipped++;
      continue;
    }
    const name = (r[1] ?? "").trim();
    const days = toDays(r[2] ?? "");
    const amount = toAmount(r[3] ?? "");
    const status = (r[4] ?? "").trim().toLowerCase() === "unpaid" ? "Unpaid" : (r[4] ?? "").trim().toLowerCase() === "paid" ? "Paid" : null;
    if (!at || !name || days === null || amount === null || !status) {
      result.skipped++;
      continue;
    }
    const key = name.toLowerCase();
    let id = customers.get(key);
    if (!id) {
      id = (await findCustomerByName(name))?.id ?? (await createLocalCustomer(name)).id;
      customers.set(key, id);
    }
    if (await importTransaction(id, amount, days, status, at)) result.sales++;
    else result.skipped++;
  }
  return result;
}
