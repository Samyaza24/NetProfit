import { useCallback } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { CustomerSummary, getCustomer, listCustomerTransactions, markTransactionPaid, parseTs, setCustomerStatus, Transaction } from "../db/repo";
import { connectionOf, cutoffText } from "../lib/connection";
import { friendlyError } from "../lib/errors";
import { formatDateTime, plural, tierName } from "../lib/format";
import { Badge, Button, Card, EmptyState, ErrorState } from "../ui/components";
import { colors, formatPHP, space, type } from "../ui/theme";
import { useLoad } from "../ui/useLoad";

interface Props {
  customer: CustomerSummary;
  onBack: () => void;
}

export default function CustomerDetailScreen({ customer, onBack }: Props) {
  const fetchData = useCallback(async () => {
    const [rows, c] = await Promise.all([listCustomerTransactions(customer.id), getCustomer(customer.id)]);
    return { rows, manualAt: c?.status === "Disabled" ? parseTs(c.updated_at).getTime() : null };
  }, [customer.id]);
  const { data, error, reload: load } = useLoad(fetchData);
  const rows: Transaction[] = data?.rows ?? [];
  const manualAt = data?.manualAt ?? null;

  // Runs a change, then reloads; a failure tells the operator instead of failing silently.
  async function run(change: () => Promise<void>) {
    try {
      await change();
      load();
    } catch (e) {
      Alert.alert("Could not save the change", friendlyError(e).message);
    }
  }

  function changeStatus(status: "Active" | "Disabled") {
    const cut = status === "Disabled";
    Alert.alert(
      cut ? `Cut off ${customer.name}?` : `Reconnect ${customer.name}?`,
      cut
        ? "This marks them as cut off in NetProfit right now. You still need to disconnect them on your Wi-Fi router. Buying a new plan reconnects them automatically."
        : "This undoes the manual cut-off, so their status follows their plan again. Remember to turn their Wi-Fi back on in your router.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: cut ? "Cut off now" : "Reconnect",
          style: cut ? "destructive" : "default",
          onPress: () => run(() => setCustomerStatus(customer.id, status)),
        },
      ]
    );
  }

  function confirmPaid(t: Transaction) {
    Alert.alert("Mark as paid?", `${tierName(t.duration_days)} - ${formatPHP(t.amount_received)}. This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark paid",
        onPress: () => run(() => markTransactionPaid(t.id)),
      },
    ]);
  }

  // Totals come from the loaded rows so they update right after marking something paid.
  const paid = rows.filter((r) => r.status === "Paid").reduce((sum, r) => sum + r.amount_received, 0);
  const owes = rows.filter((r) => r.status === "Unpaid").reduce((sum, r) => sum + r.amount_received, 0);
  const conn = connectionOf(rows.map((r) => ({ at: parseTs(r.timestamp).getTime(), days: r.duration_days })), undefined, manualAt);

  if (!data) {
    return (
      <View style={s.container}>
        <Button title="Back to clients" icon="chevron-back" variant="secondary" onPress={onBack} />
        {error ? <ErrorState message={error} onRetry={load} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Button title="Back to clients" icon="chevron-back" variant="secondary" onPress={onBack} />
      <Card>
        <Text style={s.name} accessibilityRole="header">
          {customer.name}
        </Text>
        <Text style={[s.line, s.status, conn.state === "connected" ? { color: colors.success } : conn.state === "cutoff" ? { color: colors.warning } : null]}>
          Wi-Fi: {conn.state === "connected" ? "Connected" : conn.state === "cutoff" ? "Cut off" : "No plan"}
        </Text>
        <Text style={s.line}>{cutoffText(conn)}</Text>
        <Text style={s.line}>{plural(rows.length, "visit")}</Text>
        <Text style={s.line}>Total spent: {formatPHP(paid)}</Text>
        {owes > 0 && <Text style={s.debt}>Owes {formatPHP(owes)}</Text>}
      </Card>
      {conn.state === "connected" && <Button title="Cut off now" icon="close-circle-outline" variant="secondary" onPress={() => changeStatus("Disabled")} />}
      {conn.manual && <Button title="Reconnect" icon="checkmark-circle-outline" onPress={() => changeStatus("Active")} />}
      {conn.state === "cutoff" && !conn.manual && <Text style={s.muted}>The plan has ended. Buying a new plan reconnects them.</Text>}
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<EmptyState text="No transactions yet." />}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>{tierName(item.duration_days)}</Text>
              <Text style={s.muted}>
                {formatDateTime(parseTs(item.timestamp))}
                {item.synced ? "" : " - pending"}
              </Text>
            </View>
            <View style={s.rowEnd}>
              <Text style={s.rowTitle}>{formatPHP(item.amount_received)}</Text>
              {item.status === "Paid" ? (
                <Badge label="Paid" color={colors.success} />
              ) : (
                <Button title="Mark paid" icon="checkmark-circle-outline" variant="secondary" onPress={() => confirmPaid(item)} />
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: space.lg, gap: space.md },
  name: { fontSize: type.big, fontWeight: "700", color: colors.text },
  line: { fontSize: type.body, color: colors.text },
  status: { fontWeight: "700" },
  debt: { fontSize: type.body, fontWeight: "700", color: colors.danger },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowMain: { flex: 1 },
  rowEnd: { alignItems: "flex-end", gap: space.xs },
  rowTitle: { fontSize: type.body, fontWeight: "600", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
});
