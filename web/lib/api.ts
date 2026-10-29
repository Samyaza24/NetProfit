// The built dashboard is served by the backend itself, so it calls the same origin; dev talks to port 8001.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? (process.env.NODE_ENV === "production" ? "/api/v1" : "http://localhost:8001/api/v1");

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.json().then((j) => j.detail, () => null);
    throw new Error(`${method} ${path} failed: ${res.status}${detail ? ` (${detail})` : ""}`);
  }
  return res.json();
}

export const apiGet = <T,>(path: string) => request<T>("GET", path);
export const apiPost = <T,>(path: string, body?: unknown) => request<T>("POST", path, body);
export const apiPatch = <T,>(path: string, body: unknown) => request<T>("PATCH", path, body);
