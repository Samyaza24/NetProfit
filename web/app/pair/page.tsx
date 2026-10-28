"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Icon from "@/components/Icon";
import { PageHeader } from "@/components/ui";
import { apiPost } from "@/lib/api";
import { parseTs } from "@/lib/format";

interface PairingCodeResponse {
  pairing_code: string;
  server_url: string;
  expires_at: string;
}

export default function PairPage() {
  const [payload, setPayload] = useState<PairingCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  // Tick once a second while a code is showing so the countdown stays live.
  useEffect(() => {
    if (!payload) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [payload]);

  async function generate() {
    setError(null);
    setBusy(true);
    try {
      setPayload(await apiPost<PairingCodeResponse>("/devices/pairing-code"));
      setNow(Date.now());
      setCopied(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!payload) return;
    await navigator.clipboard.writeText(payload.pairing_code);
    setCopied(true);
  }

  const left = payload ? Math.max(0, Math.floor((parseTs(payload.expires_at).getTime() - now) / 1000)) : 0;
  const expired = payload !== null && left === 0;
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <>
      <PageHeader title="Pair a phone" subtitle="Connect a phone to this PC so it can sync" />

      <div className="pair-grid">
        <div className="card">
          <h2>How to pair</h2>
          <ol className="steps">
            <li>Open the NetProfit app on the phone and tap Scan Pairing QR.</li>
            <li>Make sure the phone is on the same Wi-Fi as this PC.</li>
            <li>Generate a code here and point the phone at the QR code.</li>
          </ol>
          <div className="actions" style={{ marginTop: 18 }}>
            <button className="btn" onClick={generate} disabled={busy}>
              <Icon name={payload ? "refresh" : "qr"} /> {payload ? "Generate a new code" : "Generate pairing QR"}
            </button>
          </div>
          {error && (
            <p className="neg" role="alert" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
          <details style={{ marginTop: 18, color: "var(--muted)" }}>
            <summary>Phone cannot connect?</summary>
            <ul style={{ margin: "8px 0 0 18px" }}>
              <li>The phone and this PC must be on the same Wi-Fi.</li>
              <li>Windows Firewall must allow the backend port (8001).</li>
              <li>The address shown beside the QR must be reachable from the phone.</li>
            </ul>
          </details>
        </div>

        {payload && (
          <div className="card" style={{ maxWidth: 340 }}>
            <div className="qr-box" style={{ opacity: expired ? 0.25 : 1 }}>
              <QRCodeSVG
                value={JSON.stringify({ pairing_code: payload.pairing_code, server_url: payload.server_url })}
                size={260}
                marginSize={4}
              />
            </div>
            <p style={{ marginTop: 12 }} role="status">
              {expired ? <strong className="neg">Expired - generate a new code</strong> : <>Expires in <strong>{clock}</strong></>}
            </p>
            <p className="code" style={{ marginTop: 8 }}>{payload.server_url}</p>
            <div className="actions" style={{ marginTop: 10 }}>
              <button className="btn secondary" onClick={copy} disabled={expired}>
                <Icon name="copy" /> {copied ? "Copied" : "Copy code"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
