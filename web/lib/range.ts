import { parseTs } from "./format";
import { startOfMonth, startOfToday } from "./stats";

export type Range = "today" | "week" | "month" | "all";

export const RANGES: [Range, string][] = [
  ["today", "Today"],
  ["week", "7 days"],
  ["month", "This month"],
  ["all", "All time"],
];

export function inRange(ts: string, range: Range): boolean {
  if (range === "all") return true;
  const from =
    range === "today"
      ? startOfToday()
      : range === "month"
        ? startOfMonth()
        : new Date(startOfToday().getTime() - 6 * 86_400_000);
  return parseTs(ts) >= from;
}
