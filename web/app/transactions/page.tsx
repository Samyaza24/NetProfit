"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Badge, EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime, formatPHP, parseTs, tierLabel } from "@/lib/format";
import { inRange, Range, RANGES } from "@/lib/range";
import { Txn } from "@/lib/stats";
import { useFetch } from "@/lib/useFetch";

interface Named {
  id: string;
  name?: string;
  label?: string;
}

type Status = "all" | "Paid" | "Unpaid";

const PAGE = 50;
const load = () =>
  Promise.all([apiGet<Txn[]>("/transactions"), apiGet<Named[]>("/customers"), apiGet<Named[]>("/devices")]);

export default function TransactionsPage() {
  const { data, error, loading, reload } = useFetch(load);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [range, setRange] = useState<Range>("month");
  const [limit, setLimit] = useState(PAGE);

  const names = useMemo(
    () => Object.fromEntries((data ? [...data[1], ...data[2]] : []).map((n) => [n.id, n.name ?? n.label ?? ""])),
    [data]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.[0] ?? [])
      .filter(
        (t) =>
          inRange(t.timestamp, range) &&
          (status === "all" || t.status === status) &&
          (names[t.customer_id] ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => parseTs(b.timestamp).getTime() - parseTs(a.timestamp).getTime());
  }, [data, names, query, status, range]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Transactions" subtitle="Every sale recorded by your phones" />
        <TableSkeleton />
      </>
    );
  }

  const paid = rows.filter((t) => t.status === "Paid").reduce((s, t) => s + t.amount_received, 0);
  const unpaid = rows.filter((t) => t.status === "Unpaid").reduce((s, t) => s + t.amount_received, 0);
  const device = (t: Txn) => (t.device_id ? (names[t.device_id] ?? "Unknown device") : "-");

  function exportCsv() {
    downloadCsv(
      "transactions.csv",
      ["Time", "Customer", "Amount", "Days", "Status", "Device"],
      rows.map((t) => [parseTs(t.timestamp).toISOString(), names[t.customer_id] ?? t.customer_id, t.amount_received, t.duration_days, t.status, device(t)])
    );
  }

  return (
    <>
      <PageHeader title="Transactions" subtitle="Every sale recorded by your phones">
        <button className="btn secondary" onClick={reload}>
          <Icon name="refresh" /> Refresh
        </button>
        <button className="btn secondary" onClick={exportCsv} disabled={rows.length === 0}>
          <Icon name="download" /> Export CSV
        </button>
      </PageHeader>

      <div className="toolbar">
        <input
          className="input search"
          type="search"
          placeholder="Search customer"
          aria-label="Search customer"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
        />
        {RANGES.map(([key, label]) => (
          <button key={key} className="chip" aria-pressed={range === key} onClick={() => setRange(key)}>
            {label}
          </button>
        ))}
        <span className="spacer" />
        {(["all", "Paid", "Unpaid"] as Status[]).map((s) => (
          <button key={s} className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon="receipt" title="No transactions match">
            <span>Try a wider date range or clear the filters.</span>
          </EmptyState>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption>Transactions</caption>
            <thead>
              <tr>
                <th>Time</th>
                <th>Customer</th>
                <th className="num">Amount</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((t) => (
                <tr key={t.id}>
                  <td>{formatDateTime(t.timestamp)}</td>
                  <td>{names[t.customer_id] ?? t.customer_id}</td>
                  <td className="num">{formatPHP(t.amount_received)}</td>
                  <td>{tierLabel(t.duration_days)}</td>
                  <td>
                    <Badge tone={t.status === "Paid" ? "success" : "danger"}>{t.status}</Badge>
                  </td>
                  <td>{device(t)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>{rows.length} transactions</td>
                <td className="num">{formatPHP(paid)}</td>
                <td colSpan={3}>{unpaid > 0 ? `${formatPHP(unpaid)} unpaid` : "paid in full"}</td>
              </tr>
            </tfoot>
          </table>
          {rows.length > limit && (
            <div className="more">
              <button className="btn secondary" onClick={() => setLimit(limit + PAGE)}>
                Show more ({rows.length - limit} left)
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
