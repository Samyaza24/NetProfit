"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import Icon from "@/components/Icon";
import { Badge, EmptyState, ErrorState, PageHeader, StatCard, SummaryGrid, TableSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { connectionOf, cutoffInfo } from "@/lib/connection";
import { formatClock, formatDay, formatNum, formatPHP, parseTs, timeAgo, tierLabel } from "@/lib/format";
import { Txn } from "@/lib/stats";
import { useFetch } from "@/lib/useFetch";

interface Customer {
  id: string;
  name: string;
  status: string;
}

interface Device {
  id: string;
  label: string;
}

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const load = useCallback(
    () => Promise.all([apiGet<Customer>(`/customers/${id}`), apiGet<Txn[]>("/transactions"), apiGet<Device[]>("/devices")]),
    [id]
  );
  const { data, error, loading, reload } = useFetch(load);

  const rows = useMemo(
    () =>
      (data?.[1] ?? [])
        .filter((t) => t.customer_id === id)
        .sort((a, b) => parseTs(b.timestamp).getTime() - parseTs(a.timestamp).getTime()),
    [data, id]
  );

  if (error) return <ErrorState message={error.includes("404") ? "This customer was not found." : error} onRetry={reload} />;

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Customer" />
        <TableSkeleton rows={5} />
      </>
    );
  }

  const [customer, , devices] = data;
  const labels = Object.fromEntries(devices.map((d) => [d.id, d.label]));
  const paid = rows.filter((t) => t.status === "Paid").reduce((s, t) => s + t.amount_received, 0);
  const owes = rows.filter((t) => t.status === "Unpaid").reduce((s, t) => s + t.amount_received, 0);
  const last = rows[0]?.timestamp ?? null;
  const conn = connectionOf(rows.map((t) => ({ at: parseTs(t.timestamp).getTime(), days: t.duration_days })));
  const cutoff = cutoffInfo(conn);

  return (
    <>
      <Link href="/" className="back">
        <Icon name="back" size={18} /> All customers
      </Link>

      <PageHeader title={customer.name} subtitle={last ? `Last visit ${timeAgo(last)}` : "No visits yet"}>
        <button className="btn secondary" onClick={reload}>
          <Icon name="refresh" /> Refresh
        </button>
      </PageHeader>

      <SummaryGrid>
        <StatCard
          tone={conn.state === "connected" ? "pos" : undefined}
          label="Wi-Fi connection"
          value={conn.state === "connected" ? "Connected" : conn.state === "cutoff" ? "Cut off" : "No plan"}
          sub={conn.state === "none" ? "No plan bought yet" : conn.state === "connected" ? "Plan still running" : "Plan has ended"}
        />
        <StatCard
          label={conn.state === "cutoff" ? "Was cut off on" : "Cut-off date & time"}
          value={cutoff ? cutoff.day : "-"}
          sub={cutoff ? `${cutoff.clock} - ${cutoff.rel}` : "Buy a plan to set one"}
        />
        <StatCard label="Visits" value={String(rows.length)} sub="Transactions recorded" />
        <StatCard tone="pos" label="Total spent" value={formatPHP(paid)} sub="Paid so far" />
        <StatCard tone={owes > 0 ? "neg" : undefined} label="Owes" value={formatPHP(owes)} sub={owes > 0 ? "Unpaid balance" : "All paid up"} />
      </SummaryGrid>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon="receipt" title="No transactions for this customer" />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption>Transactions for {customer.name}</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Plan</th>
                <th className="num">Amount (PHP)</th>
                <th>Status</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="time">
                    {formatDay(t.timestamp)}
                    <span className="sub">{formatClock(t.timestamp)}</span>
                  </td>
                  <td>{tierLabel(t.duration_days)}</td>
                  <td className="num">{formatNum(t.amount_received)}</td>
                  <td>
                    <Badge tone={t.status === "Paid" ? "success" : "danger"}>{t.status}</Badge>
                  </td>
                  <td className="muted">{t.device_id ? (labels[t.device_id] ?? "Unknown device") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
