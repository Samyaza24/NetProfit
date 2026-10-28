export class TimeoutError extends Error {
  constructor() {
    super("The request timed out");
    this.name = "TimeoutError";
  }
}

// fetch that gives up after `ms`, so an unreachable PC never leaves a spinner running.
export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 12_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (ctrl.signal.aborted) throw new TimeoutError();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
