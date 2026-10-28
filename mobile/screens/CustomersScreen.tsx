import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CustomerSummary, listCustomerSummaries } from "../db/repo";
import { Badge, Chip, EmptyState } from "../ui/components";
import Icon from "../ui/Icon";
import { colors, formatPHP, radius, shadow, space, TOUCH, type } from "../ui/theme";
import CustomerDetailScreen from "./CustomerDetailScreen";

export default function CustomersScreen() {
  const [rows, setRows] = useState<CustomerSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [owesOnly, setOwesOnly] = useState(false);
  const [selected, setSelected] = useState<CustomerSummary | null>(null);

  useEffect(() => {
    listCustomerSummaries().then(setRows);
  }, []);

  // Android back closes the detail view instead of leaving the screen.
  useEffect(() => {
    if (!selected) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [selected]);

  if (selected) return <CustomerDetailScreen customer={selected} onBack={() => setSelected(null)} />;
  if (!rows) return <ActivityIndicator style={s.loading} color={colors.primary} />;

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
        ListEmptyComponent={
          <EmptyState icon="people-outline" text={owesOnly ? "Nobody owes anything." : "No customers yet."} />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.total_visits} visits`}
            onPress={() => setSelected(item)}
            style={({ pressed }) => [s.card, pressed && s.pressed]}
          >
            <View style={s.avatar}>
              <Text style={s.initial}>{item.name.trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={s.main}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.muted}>
                {item.total_visits} visits - paid {formatPHP(item.lifetime_value)}
              </Text>
            </View>
            {item.outstanding_debt > 0 && <Badge label={`Owes ${formatPHP(item.outstanding_debt)}`} />}
            <Icon name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { flex: 1, padding: space.lg, gap: space.sm },
  search: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body },
  filters: { flexDirection: "row", alignItems: "center", gap: space.md },
  count: { color: colors.muted },
  card: { minHeight: TOUCH, flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginBottom: space.sm, ...shadow },
  pressed: { opacity: 0.8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: type.title, fontWeight: "700", color: colors.primary },
  main: { flex: 1 },
  name: { fontSize: type.title, fontWeight: "700", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
});
