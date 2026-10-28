import { Connection, cutoffInfo } from "@/lib/connection";
import { Badge } from "./ui";

export default function ConnectionBadge({ conn }: { conn: Connection | undefined }) {
  if (!conn || conn.state === "none") return <Badge tone="muted">No plan</Badge>;
  return conn.state === "connected" ? <Badge tone="success">Connected</Badge> : <Badge tone="warning">Cut off</Badge>;
}

// Table cell with the date and time a customer is (or was) cut off, plus how far away that is.
export function CutoffCell({ conn }: { conn: Connection | undefined }) {
  const info = cutoffInfo(conn);
  if (!info) return <td className="muted">-</td>;
  return (
    <td className="time">
      {info.day}
      <span className="sub">
        {info.clock} - {info.rel}
        {info.manual ? " - cut off by you" : ""}
      </span>
    </td>
  );
}
