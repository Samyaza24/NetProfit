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
import { connectionsByCustomer, CustomerStatus, urgency } from "@/lib/connection";
import { formatPHP, parseTs } from "@/lib/format";
import { dailyReceived, Exp, monthlyTotals, startOfMonth, totals, Txn } from "@/lib/stats";
import { useFetch } from "@/lib/useFetch";

interface DashboardRow {
  id: string;
  name: string;
  total_visits: number;
  lifetime_value: number;
  outstanding_debt: number;
}

type SortKey = "name" | "cutoff" | "total_visits" | "lifetime_value" | "outstanding_debt";
type ConnFilter = "all" | "due" | "connected" | "cutoff";

const PAGE = 25;
const load = () =>
  Promise.all([
    apiGet<DashboardRow[]>("/dashboard"),
    apiGet<Txn[]>("/transactions"),
    apiGet<Exp[]>("/expenses"),
    apiGet<CustomerStatus[]>("/customers"),
  ]);

export default function DashboardPage() {
  const { data, error, loading, reload } = useFetch(load);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [owesOnly, setOwesOnly] = useState(false);
  const [connFilter, setConnFilter] = useState<ConnFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "cutoff", dir: 1 });
  const [limit, setLimit] = useState(PAGE);
  const [allTime, setAllTime] = useState(false);
  const [period, setPeriod] = useState(startOfMonth);
  const [day, setDay] = useState<Date | null>(null);

  const conns = useMemo(() => connectionsByCustomer(data?.[1] ?? [], data?.[3] ?? []), [data]);
  const dueCount = (data?.[0] ?? []).filter((r) => conns.get(r.id)?.due).length;
  const connFilters: [ConnFilter, string][] = [["all", "All"], ["due", `Due today (${dueCount})`], ["connected", "Connected"], ["cutoff", "Cut off"]];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.[0] ?? [])
      .filter((r) => r.name.toLowerCase().includes(q) && (!owesOnly || r.outstanding_debt > 0))
      .filter((r) => (connFilter === "all" ? true : connFilter === "due" ? conns.get(r.id)?.due : conns.get(r.id)?.state === connFilter))
      .sort((a, b) => {
        const diff =
          sort.key === "name"
            ? a.name.localeCompare(b.name)
            : sort.key === "cutoff"
              ? urgency(conns.get(a.id)) - urgency(conns.get(b.id))
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
  const monthEnd = new Date(period.getFullYear(), period.getMonth() + 1, 1);
  const shownTotals = allTime ? totals(txns, exps, null) : day ? totals(txns, exps, day, new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) : totals(txns, exps, period, monthEnd);
  const firstTs = [...txns.map((t) => t.timestamp), ...exps.map((e) => e.timestamp)].map((t) => parseTs(t).getTime());
  const first = firstTs.length ? new Date(Math.min(...firstTs)) : null;
  const canBack = first !== null && period > new Date(first.getFullYear(), first.getMonth(), 1);
  const canForward = period < startOfMonth();
  const label = allTime ? "all time" : day ? day.toLocaleDateString("en-PH", { dateStyle: "medium" }) : period.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
  const daily = dailyReceived(txns, period, monthEnd);
  const prevMonth = new Date(period.getFullYear(), period.getMonth() - 1, 1);
  const prevTotals = !day && canBack ? totals(txns, exps, prevMonth, period) : null;
  const prevNet = prevTotals ? prevTotals.net : null;
  const gap = prevNet === null ? 0 : shownTotals.net - prevNet;
  const months = monthlyTotals(txns, exps);
  const monthNets = months.map((m) => m.received - m.expenses);
  const bestMonth = months.length ? months[monthNets.indexOf(Math.max(...monthNets))] : null;
  const step = (n: number) => {
    setPeriod(new Date(period.getFullYear(), period.getMonth() + n, 1));
    setDay(null);
  };

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your business at a glance">
        <button className="btn secondary" onClick={reload}>
          <Icon name="refresh" /> Refresh
        </button>
      </PageHeader>

      <div className="toolbar">
        <Segmented
          label="Period"
          options={[["month", "Month"], ["all", "All time"]]}
          value={allTime ? "all" : "month"}
          onChange={(v) => {
            setAllTime(v === "all");
            setDay(null);
          }}
        />
        {!allTime && (
          <>
            <button className="btn secondary" onClick={() => step(-1)} disabled={!canBack} aria-label="Previous month">
              &lt;
            </button>
            <strong>{period.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</strong>
            <button className="btn secondary" onClick={() => step(1)} disabled={!canForward} aria-label="Next month">
              &gt;
            </button>
            {day && (
              <button className="chip" onClick={() => setDay(null)}>
                Whole month
              </button>
            )}
          </>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone={shownTotals.net < 0 ? "loss" : "hero"}
          label={`Net profit - ${label}`}
          value={<CountUp value={shownTotals.net} />}
          sub="Received minus expenses"
        />
        <StatCard label="Received" value={formatPHP(shownTotals.received)} sub={`Paid sales, ${label}`} />
        <StatCard label="Expenses" value={formatPHP(shownTotals.expenses)} sub={label} />
        <StatCard tone={shownTotals.unpaid > 0 ? "neg" : undefined} label="Unpaid" value={formatPHP(shownTotals.unpaid)} sub={`Sales not yet paid, ${label}`} />
      </div>

      {!allTime && prevNet !== null && (
        <p style={{ color: gap < 0 ? "var(--danger)" : "var(--success)", fontWeight: 600 }}>
          {gap === 0 ? "Same as" : `${gap > 0 ? "Up" : "Down"} ${formatPHP(Math.abs(gap))} from`} {prevMonth.toLocaleDateString("en-PH", { month: "long" })}
        </p>
      )}

      {!allTime && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Pick a day</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 6, marginBottom: 12 }}>
            {daily.map((d) => {
              const picked = day?.getTime() === d.date.getTime();
              return (
                <button
                  key={d.date.toISOString()}
                  className="chip"
                  aria-pressed={picked}
                  disabled={d.date > new Date()}
                  onClick={() => setDay(picked ? null : d.date)}
                  title={`${d.date.toDateString()}: ${formatPHP(d.amount)}`}
                >
                  {d.date.getDate()}
                  {d.amount > 0 && <small style={{ display: "block", opacity: 0.8 }}>{Math.round(d.amount)}</small>}
                </button>
              );
            })}
          </div>
          <BarChart data={daily} picked={day?.getTime()} onPick={setDay} />
        </div>
      )}

      {allTime && (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table className="table">
            <caption>Month by month</caption>
            <thead>
              <tr>
                <th>Month</th>
                <th className="num">Received</th>
                <th className="num">Expenses</th>
                <th className="num">Net profit</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr
                  key={m.month.getTime()}
                  className="clickable"
                  onClick={() => {
                    setPeriod(m.month);
                    setDay(null);
                    setAllTime(false);
                  }}
                >
                  <td>{m.month.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}</td>
                  <td className="num">{formatPHP(m.received)}</td>
                  <td className="num">{formatPHP(m.expenses)}</td>
                  <td className="num">{formatPHP(m.received - m.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bestMonth && (
            <p style={{ color: "var(--muted)" }}>
              Best month: {bestMonth.month.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}, {formatPHP(bestMonth.received - bestMonth.expenses)}. Average per month: {formatPHP(monthNets.reduce((a, b) => a + b, 0) / (monthNets.length || 1))}.
            </p>
          )}
        </div>
      )}

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
        <Segmented label="Connection" options={connFilters} value={connFilter} onChange={setConnFilter} />
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
                <tr key={r.id} className="clickable" onClick={() => router.push(`/customer?id=${r.id}`)}>
                  <td>
                    <div className="cell-name">
                      <span className="avatar" aria-hidden="true">
                        {r.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <Link href={`/customer?id=${r.id}`} className="row-link" onClick={(e) => e.stopPropagation()}>
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
