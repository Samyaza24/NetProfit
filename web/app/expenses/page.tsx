"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { EmptyState, ErrorState, PageHeader, Segmented, StatCard, SummaryGrid, TableSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatClock, formatDay, formatNum, formatPHP, parseTs } from "@/lib/format";
import { inRange, Range, RANGES } from "@/lib/range";
import { Exp } from "@/lib/stats";
import { useFetch } from "@/lib/useFetch";

interface Device {
  id: string;
  label: string;
}

const PAGE = 50;
const load = () => Promise.all([apiGet<Exp[]>("/expenses"), apiGet<Device[]>("/devices")]);

export default function ExpensesPage() {
  const { data, error, loading, reload } = useFetch(load);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("month");
  const [limit, setLimit] = useState(PAGE);

  const labels = useMemo(() => Object.fromEntries((data?.[1] ?? []).map((d) => [d.id, d.label])), [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.[0] ?? [])
      .filter((x) => inRange(x.timestamp, range) && x.description.toLowerCase().includes(q))
      .sort((a, b) => parseTs(b.timestamp).getTime() - parseTs(a.timestamp).getTime());
  }, [data, query, range]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Expenses" subtitle="Costs recorded by your phones" />
        <TableSkeleton />
      </>
    );
  }

  const total = rows.reduce((s, x) => s + x.amount, 0);
  const largest = rows.reduce((m, x) => Math.max(m, x.amount), 0);
  const device = (x: Exp) => (x.device_id ? (labels[x.device_id] ?? "Unknown device") : "-");

  function exportCsv() {
    downloadCsv(
      "expenses.csv",
      ["Time", "Description", "Amount", "Device"],
      rows.map((x) => [parseTs(x.timestamp).toISOString(), x.description, x.amount, device(x)])
    );
  }

  return (
    <>
      <PageHeader title="Expenses" subtitle="Costs recorded by your phones">
        <button className="btn secondary" onClick={reload}>
          <Icon name="refresh" /> Refresh
        </button>
        <button className="btn secondary" onClick={exportCsv} disabled={rows.length === 0}>
          <Icon name="download" /> Export CSV
        </button>
      </PageHeader>

      <SummaryGrid>
        <StatCard tone={total > 0 ? "neg" : undefined} label="Total spent" value={formatPHP(total)} sub="Expenses in this view" />
        <StatCard label="Expenses" value={String(rows.length)} sub="Matching the filters" />
        <StatCard label="Largest" value={formatPHP(largest)} sub="Single biggest expense" />
      </SummaryGrid>

      <div className="toolbar">
        <input
          className="input search"
          type="search"
          placeholder="Search description"
          aria-label="Search description"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
        />
        <Segmented label="Date range" options={RANGES} value={range} onChange={setRange} />
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon="wallet" title="No expenses match">
            <span>Try a wider date range or clear the search.</span>
          </EmptyState>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption>Expenses</caption>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="num">Amount (PHP)</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((x) => (
                <tr key={x.id}>
                  <td className="time">
                    {formatDay(x.timestamp)}
                    <span className="sub">{formatClock(x.timestamp)}</span>
                  </td>
                  <td><strong>{x.description}</strong></td>
                  <td className="num">{formatNum(x.amount)}</td>
                  <td className="muted">{device(x)}</td>
                </tr>
              ))}
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
