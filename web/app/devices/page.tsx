"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Icon from "@/components/Icon";
import { Badge, EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/ui";
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
                <Icon name="phone" size={22} />
              </span>
              <div className="info">
                <strong>{d.label}</strong>
                <span title={d.last_synced_at ? formatDateTime(d.last_synced_at) : undefined}>
                  Last synced: {timeAgo(d.last_synced_at)} - paired {formatDateTime(d.paired_at)}
                </span>
              </div>
              {status(d)}
              {!d.revoked && (
                <button className="btn secondary" onClick={() => setTarget(d)}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={target !== null} title="Revoke this phone?" confirmLabel="Revoke" onConfirm={revoke} onCancel={() => setTarget(null)}>
        {target?.label} will stop syncing right away. Records already on the phone stay there, and it must be paired again to sync.
      </ConfirmDialog>
    </>
  );
}
