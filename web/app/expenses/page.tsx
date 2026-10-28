"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface Expense {
  id: string;
  device_id: string | null;
  description: string;
  amount: number;
  timestamp: string;
}

interface Device {
  id: string;
  label: string;
}

export default function ExpensesPage() {
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiGet<Expense[]>("/expenses"), apiGet<Device[]>("/devices")])
      .then(([expenses, devices]) => {
        setLabels(Object.fromEntries(devices.map((d) => [d.id, d.label])));
        setRows([...expenses].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p>Error loading expenses: {error}</p>;
  if (rows === null) return <p>Loading...</p>;

  return (
    <div>
      <h1>Expenses</h1>
      <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Time</th>
            <th align="left">Description</th>
            <th align="right">Amount</th>
            <th align="left">Device</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{x.timestamp}</td>
              <td>{x.description}</td>
              <td align="right">{x.amount.toFixed(2)}</td>
              <td>{x.device_id ? (labels[x.device_id] ?? x.device_id) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
