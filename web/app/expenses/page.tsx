"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/Icon";
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime, formatPHP, parseTs } from "@/lib/format";
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
        {RANGES.map(([key, label]) => (
          <button key={key} className="chip" aria-pressed={range === key} onClick={() => setRange(key)}>
            {label}
          </button>
        ))}
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
                <th>Time</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((x) => (
                <tr key={x.id}>
                  <td>{formatDateTime(x.timestamp)}</td>
                  <td>{x.description}</td>
                  <td className="num">{formatPHP(x.amount)}</td>
                  <td>{device(x)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>{rows.length} expenses</td>
                <td className="num">{formatPHP(total)}</td>
                <td />
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
