"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import BarChart from "@/components/BarChart";
import ConnectionBadge, { CutoffCell } from "@/components/ConnectionBadge";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import { Badge, CardsSkeleton, EmptyState, ErrorState, PageHeader, Segmented, StatCard, TableSkeleton } from "@/components/ui";
import { apiGet } from "@/lib/api";
import { connectionsByCustomer } from "@/lib/connection";
import { formatPHP } from "@/lib/format";
import { dailyReceived, Exp, startOfMonth, totals, Txn } from "@/lib/stats";
import { useFetch } from "@/lib/useFetch";

interface DashboardRow {
  id: string;
  name: string;
  total_visits: number;
  lifetime_value: number;
  outstanding_debt: number;
}

type SortKey = "name" | "cutoff" | "total_visits" | "lifetime_value" | "outstanding_debt";
type ConnFilter = "all" | "connected" | "cutoff";

const CONN_FILTERS: [ConnFilter, string][] = [["all", "All"], ["connected", "Connected"], ["cutoff", "Cut off"]];

const PAGE = 25;
const load = () =>
  Promise.all([apiGet<DashboardRow[]>("/dashboard"), apiGet<Txn[]>("/transactions"), apiGet<Exp[]>("/expenses")]);

export default function DashboardPage() {
  const { data, error, loading, reload } = useFetch(load);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [owesOnly, setOwesOnly] = useState(false);
  const [connFilter, setConnFilter] = useState<ConnFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "outstanding_debt", dir: -1 });
  const [limit, setLimit] = useState(PAGE);

  const conns = useMemo(() => connectionsByCustomer(data?.[1] ?? []), [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.[0] ?? [])
      .filter((r) => r.name.toLowerCase().includes(q) && (!owesOnly || r.outstanding_debt > 0))
      .filter((r) => connFilter === "all" || conns.get(r.id)?.state === connFilter)
      .sort((a, b) => {
        const expiry = (id: string) => conns.get(id)?.expiry ?? Infinity;
        const diff =
          sort.key === "name"
            ? a.name.localeCompare(b.name)
            : sort.key === "cutoff"
              ? expiry(a.id) - expiry(b.id)
              : a[sort.key] - b[sort.key];
        return diff * sort.dir || a.name.localeCompare(b.name);
      });
  }, [data, conns, query, owesOnly, connFilter, sort]);

  function sortBy(key: SortKey) {
    // Names and cut-off dates start ascending (soonest cut-off first); money and counts start high to low.
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" || key === "cutoff" ? 1 : -1 }));
  }

  const header = (key: SortKey, label: string, num = false) => (
    <th className={num ? "num" : undefined} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="sort" onClick={() => sortBy(key)}>
        {label} {sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}
      </button>
    </th>
  );

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your business at a glance" />
        <CardsSkeleton />
        <TableSkeleton />
      </>
    );
  }

  const [, txns, exps] = data;
  const month = totals(txns, exps, startOfMonth());

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your business at a glance">
        <button className="btn secondary" onClick={reload}>
          <Icon name="refresh" /> Refresh
        </button>
      </PageHeader>

      <div className="stat-grid">
        <StatCard
          tone={month.net < 0 ? "loss" : "hero"}
          label="Net profit this month"
          value={<CountUp value={month.net} />}
          sub="Received minus expenses"
        />
        <StatCard label="Received" value={formatPHP(month.received)} sub="Paid sales this month" />
        <StatCard label="Expenses" value={formatPHP(month.expenses)} sub="This month" />
        <StatCard tone={month.unpaid > 0 ? "neg" : undefined} label="Unpaid" value={formatPHP(month.unpaid)} sub="Sales not yet paid this month" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Last 7 days received</h2>
        <BarChart data={dailyReceived(txns, 7)} />
      </div>

      <div className="toolbar">
        <input
          className="input search"
          type="search"
          placeholder="Search customers"
          aria-label="Search customers"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
        />
        <button className="chip" aria-pressed={owesOnly} onClick={() => setOwesOnly(!owesOnly)}>
          Owes
        </button>
        <Segmented label="Connection" options={CONN_FILTERS} value={connFilter} onChange={setConnFilter} />
        <span className="spacer" />
        <span style={{ color: "var(--muted)" }}>{rows.length} customers</span>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon="search" title={owesOnly ? "Nobody owes anything" : "No customers found"}>
            <span>Customers appear here after a phone syncs.</span>
          </EmptyState>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption>Customers</caption>
            <thead>
              <tr>
                {header("name", "Customer")}
                <th>Wi-Fi</th>
                {header("cutoff", "Cut-off date & time")}
                {header("total_visits", "Visits", true)}
                {header("lifetime_value", "Lifetime value", true)}
                {header("outstanding_debt", "Owes", true)}
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((r) => (
                <tr key={r.id} className="clickable" onClick={() => router.push(`/customers/${r.id}`)}>
                  <td>
                    <div className="cell-name">
                      <span className="avatar" aria-hidden="true">
                        {r.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <Link href={`/customers/${r.id}`} className="row-link" onClick={(e) => e.stopPropagation()}>
                        {r.name}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <ConnectionBadge conn={conns.get(r.id)} />
                  </td>
                  <CutoffCell conn={conns.get(r.id)} />
                  <td className="num">{r.total_visits}</td>
                  <td className="num">{formatPHP(r.lifetime_value)}</td>
                  <td className="num">{r.outstanding_debt > 0 ? <Badge tone="danger">{formatPHP(r.outstanding_debt)}</Badge> : "-"}</td>
                  <td className="chev">
                    <Icon name="chevron" size={18} />
                  </td>
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
