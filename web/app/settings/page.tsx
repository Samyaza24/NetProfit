"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Icon from "@/components/Icon";
import { ErrorState, PageHeader, TableSkeleton } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";

interface ResetResult {
  data_epoch: string;
  erased: { customers: number; transactions: number; expenses: number };
}

const WORD = "RESET";
const load = () => Promise.all([apiGet<unknown[]>("/customers"), apiGet<unknown[]>("/transactions"), apiGet<unknown[]>("/expenses")]);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function SettingsPage() {
  const { data, error, loading, reload } = useFetch(load);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [done, setDone] = useState<ResetResult | null>(null);

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setResetError(null);
  }

  async function reset() {
    if (typed !== WORD || busy) return;
    setBusy(true);
    setResetError(null);
    try {
      const result = await apiPost<ResetResult>("/reset", { confirm: WORD });
      setDone(result);
      setOpen(false);
      setTyped("");
      reload();
    } catch (e) {
      setResetError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Settings" subtitle="Manage your NetProfit data" />
        <TableSkeleton rows={3} />
      </>
    );
  }

  const [customers, transactions, expenses] = data.map((list) => list.length);

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your NetProfit data" />

      <div className="card danger-zone">
        <h2>Danger zone</h2>
        <p style={{ marginBottom: 12 }}>
          <strong>Reset all data</strong> erases every client, sale and expense on this PC, and every phone erases its copy
          the next time it syncs. Phones stay paired. This cannot be undone.
        </p>
        <p className="muted" style={{ marginBottom: 16 }}>
          Right now: {plural(customers, "client")}, {plural(transactions, "sale")}, {plural(expenses, "expense")}. Want to keep a
          copy first? Export the{" "}
          <Link href="/transactions" style={{ textDecoration: "underline" }}>
            transactions
          </Link>{" "}
          and{" "}
          <Link href="/expenses" style={{ textDecoration: "underline" }}>
            expenses
          </Link>{" "}
          as CSV.
        </p>
        <button
          className="btn danger"
          onClick={() => {
            setDone(null);
            setOpen(true);
          }}
        >
          <Icon name="trash" /> Reset all data
        </button>
        {done && (
          <p className="pos" role="status" style={{ marginTop: 14, fontWeight: 600 }}>
            Erased {plural(done.erased.customers, "client")}, {plural(done.erased.transactions, "sale")} and{" "}
            {plural(done.erased.expenses, "expense")}. Phones erase their copy on their next sync.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={open}
        title="Erase everything?"
        confirmLabel={busy ? "Erasing..." : "Erase everything"}
        confirmDisabled={typed !== WORD || busy}
        onConfirm={reset}
        onCancel={close}
      >
        <span>
          This permanently deletes {plural(customers, "client")}, {plural(transactions, "sale")} and {plural(expenses, "expense")}. Phones
          erase theirs on their next sync, including anything they have not synced yet.
        </span>
        <label>
          Type <strong>{WORD}</strong> to confirm
          <input
            className="input"
            style={{ display: "block", width: "100%", marginTop: 6 }}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reset()}
            autoComplete="off"
            spellCheck={false}
            placeholder={WORD}
          />
        </label>
        {resetError && (
          <span className="neg" role="alert">
            {resetError}
          </span>
        )}
      </ConfirmDialog>
    </>
  );
}
