// A text cell is quoted, and one that starts with = + - or @ is prefixed so a spreadsheet shows it as text
// instead of running it as a formula (a client named "=HYPERLINK(...)" must stay harmless).
function cell(value: string | number | null): string {
  if (value === null) return '""';
  const text = String(value);
  const safe = typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Builds CSV text with a byte-order mark so Excel opens it as UTF-8.
export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

// "2026-10-29 01:42" in the phone's local time, easy to sort and read in a spreadsheet.
export function localStamp(when: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())} ${p(when.getHours())}:${p(when.getMinutes())}`;
}
