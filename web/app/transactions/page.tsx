"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { Badge, EmptyState, ErrorState, PageHeader, Segmented, StatCard, SummaryGrid, TableSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatClock, formatDay, formatNum, formatPHP, parseTs, tierLabel } from "@/lib/format";
import { inRange, Range, RANGES } from "@/lib/range";
import { Txn } from "@/lib/stats";
import { useFetch } from "@/lib/useFetch";

interface Named {
  id: string;
  name?: string;
  label?: string;
}

type Status = "all" | "Paid" | "Unpaid";

const STATUSES: [Status, string][] = [["all", "All"], ["Paid", "Paid"], ["Unpaid", "Unpaid"]];

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

      <SummaryGrid>
        <StatCard tone="pos" label="Received" value={formatPHP(paid)} sub="Paid sales in this view" />
        <StatCard tone={unpaid > 0 ? "neg" : undefined} label="Unpaid" value={formatPHP(unpaid)} sub="Still to be collected" />
        <StatCard label="Transactions" value={String(rows.length)} sub="Matching the filters" />
      </SummaryGrid>

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
        <Segmented label="Date range" options={RANGES} value={range} onChange={setRange} />
        <span className="spacer" />
        <Segmented<Status> label="Payment status" options={STATUSES} value={status} onChange={setStatus} />
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
                <th>Date</th>
                <th>Customer</th>
                <th>Plan</th>
                <th className="num">Amount (PHP)</th>
                <th>Status</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((t) => {
                const name = names[t.customer_id] ?? t.customer_id;
                return (
                  <tr key={t.id}>
                    <td className="time">
                      {formatDay(t.timestamp)}
                      <span className="sub">{formatClock(t.timestamp)}</span>
                    </td>
                    <td>
                      <div className="cell-name">
                        <span className="avatar" aria-hidden="true">
                          {name.trim().charAt(0).toUpperCase()}
                        </span>
                        <Link href={`/customers/${t.customer_id}`} className="row-link">
                          {name}
                        </Link>
                      </div>
                    </td>
                    <td>{tierLabel(t.duration_days)}</td>
                    <td className="num">{formatNum(t.amount_received)}</td>
                    <td>
                      <Badge tone={t.status === "Paid" ? "success" : "danger"}>{t.status}</Badge>
                    </td>
                    <td className="muted">{device(t)}</td>
                  </tr>
                );
              })}
            </tbody>
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
