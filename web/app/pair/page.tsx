"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { apiPost } from "@/lib/api";

interface PairingCodeResponse {
  pairing_code: string;
  server_url: string;
  expires_at: string;
}

export default function PairPage() {
  const [payload, setPayload] = useState<PairingCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    try {
      const resp = await apiPost<PairingCodeResponse>("/devices/pairing-code");
      setPayload(resp);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div>
      <h1>Pair a Device</h1>
      <button onClick={generate}>Generate Pairing QR</button>
      {error && <p>Error: {error}</p>}
      {payload && (
        <div style={{ marginTop: 16 }}>
          <QRCodeSVG value={JSON.stringify(payload)} size={256} />
          <p>Code: {payload.pairing_code}</p>
          <p>Expires: {payload.expires_at}</p>
        </div>
      )}
    </div>
  );
}
