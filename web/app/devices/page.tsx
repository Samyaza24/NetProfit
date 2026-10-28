"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Icon from "@/components/Icon";
import { Badge, EmptyState, ErrorState, PageHeader, StatCard, SummaryGrid, TableSkeleton } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";
import { formatDateTime, parseTs, timeAgo } from "@/lib/format";
import { useFetch } from "@/lib/useFetch";

interface Device {
  id: string;
  label: string;
  paired_at: string;
  last_synced_at: string | null;
  revoked: boolean;
}

const STALE_MS = 7 * 86_400_000;
const load = () => apiGet<Device[]>("/devices");

function status(d: Device) {
  if (d.revoked) return <Badge tone="danger">Revoked</Badge>;
  if (!d.last_synced_at) return <Badge tone="muted">Never synced</Badge>;
  if (Date.now() - parseTs(d.last_synced_at).getTime() > STALE_MS) return <Badge tone="warning">No sync in 7 days</Badge>;
  return <Badge tone="success">Active</Badge>;
}

export default function DevicesPage() {
  const { data, error, loading, reload } = useFetch(load);
  const [target, setTarget] = useState<Device | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  async function revoke() {
    if (!target) return;
    try {
      await apiPost(`/devices/${target.id}/revoke`);
      setRevokeError(null);
      reload();
    } catch (e) {
      setRevokeError(String(e));
    }
    setTarget(null);
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Devices" subtitle="Phones paired with this PC" />
        <TableSkeleton rows={3} />
      </>
    );
  }

  const active = data.filter((d) => !d.revoked);
  const lastSync = data.reduce<string | null>(
    (m, d) => (d.last_synced_at && (!m || parseTs(d.last_synced_at) > parseTs(m)) ? d.last_synced_at : m),
    null
  );

  return (
    <>
      <PageHeader title="Devices" subtitle="Phones paired with this PC">
        <button className="btn secondary" onClick={reload}>
          <Icon name="refresh" /> Refresh
        </button>
        <Link href="/pair" className="btn">
          <Icon name="qr" /> Pair a phone
        </Link>
      </PageHeader>

      {revokeError && (
        <p className="card neg" role="alert" style={{ marginBottom: 12 }}>
          Could not revoke: {revokeError}
        </p>
      )}

      <SummaryGrid>
        <StatCard label="Phones" value={String(data.length)} sub="Ever paired with this PC" />
        <StatCard tone="pos" label="Active" value={String(active.length)} sub="Allowed to sync" />
        <StatCard label="Last sync" value={timeAgo(lastSync)} sub="Most recent across all phones" />
      </SummaryGrid>

      {data.length === 0 ? (
        <div className="card">
          <EmptyState icon="phone" title="No phones paired yet">
            <Link href="/pair" className="btn">
              Pair your first phone
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div className="device-list">
          {data.map((d) => (
            <div key={d.id} className="card device">
              <span className="icon-box">
                <Icon name="phone" size={26} />
              </span>
              <div className="info">
                <div className="title">
                  {d.label}
                  {status(d)}
                </div>
                <div className="meta">
                  <span title={d.last_synced_at ? formatDateTime(d.last_synced_at) : undefined}>
                    Last synced <b>{timeAgo(d.last_synced_at)}</b>
                  </span>
                  <span>
                    Paired <b>{formatDateTime(d.paired_at)}</b>
                  </span>
                </div>
              </div>
              {!d.revoked && (
                <button className="btn danger-outline" onClick={() => setTarget(d)}>
                  Revoke access
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Good to know</h2>
        <ul className="tips">
          <li>A phone syncs only while this PC is on and both are on the same Wi-Fi.</li>
          <li>Revoke a lost or stolen phone right away. It stops syncing, but records already on it stay there.</li>
          <li>A revoked phone can be paired again with a new code on the Pair a phone page.</li>
        </ul>
      </div>

      <ConfirmDialog open={target !== null} title="Revoke this phone?" confirmLabel="Revoke" onConfirm={revoke} onCancel={() => setTarget(null)}>
        {target?.label} will stop syncing right away. Records already on the phone stay there, and it must be paired again to sync.
      </ConfirmDialog>
    </>
  );
}
