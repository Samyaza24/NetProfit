"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Transaction {
  id: string;
  customer_id: string;
  device_id: string | null;
  amount_received: number;
  duration_days: number;
  status: string;
  timestamp: string;
}

interface Named {
  id: string;
  name?: string;
  label?: string;
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<Transaction[]>("/transactions"),
      apiGet<Named[]>("/customers"),
      apiGet<Named[]>("/devices"),
    ])
      .then(([txns, customers, devices]) => {
        setNames(Object.fromEntries([...customers, ...devices].map((n) => [n.id, n.name ?? n.label ?? ""])));
        setRows([...txns].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p>Error loading transactions: {error}</p>;
  if (rows === null) return <p>Loading...</p>;

  return (
    <div>
      <h1>Transactions</h1>
      <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Time</th>
            <th align="left">Customer</th>
            <th align="right">Amount</th>
            <th align="right">Days</th>
            <th align="left">Status</th>
            <th align="left">Device</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{t.timestamp}</td>
              <td>{names[t.customer_id] ?? t.customer_id}</td>
              <td align="right">{t.amount_received.toFixed(2)}</td>
              <td align="right">{t.duration_days}</td>
              <td>{t.status}</td>
              <td>{t.device_id ? (names[t.device_id] ?? t.device_id) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
