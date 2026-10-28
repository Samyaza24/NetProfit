export interface FriendlyError {
  message: string;
  details: string;
}

// Turns a thrown value into a sentence an operator can act on; the raw text stays available as details.
export function friendlyError(e: unknown): FriendlyError {
  const details = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  const name = e instanceof Error ? e.name : "";
  const text = e instanceof Error ? e.message : String(e);

  if (name === "TimeoutError") {
    return { message: "The PC did not answer in time. Is it on, and is this phone on the same Wi-Fi?", details };
  }
  if (name === "AuthError") {
    return { message: "This phone is no longer allowed to sync. Pair it again.", details };
  }
  if (name === "SyntaxError") {
    return { message: "That did not look like a NetProfit code. Generate a new one on the PC and try again.", details };
  }
  if (/network request failed|failed to fetch|network error/i.test(text)) {
    return { message: "Can't reach the PC. Is it on, and is this phone on the same Wi-Fi?", details };
  }
  const status = /\b(4\d\d|5\d\d)\b/.exec(text)?.[1];
  if (status === "400") return { message: "That code is invalid, already used or expired. Generate a new one.", details };
  if (status && status.startsWith("5")) return { message: "The PC had a problem. Try again in a moment.", details };
  return { message: "Something went wrong. Please try again.", details };
}
