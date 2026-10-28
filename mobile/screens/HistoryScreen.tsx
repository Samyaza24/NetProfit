import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Expense, listRecentExpenses, listRecentTransactions, parseTs, TransactionWithName } from "../db/repo";
import { tierName } from "../lib/format";
import { Badge, EmptyState, ErrorState } from "../ui/components";
import FadeIn from "../ui/FadeIn";
import { colors, formatPHP, space, type } from "../ui/theme";
import { useLoad } from "../ui/useLoad";

type Entry =
  | { kind: "sale"; id: string; timestamp: string; title: string; amount: number; status: string; synced: number }
  | { kind: "expense"; id: string; timestamp: string; title: string; amount: number; status: string; synced: number };

const fromTransaction = (t: TransactionWithName): Entry => ({
  kind: "sale", id: t.id, timestamp: t.timestamp, title: `${t.customer_name ?? "Unknown client"} - ${tierName(t.duration_days)}`, amount: t.amount_received, status: t.status, synced: t.synced,
});

const fromExpense = (e: Expense): Entry => ({
  kind: "expense", id: e.id, timestamp: e.timestamp, title: e.description, amount: e.amount, status: "Expense", synced: e.synced,
});

const load = async (): Promise<Entry[]> => {
  const [t, e] = await Promise.all([listRecentTransactions(), listRecentExpenses()]);
  return [...t.map(fromTransaction), ...e.map(fromExpense)].sort(
    (a, b) => parseTs(b.timestamp).getTime() - parseTs(a.timestamp).getTime()
  );
};

export default function HistoryScreen() {
  const { data: entries, error, reload } = useLoad(load);

  if (error && !entries) return <ErrorState message={error} onRetry={reload} />;
  if (!entries) return <ActivityIndicator style={s.loading} color={colors.primary} />;

  return (
    <FlatList
      contentContainerStyle={s.list}
      data={entries}
      keyExtractor={(e) => `${e.kind}-${e.id}`}
      ListEmptyComponent={<EmptyState icon="time-outline" text="Nothing recorded yet." />}
      renderItem={({ item, index }) => (
        <FadeIn delay={Math.min(index, 8) * 40} style={s.row}>
          <View style={s.main}>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.muted}>
              {parseTs(item.timestamp).toLocaleString()}
              {item.synced ? "" : " - pending"}
            </Text>
          </View>
          <View style={s.end}>
            <Text style={[s.title, item.kind === "expense" && { color: colors.danger }]}>
              {item.kind === "expense" ? "-" : ""}
              {formatPHP(item.amount)}
            </Text>
            {item.kind === "sale" && (
              <Badge label={item.status} color={item.status === "Paid" ? colors.success : colors.danger} />
            )}
          </View>
        </FadeIn>
      )}
    />
  );
}

const s = StyleSheet.create({
  loading: { marginTop: space.xl },
  list: { padding: space.lg },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  main: { flex: 1 },
  end: { alignItems: "flex-end", gap: space.xs },
  title: { fontSize: type.body, fontWeight: "600", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
});
