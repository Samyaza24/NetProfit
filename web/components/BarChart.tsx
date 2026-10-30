import { formatPHP } from "@/lib/format";
import { DayTotal } from "@/lib/stats";

const AREA = 100;

// Click a bar to pick that day; click it again to clear. Days show as numbers when there are many.
export default function BarChart({ data, picked, onPick }: { data: DayTotal[]; picked?: number; onPick?: (day: Date | null) => void }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <div className="bars" role="group" aria-label="Amount received per day" style={data.length > 10 ? { gap: 2 } : undefined}>
      {data.map((d) => {
        const on = picked === d.date.getTime();
        return (
          <button
            key={d.date.toISOString()}
            type="button"
            className="bar-col"
            style={{ background: on ? "var(--border)" : "none", border: 0, cursor: "pointer", font: "inherit", color: "inherit" }}
            aria-pressed={on}
            title={`${d.date.toDateString()}: ${formatPHP(d.amount)}`}
            onClick={() => onPick?.(on ? null : d.date)}
          >
            <span>{d.amount > 0 ? Math.round(d.amount) : ""}</span>
            <div className="bar" style={{ height: Math.max(2, (d.amount / max) * AREA) }} />
            <span>{data.length > 10 ? d.date.getDate() : d.date.toLocaleDateString("en-US", { weekday: "short" })}</span>
          </button>
        );
      })}
    </div>
  );
}
