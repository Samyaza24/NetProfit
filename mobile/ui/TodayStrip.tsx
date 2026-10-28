import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { onDataChange } from "../db/events";
import { getTodaySummary } from "../db/repo";
import { plural } from "../lib/format";
import { colors, formatPHP, radius, space, type } from "./theme";
import { useLoad } from "./useLoad";

// What came in today, always visible on the Record screen so the operator sees each sale add up.
export default function TodayStrip() {
  const { data, refresh } = useLoad(getTodaySummary, true, 60_000);

  useEffect(() => onDataChange(refresh), [refresh]);

  if (!data) return null;
  return (
    <View style={s.strip} accessible accessibilityLabel={`Today: ${formatPHP(data.received)} received from ${plural(data.sales, "sale")}`}>
      <Text style={s.label}>Today</Text>
      <Text style={s.value}>{formatPHP(data.received)}</Text>
      <Text style={s.sales}>{plural(data.sales, "sale")}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "baseline", gap: space.sm, marginHorizontal: space.md, marginTop: space.sm, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  label: { fontSize: type.small, fontWeight: "700", color: colors.primary, textTransform: "uppercase" },
  value: { flex: 1, fontSize: type.title, fontWeight: "800", color: colors.text },
  sales: { fontSize: type.small, color: colors.muted },
});
