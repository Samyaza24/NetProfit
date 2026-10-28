import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CustomerSummary, listConnections, listCustomerSummaries } from "../db/repo";
import { Connection, cutoffText } from "../lib/connection";
import { Badge, Chip, EmptyState, ErrorState } from "../ui/components";
import { useLoad } from "../ui/useLoad";
import FadeIn from "../ui/FadeIn";
import Icon from "../ui/Icon";
import { colors, formatPHP, radius, shadow, space, TOUCH, type } from "../ui/theme";
import CustomerDetailScreen from "./CustomerDetailScreen";

const load = async () => {
  const [rows, conns] = await Promise.all([listCustomerSummaries(), listConnections()]);
  return { rows, conns };
};

export default function CustomersScreen({ active = true }: { active?: boolean }) {
  const [query, setQuery] = useState("");
  const [owesOnly, setOwesOnly] = useState(false);
  const [connFilter, setConnFilter] = useState<"all" | "connected" | "cutoff">("all");
  const [selected, setSelected] = useState<CustomerSummary | null>(null);

  // Reloads when the tab is shown again and every time the detail view closes, so a cut-off made
  // there shows up in the list and in the filters.
  const { data, error, reload } = useLoad(load, active && !selected);
  const rows = data?.rows ?? null;
  const conns: Record<string, Connection> = data?.conns ?? {};

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
  if (error && !rows) return <ErrorState message={error} onRetry={reload} />;
  if (!rows) return <ActivityIndicator style={s.loading} color={colors.primary} />;

  // Soonest cut-off first when looking at connected customers; otherwise biggest debt first.
  const expiry = (id: string) => conns[id]?.expiry ?? Infinity;
  const shown = rows
    .filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((r) => !owesOnly || r.outstanding_debt > 0)
    .filter((r) => connFilter === "all" || conns[r.id]?.state === connFilter)
    .sort((a, b) =>
      connFilter === "connected"
        ? expiry(a.id) - expiry(b.id) || a.name.localeCompare(b.name)
        : b.outstanding_debt - a.outstanding_debt || a.name.localeCompare(b.name)
    );

  return (
    <View style={s.container}>
      <TextInput style={s.search} placeholder="Search customers" value={query} onChangeText={setQuery} />
      <View style={s.filters}>
        <Chip label="All" selected={connFilter === "all"} onPress={() => setConnFilter("all")} />
        <Chip label="Connected" selected={connFilter === "connected"} onPress={() => setConnFilter("connected")} />
        <Chip label="Cut off" selected={connFilter === "cutoff"} onPress={() => setConnFilter("cutoff")} />
        <Chip label="Owes" selected={owesOnly} onPress={() => setOwesOnly(!owesOnly)} />
      </View>
      <Text style={s.count}>{shown.length} customers</Text>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState icon="people-outline" text={owesOnly ? "Nobody owes anything." : "No customers yet."} />
        }
        renderItem={({ item, index }) => (
          <FadeIn delay={Math.min(index, 8) * 40}>
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
                <Text style={[s.status, conns[item.id]?.state === "connected" ? s.on : conns[item.id]?.state === "cutoff" ? s.off : s.muted]}>
                  {cutoffText(conns[item.id])}
                </Text>
              </View>
              {item.outstanding_debt > 0 && <Badge label={`Owes ${formatPHP(item.outstanding_debt)}`} />}
              <Icon name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          </FadeIn>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { flex: 1, padding: space.lg, gap: space.sm },
  search: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body },
  filters: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  count: { color: colors.muted },
  card: { minHeight: TOUCH, flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginBottom: space.sm, ...shadow },
  pressed: { opacity: 0.8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: type.title, fontWeight: "700", color: colors.primary },
  main: { flex: 1 },
  name: { fontSize: type.title, fontWeight: "700", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
  status: { fontSize: type.small, fontWeight: "600" },
  on: { color: colors.success },
  off: { color: colors.warning },
});
