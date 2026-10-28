import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getTotals, Totals } from "../db/repo";

function startOfToday(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

const PERIODS: [string, () => string | null][] = [
  ["Today", startOfToday],
  ["This month", startOfMonth],
  ["All time", () => null],
];

const php = (n: number) => `${n.toFixed(2)} PHP`;

export default function AnalyticsScreen() {
  const [totals, setTotals] = useState<Totals[]>([]);

  useEffect(() => {
    Promise.all(PERIODS.map(([, since]) => getTotals(since()))).then(setTotals);
  }, []);

  return (
    <View style={styles.container}>
      {PERIODS.map(([label], i) => {
        const t = totals[i];
        if (!t) return null;
        const net = t.received - t.expenses;
        return (
          <View key={label} style={styles.card}>
            <Text style={styles.title}>{label}</Text>
            <Text>Received: {php(t.received)}</Text>
            <Text>Expenses: {php(t.expenses)}</Text>
            <Text style={[styles.net, net < 0 && styles.loss]}>Net profit: {php(net)}</Text>
            {t.unpaid > 0 && <Text style={styles.unpaid}>Unpaid: {php(t.unpaid)}</Text>}
          </View>
        );
      })}
      <Text style={styles.note}>Based on data on this phone. Sync first for the latest totals.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  card: { padding: 14, borderRadius: 8, backgroundColor: "#f5f5f5", gap: 2 },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 4 },
  net: { fontWeight: "700", color: "#1b7f3b", marginTop: 4 },
  loss: { color: "#b00020" },
  unpaid: { color: "#b00020" },
  note: { color: "#666", fontSize: 12 },
});
