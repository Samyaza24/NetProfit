import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, RefreshControl, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { getDailyReceived, getTotals } from "../db/repo";
import { Card, ErrorState } from "../ui/components";
import CountUp from "../ui/CountUp";
import { formatPHP, Palette, radius, space, type } from "../ui/theme";
import { useStyles, useTheme } from "../ui/ThemeContext";
import { useLoad } from "../ui/useLoad";
import { useReducedMotion } from "../ui/useReducedMotion";

function startOfToday(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

const PERIODS: [string, () => string | null][] = [
  ["Today", startOfToday],
  ["This month", startOfMonth],
  ["All time", () => null],
];

const BAR_AREA = 100;

// Bar that grows up from its baseline on mount.
function GrowBar({ height, style }: { height: number; style: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduced, v]);

  return <Animated.View style={[style, { height, transformOrigin: "bottom", transform: [{ scaleY: v }] }]} />;
}

const load = async () => {
  const totals = await Promise.all(PERIODS.map(([, since]) => getTotals(since())));
  return { totals, daily: await getDailyReceived(7) };
};

export default function AnalyticsScreen({ active = true }: { active?: boolean }) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const { data, error, refreshing, reload } = useLoad(load, active);
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ActivityIndicator style={s.loading} color={colors.primary} />;
  const { totals, daily } = data;

  const max = Math.max(1, ...daily.map((d) => d.amount));
  const month = totals[1];
  const monthNet = month.received - month.expenses;

  return (
    <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      {totals[2].received === 0 && totals[2].expenses === 0 && (
        <Text style={s.note}>Nothing recorded yet. Record a sale or an expense and your totals appear here.</Text>
      )}
      <View style={[s.hero, monthNet < 0 && s.heroLoss]}>
        <Text style={s.heroLabel}>Net profit this month</Text>
        <CountUp value={monthNet} style={s.heroValue} />
        <Text style={s.heroSub}>
          {formatPHP(month.received)} received - {formatPHP(month.expenses)} expenses
        </Text>
      </View>

      {PERIODS.map(([label], i) => {
        if (i === 1) return null;
        const t = totals[i];
        const net = t.received - t.expenses;
        return (
          <Card key={label}>
            <Text style={s.title} accessibilityRole="header">
              {label}
            </Text>
            <Text style={s.line}>Received: {formatPHP(t.received)}</Text>
            <Text style={s.line}>Expenses: {formatPHP(t.expenses)}</Text>
            <Text style={[s.net, net < 0 && s.loss]}>Net profit: {formatPHP(net)}</Text>
            {t.unpaid > 0 && <Text style={s.loss}>Unpaid: {formatPHP(t.unpaid)}</Text>}
          </Card>
        );
      })}

      <Card>
        <Text style={s.title} accessibilityRole="header">
          Last 7 days (received)
        </Text>
        <View style={s.chart}>
          {daily.map((d) => (
            <View
              key={d.date.toISOString()}
              style={s.col}
              accessible
              accessibilityLabel={`${d.date.toDateString()}: ${formatPHP(d.amount)}`}
            >
              <Text style={s.value} maxFontSizeMultiplier={1.3} numberOfLines={1}>
                {d.amount > 0 ? Math.round(d.amount) : ""}
              </Text>
              <GrowBar height={Math.max(2, (d.amount / max) * BAR_AREA)} style={s.bar} />
              <Text style={s.day} maxFontSizeMultiplier={1.3}>
                {d.date.toLocaleDateString("en-PH", { weekday: "short" })}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={s.note}>Based on data on this phone. Sync first for the latest totals.</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { padding: space.lg, gap: space.md },
  title: { fontSize: type.title, fontWeight: "700", color: colors.text, marginBottom: space.xs },
  line: { fontSize: type.body, color: colors.text },
  net: { fontSize: type.body, fontWeight: "700", color: colors.success, marginTop: space.xs },
  loss: { color: colors.danger, fontSize: type.body },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: space.sm },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: space.xs },
  hero: { padding: space.lg, borderRadius: radius.md, backgroundColor: colors.success, gap: space.xs },
  heroLoss: { backgroundColor: colors.danger },
  heroLabel: { fontSize: type.small, fontWeight: "700", color: colors.primaryText, textTransform: "uppercase" },
  heroValue: { fontSize: type.hero, fontWeight: "800", color: colors.primaryText },
  heroSub: { fontSize: type.small, color: colors.primaryText },
  bar: { width: "60%", backgroundColor: colors.accent, borderRadius: radius.sm },
  value: { fontSize: type.tiny, color: colors.muted, minHeight: 16 },
  day: { fontSize: type.tiny, color: colors.muted },
  note: { color: colors.muted, fontSize: type.small },
});
