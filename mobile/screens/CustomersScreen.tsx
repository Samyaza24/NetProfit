import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { CustomerSummary, listConnections, listCustomerSummaries } from "../db/repo";
import { Connection, cutoffText } from "../lib/connection";
import { plural } from "../lib/format";
import { Badge, Chip, EmptyState, ErrorState } from "../ui/components";
import { useLoad } from "../ui/useLoad";
import Icon from "../ui/Icon";
import { colors, formatPHP, radius, shadow, space, TOUCH, type } from "../ui/theme";
import CustomerDetailScreen from "./CustomerDetailScreen";

const load = async () => {
  const [rows, conns] = await Promise.all([listCustomerSummaries(), listConnections()]);
  return { rows, conns };
};

export default function CustomersScreen({ active = true, onSellAgain }: { active?: boolean; onSellAgain?: (name: string, days: number) => void }) {
  const [query, setQuery] = useState("");
  const [owesOnly, setOwesOnly] = useState(false);
  const [connFilter, setConnFilter] = useState<"all" | "connected" | "cutoff">("all");
  const [selected, setSelected] = useState<CustomerSummary | null>(null);

  // Reloads when the tab is shown again and every time the detail view closes, so a cut-off made
  // there shows up in the list and in the filters.
  const { data, error, refreshing, reload } = useLoad(load, active && !selected, 60_000);
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

  if (selected) {
    return (
      <CustomerDetailScreen
        customer={selected}
        onBack={() => setSelected(null)}
        onSellAgain={
          onSellAgain
            ? (days) => {
                setSelected(null);
                onSellAgain(selected.name, days);
              }
            : undefined
        }
      />
    );
  }
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

  // Say why the list is empty, and what to do about it.
  const emptyText =
    rows.length === 0
      ? "No clients yet. Record a sale and the client appears here."
      : query.trim()
        ? `No client matches "${query.trim()}".`
        : owesOnly
          ? "Nobody owes anything."
          : connFilter === "cutoff"
            ? "Nobody is cut off right now."
            : "Nobody is connected right now.";

  return (
    <View style={s.container}>
      <TextInput
        style={s.search}
        placeholder="Search clients"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search clients by name"
      />
      <View style={s.filters}>
        <Chip role="radio" label="All" selected={connFilter === "all"} onPress={() => setConnFilter("all")} />
        <Chip role="radio" label="Connected" selected={connFilter === "connected"} onPress={() => setConnFilter("connected")} />
        <Chip role="radio" label="Cut off" selected={connFilter === "cutoff"} onPress={() => setConnFilter("cutoff")} />
        <Chip role="checkbox" label="Owes" selected={owesOnly} onPress={() => setOwesOnly(!owesOnly)} />
      </View>
      <Text style={s.count}>{plural(shown.length, "client")}</Text>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
        ListEmptyComponent={<EmptyState icon="people-outline" text={emptyText} />}
        renderItem={({ item }) => {
          const conn = conns[item.id];
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}. ${plural(item.total_visits, "visit")}. ${cutoffText(conn)}.${
                item.outstanding_debt > 0 ? ` Owes ${formatPHP(item.outstanding_debt)}.` : ""
              }`}
              onPress={() => setSelected(item)}
              style={({ pressed }) => [s.card, pressed && s.pressed]}
            >
              <View style={s.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text style={s.initial}>{item.name.trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={s.main}>
                <Text style={s.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={s.muted}>
                  {plural(item.total_visits, "visit")} - paid {formatPHP(item.lifetime_value)}
                </Text>
                <Text style={[s.status, conn?.state === "connected" ? s.on : conn?.state === "cutoff" ? s.off : s.muted]}>
                  {cutoffText(conn)}
                </Text>
              </View>
              {item.outstanding_debt > 0 && <Badge label={`Owes ${formatPHP(item.outstanding_debt)}`} />}
              <Icon name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { flex: 1, padding: space.lg, gap: space.sm },
  search: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body, color: colors.text },
  filters: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  count: { color: colors.muted },
  card: { minHeight: TOUCH, flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginBottom: space.sm, ...shadow },
  pressed: { opacity: 0.8 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: type.title, fontWeight: "700", color: colors.primary },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: type.title, fontWeight: "700", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
  status: { fontSize: type.small, fontWeight: "600" },
  on: { color: colors.success },
  off: { color: colors.warning },
});
