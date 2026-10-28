import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { DayTotal, getDailyReceived, getTotals, Totals } from "../db/repo";
import { Card } from "../ui/components";
import { colors, formatPHP, radius, space, type } from "../ui/theme";

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

const BAR_AREA = 100;

export default function AnalyticsScreen() {
  const [totals, setTotals] = useState<Totals[] | null>(null);
  const [daily, setDaily] = useState<DayTotal[]>([]);

  useEffect(() => {
    Promise.all(PERIODS.map(([, since]) => getTotals(since()))).then(setTotals);
    getDailyReceived(7).then(setDaily);
  }, []);

  if (!totals) return <ActivityIndicator style={s.loading} color={colors.primary} />;

  const max = Math.max(1, ...daily.map((d) => d.amount));

  return (
    <ScrollView contentContainerStyle={s.container}>
      {PERIODS.map(([label], i) => {
        const t = totals[i];
        const net = t.received - t.expenses;
        return (
          <Card key={label}>
            <Text style={s.title}>{label}</Text>
            <Text style={s.line}>Received: {formatPHP(t.received)}</Text>
            <Text style={s.line}>Expenses: {formatPHP(t.expenses)}</Text>
            <Text style={[s.net, net < 0 && s.loss]}>Net profit: {formatPHP(net)}</Text>
            {t.unpaid > 0 && <Text style={s.loss}>Unpaid: {formatPHP(t.unpaid)}</Text>}
          </Card>
        );
      })}

      <Card>
        <Text style={s.title}>Last 7 days (received)</Text>
        <View style={s.chart}>
          {daily.map((d) => (
            <View
              key={d.date.toISOString()}
              style={s.col}
              accessible
              accessibilityLabel={`${d.date.toDateString()}: ${formatPHP(d.amount)}`}
            >
              <Text style={s.value}>{d.amount > 0 ? Math.round(d.amount) : ""}</Text>
              <View style={[s.bar, { height: Math.max(2, (d.amount / max) * BAR_AREA) }]} />
              <Text style={s.day}>{d.date.toLocaleDateString("en-US", { weekday: "short" })}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={s.note}>Based on data on this phone. Sync first for the latest totals.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { padding: space.lg, gap: space.md },
  title: { fontSize: type.title, fontWeight: "700", color: colors.text, marginBottom: space.xs },
  line: { fontSize: type.body, color: colors.text },
  net: { fontSize: type.body, fontWeight: "700", color: colors.success, marginTop: space.xs },
  loss: { color: colors.danger, fontSize: type.body },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: space.sm },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: space.xs },
  bar: { width: "60%", backgroundColor: colors.primary, borderRadius: radius.sm },
  value: { fontSize: 11, color: colors.muted, height: 14 },
  day: { fontSize: 11, color: colors.muted },
  note: { color: colors.muted, fontSize: type.small },
});
