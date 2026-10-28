import { formatPHP } from "@/lib/format";
import { DayTotal } from "@/lib/stats";

const AREA = 100;

export default function BarChart({ data }: { data: DayTotal[] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <div className="bars" role="img" aria-label="Amount received per day for the last 7 days">
      {data.map((d) => (
        <div key={d.date.toISOString()} className="bar-col" title={`${d.date.toDateString()}: ${formatPHP(d.amount)}`}>
          <span>{d.amount > 0 ? Math.round(d.amount) : ""}</span>
          <div className="bar" style={{ height: Math.max(2, (d.amount / max) * AREA) }} />
          <span>{d.date.toLocaleDateString("en-US", { weekday: "short" })}</span>
        </div>
      ))}
    </div>
  );
}
