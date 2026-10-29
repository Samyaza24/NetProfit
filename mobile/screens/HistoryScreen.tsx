import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { onDataChange } from "../db/events";
import { HistoryRow, listHistory, parseTs } from "../db/repo";
import { formatDateTime, tierName } from "../lib/format";
import { Badge, Button, EmptyState, ErrorState } from "../ui/components";
import { colors, formatPHP, radius, space, TOUCH, type } from "../ui/theme";
import { useLoad } from "../ui/useLoad";

const PAGE = 50;

// "Today", "Yesterday", or a date, in the phone's local time.
function dayHeading(timestamp: string): string {
  const d = parseTs(timestamp);
  const now = new Date();
  const days = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function HistoryScreen({ active = true }: { active?: boolean }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE);

  // Search a moment after typing stops, and start again from the first page.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query);
      setLimit(PAGE);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(() => listHistory(search, limit), [search, limit]);
  const { data, error, refreshing, reload, refresh } = useLoad(load, active);

  // New sales and synced data show up while this tab is open.
  useEffect(() => (active ? onDataChange(refresh) : undefined), [active, refresh]);

  const sections = useMemo(() => {
    const out: { title: string; data: HistoryRow[] }[] = [];
    for (const row of data ?? []) {
      const title = dayHeading(row.timestamp);
      const last = out[out.length - 1];
      if (last && last.title === title) last.data.push(row);
      else out.push({ title, data: [row] });
    }
    return out;
  }, [data]);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ActivityIndicator style={s.loading} color={colors.primary} />;

  return (
    <View style={s.container}>
      <TextInput
        style={s.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by client or expense"
        placeholderTextColor={colors.placeholder}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search history"
      />
      <SectionList
        sections={sections}
        keyExtractor={(r) => `${r.kind}-${r.id}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            text={search.trim() ? `Nothing matches "${search.trim()}".` : "Nothing recorded yet. Sales and expenses you record show up here."}
          />
        }
        ListFooterComponent={
          data.length >= limit ? (
            <View style={s.more}>
              <Button title="Load more" variant="secondary" onPress={() => setLimit(limit + PAGE)} />
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) => (
          <Text style={s.heading} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const sale = item.kind === "sale";
          const title = sale ? `${item.client ?? "Unknown client"} - ${tierName(item.days ?? 0)}` : item.description ?? "Expense";
          return (
            <View
              style={s.row}
              accessible
              accessibilityLabel={`${title}. ${sale ? `${formatPHP(item.amount)}, ${item.status}` : `Expense ${formatPHP(item.amount)}`}. ${formatDateTime(parseTs(item.timestamp))}${
                item.synced ? "" : ", waiting to sync"
              }`}
            >
              <View style={s.main}>
                <Text style={s.title} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={s.muted}>
                  {formatDateTime(parseTs(item.timestamp))}
                  {item.synced ? "" : " - pending"}
                </Text>
              </View>
              <View style={s.end}>
                <Text style={[s.title, !sale && { color: colors.danger }]}>
                  {sale ? "" : "-"}
                  {formatPHP(item.amount)}
                </Text>
                {sale && <Badge label={item.status} color={item.status === "Paid" ? colors.success : colors.danger} />}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { flex: 1, paddingHorizontal: space.lg, paddingTop: space.md },
  search: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body, color: colors.text },
  heading: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase", marginTop: space.lg, marginBottom: space.xs },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  main: { flex: 1, minWidth: 0 },
  end: { alignItems: "flex-end", gap: space.xs },
  title: { fontSize: type.body, fontWeight: "600", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
  more: { paddingVertical: space.lg },
});
