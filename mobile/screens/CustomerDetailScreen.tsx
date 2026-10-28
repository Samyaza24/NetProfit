import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { CustomerSummary, listCustomerTransactions, markTransactionPaid, parseTs, Transaction } from "../db/repo";
import { Badge, Button, Card, EmptyState } from "../ui/components";
import { colors, formatPHP, space, type } from "../ui/theme";

interface Props {
  customer: CustomerSummary;
  onBack: () => void;
}

const tierName = (days: number) => (days === 30 ? "1 Month" : `${days} ${days === 1 ? "Day" : "Days"}`);

export default function CustomerDetailScreen({ customer, onBack }: Props) {
  const [rows, setRows] = useState<Transaction[]>([]);

  const load = useCallback(() => listCustomerTransactions(customer.id).then(setRows), [customer.id]);

  useEffect(() => {
    load();
  }, [load]);

  function confirmPaid(t: Transaction) {
    Alert.alert("Mark as paid?", `${tierName(t.duration_days)} - ${formatPHP(t.amount_received)}. This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark paid",
        onPress: async () => {
          await markTransactionPaid(t.id);
          load();
        },
      },
    ]);
  }

  // Totals come from the loaded rows so they update right after marking something paid.
  const paid = rows.filter((r) => r.status === "Paid").reduce((sum, r) => sum + r.amount_received, 0);
  const owes = rows.filter((r) => r.status === "Unpaid").reduce((sum, r) => sum + r.amount_received, 0);

  return (
    <View style={s.container}>
      <Button title="Back to clients" icon="chevron-back" variant="secondary" onPress={onBack} />
      <Card>
        <Text style={s.name}>{customer.name}</Text>
        <Text style={s.line}>{rows.length} visits</Text>
        <Text style={s.line}>Total spent: {formatPHP(paid)}</Text>
        {owes > 0 && <Text style={s.debt}>Owes {formatPHP(owes)}</Text>}
      </Card>
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<EmptyState text="No transactions yet." />}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>{tierName(item.duration_days)}</Text>
              <Text style={s.muted}>
                {parseTs(item.timestamp).toLocaleString()}
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
  debt: { fontSize: type.body, fontWeight: "700", color: colors.danger },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowMain: { flex: 1 },
  rowEnd: { alignItems: "flex-end", gap: space.xs },
  rowTitle: { fontSize: type.body, fontWeight: "600", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
});
