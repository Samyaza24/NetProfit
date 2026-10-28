export type AddressCheck = { ok: true; url: string } | { ok: false; reason: string };

const PRIVATE_V4 = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

// A pairing code is a secret, so it is only sent to an address that is plainly on this network (plain
// http) or to an https address. This stops a fake QR code from sending it to a stranger's server.
export function checkServerUrl(raw: unknown): AddressCheck {
  if (typeof raw !== "string") return { ok: false, reason: "That code has no server address." };
  const url = raw.trim().replace(/\/+$/, "");
  const m = /^(https?):\/\/([^/:?#\s]+)(?::(\d{1,5}))?(\/[^\s?#]*)?$/i.exec(url);
  if (!m) return { ok: false, reason: "That does not look like a server address." };

  const scheme = m[1].toLowerCase();
  const host = m[2].toLowerCase();
  if (scheme === "https") return { ok: true, url };
  if (host === "localhost" || host.endsWith(".local") || PRIVATE_V4.test(host)) return { ok: true, url };
  return { ok: false, reason: "That address is outside your network, so it was not used." };
}

// "http://192.168.1.5:8001/api/v1" -> "192.168.1.5:8001" for showing to the operator.
export function shortAddress(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}
