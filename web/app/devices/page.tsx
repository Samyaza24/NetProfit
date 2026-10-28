"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

interface Device {
  id: string;
  label: string;
  paired_at: string;
  last_synced_at: string | null;
  revoked: boolean;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiGet<Device[]>("/devices")
      .then(setDevices)
      .catch((e) => setError(String(e)));
  }

  useEffect(load, []);

  async function revoke(id: string) {
    if (!confirm("Revoke this device? It will need to re-pair to sync.")) return;
    try {
      await apiPost(`/devices/${id}/revoke`);
      load();
    } catch (e) {
      setError(String(e));
    }
  }

  if (error) return <p>Error loading devices: {error}</p>;
  if (devices === null) return <p>Loading...</p>;

  return (
    <div>
      <h1>Paired Devices</h1>
      <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Label</th>
            <th align="left">Last Synced</th>
            <th align="left">Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{d.label}</td>
              <td>{d.last_synced_at ?? "Never"}</td>
              <td>{d.revoked ? "Revoked" : "Active"}</td>
              <td>
                {!d.revoked && <button onClick={() => revoke(d.id)}>Revoke</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
