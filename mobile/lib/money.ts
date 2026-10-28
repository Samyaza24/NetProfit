const MAX_AMOUNT = 1_000_000;

// Reads what an operator types as an amount: "1200", "1,200", "1 200.50", "12,5" (comma as the decimal
// mark) or "PHP 200". Returns pesos rounded to centavos, or null when it is not a usable amount.
export function parseAmount(text: string): number | null {
  let t = text.trim().replace(/php|₱|\s/gi, "");
  if (!t) return null;

  if (t.includes(",") && t.includes(".")) {
    t = t.replace(/,/g, ""); // "1,200.50": commas group thousands
  } else if (t.includes(",")) {
    // "1,200" and "1,200,000" group thousands; "12,5" and "0,75" use the comma as the decimal mark.
    t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, "") : t.replace(",", ".");
  }

  if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) return null;
  const n = Math.round(Number(t) * 100) / 100;
  return n > 0 && n <= MAX_AMOUNT ? n : null;
}
