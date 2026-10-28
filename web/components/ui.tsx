import { ReactNode } from "react";
import Icon, { IconName } from "./Icon";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </header>
  );
}

export function Badge({ tone, children }: { tone: "success" | "danger" | "warning" | "muted"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: "hero" | "loss" | "pos" | "neg";
}

export function StatCard({ label, value, sub, tone }: StatCardProps) {
  const hero = tone === "hero" || tone === "loss";
  return (
    <div className={`card${hero ? ` stat-hero${tone === "loss" ? " loss" : ""}` : ""}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value${tone === "pos" ? " pos" : tone === "neg" ? " neg" : ""}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <Icon name={icon} size={36} />
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state error card" role="alert">
      <Icon name="alert" size={36} />
      <strong>Something went wrong</strong>
      <span>{message}</span>
      <button className="btn secondary" onClick={onRetry}>
        <Icon name="refresh" /> Try again
      </button>
    </div>
  );
}

// Placeholder rows shown while a table loads.
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: 20, marginBottom: 14, width: `${95 - (i % 3) * 12}%` }} />
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="stat-grid" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card">
          <div className="skeleton" style={{ height: 12, width: "40%", marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 30, width: "70%" }} />
        </div>
      ))}
    </div>
  );
}
