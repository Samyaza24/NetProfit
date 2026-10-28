import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { CustomerSummary, listCustomerTransactions, Transaction } from "../db/repo";
import { Badge, Button, Card, EmptyState } from "../ui/components";
import { colors, formatPHP, space, type } from "../ui/theme";

interface Props {
  customer: CustomerSummary;
  onBack: () => void;
}

const tierName = (days: number) => (days === 30 ? "1 Month" : `${days} ${days === 1 ? "Day" : "Days"}`);

export default function CustomerDetailScreen({ customer, onBack }: Props) {
  const [rows, setRows] = useState<Transaction[]>([]);

  useEffect(() => {
    listCustomerTransactions(customer.id).then(setRows);
  }, [customer.id]);

  return (
    <View style={s.container}>
      <Button title="Back to clients" variant="secondary" onPress={onBack} />
      <Card>
        <Text style={s.name}>{customer.name}</Text>
        <Text style={s.line}>{customer.total_visits} visits</Text>
        <Text style={s.line}>Total spent: {formatPHP(customer.lifetime_value)}</Text>
        {customer.outstanding_debt > 0 && (
          <Text style={s.debt}>Owes {formatPHP(customer.outstanding_debt)}</Text>
        )}
      </Card>
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<EmptyState text="No transactions yet." />}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>{tierName(item.duration_days)}</Text>
              <Text style={s.muted}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
            <View style={s.rowEnd}>
              <Text style={s.rowTitle}>{formatPHP(item.amount_received)}</Text>
              <Badge label={item.status} color={item.status === "Paid" ? colors.success : colors.danger} />
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
