"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

interface DashboardRow {
  id: string;
  name: string;
  total_visits: number;
  lifetime_value: number;
  outstanding_debt: number;
}

export default function DashboardPage() {
  const [rows, setRows] = useState<DashboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<DashboardRow[]>("/dashboard")
      .then(setRows)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <p>Error loading dashboard: {error}</p>;
  if (rows === null) return <p>Loading...</p>;

  return (
    <div>
      <h1>CRM Dashboard</h1>
      <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">Customer</th>
            <th align="right">Visits</th>
            <th align="right">Lifetime Value</th>
            <th align="right">Outstanding Debt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{row.name}</td>
              <td align="right">{row.total_visits}</td>
              <td align="right">{row.lifetime_value.toFixed(2)}</td>
              <td align="right">{row.outstanding_debt.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
