import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CustomerSummary, listCustomerSummaries } from "../db/repo";
import { Badge, Chip, EmptyState } from "../ui/components";
import { colors, formatPHP, radius, space, TOUCH, type } from "../ui/theme";
import CustomerDetailScreen from "./CustomerDetailScreen";

export default function CustomersScreen() {
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [query, setQuery] = useState("");
  const [owesOnly, setOwesOnly] = useState(false);
  const [selected, setSelected] = useState<CustomerSummary | null>(null);

  useEffect(() => {
    listCustomerSummaries().then(setRows);
  }, []);

  if (selected) return <CustomerDetailScreen customer={selected} onBack={() => setSelected(null)} />;

  const shown = rows
    .filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((r) => !owesOnly || r.outstanding_debt > 0)
    .sort((a, b) => b.outstanding_debt - a.outstanding_debt || a.name.localeCompare(b.name));

  return (
    <View style={s.container}>
      <TextInput style={s.search} placeholder="Search customers" value={query} onChangeText={setQuery} />
      <View style={s.filters}>
        <Chip label="Owes" selected={owesOnly} onPress={() => setOwesOnly(!owesOnly)} />
        <Text style={s.count}>{shown.length} customers</Text>
      </View>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EmptyState text={owesOnly ? "Nobody owes anything." : "No customers yet."} />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.total_visits} visits`}
            onPress={() => setSelected(item)}
            style={({ pressed }) => [s.card, pressed && s.pressed]}
          >
            <View style={s.main}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.muted}>
                {item.total_visits} visits - paid {formatPHP(item.lifetime_value)}
              </Text>
            </View>
            {item.outstanding_debt > 0 && <Badge label={`Owes ${formatPHP(item.outstanding_debt)}`} />}
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: space.lg, gap: space.sm },
  search: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body },
  filters: { flexDirection: "row", alignItems: "center", gap: space.md },
  count: { color: colors.muted },
  card: { minHeight: TOUCH, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, marginBottom: space.sm },
  pressed: { opacity: 0.8 },
  main: { flex: 1 },
  name: { fontSize: type.title, fontWeight: "700", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
});
