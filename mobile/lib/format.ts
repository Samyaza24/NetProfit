// "1 Day", "5 Days", "1 Month".
export const tierName = (days: number) => (days === 30 ? "1 Month" : `${days} ${days === 1 ? "Day" : "Days"}`);

// "Nov 28, 2026, 12:08 AM" in the same style everywhere in the app.
export const formatDateTime = (when: number | Date) =>
  new Date(when).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

// "Nov 5, 2026".
export const formatDate = (when: number | Date) =>
  new Date(when).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

// "1 client", "3 clients".
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
