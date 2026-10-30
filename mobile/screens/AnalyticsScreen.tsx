import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, RefreshControl, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { DayTotal, getDailyReceived, getFirstActivity, getTotals, Totals } from "../db/repo";
import { formatDate } from "../lib/format";
import { Card, Chip, ErrorState, Segmented } from "../ui/components";
import CountUp from "../ui/CountUp";
import Icon from "../ui/Icon";
import { formatPHP, Palette, radius, space, TOUCH, type } from "../ui/theme";
import { useStyles, useTheme } from "../ui/ThemeContext";
import { useLoad } from "../ui/useLoad";
import { useReducedMotion } from "../ui/useReducedMotion";

type Mode = "month" | "all";

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monthName = (d: Date) => d.toLocaleDateString("en-PH", { month: "long", year: "numeric" });

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

export default function AnalyticsScreen({ active = true }: { active?: boolean }) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [day, setDay] = useState<Date | null>(null);

  // Totals for the chosen day, month or all time, plus the daily bars for the month.
  const monthKey = month.getTime();
  const dayKey = day?.getTime() ?? 0;
  const load = useCallback(async () => {
    const first = await getFirstActivity();
    if (mode === "all") return { first, totals: await getTotals(null), daily: null as DayTotal[] | null };
    const m = new Date(monthKey);
    const [from, to] = dayKey ? [new Date(dayKey), addDays(new Date(dayKey), 1)] : [m, addMonths(m, 1)];
    const [totals, daily] = await Promise.all([getTotals(from.toISOString(), to.toISOString()), getDailyReceived(m, addMonths(m, 1))]);
    return { first, totals, daily };
  }, [mode, monthKey, dayKey]);

  const { data, error, refreshing, reload } = useLoad(load, active);
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ActivityIndicator style={s.loading} color={colors.primary} />;
  const { first, totals, daily } = data;

  const t: Totals = totals;
  const net = t.received - t.expenses;
  const canGoBack = first !== null && monthKey > firstOfMonth(first).getTime();
  const canGoForward = monthKey < firstOfMonth(new Date()).getTime();
  const max = Math.max(1, ...(daily ?? []).map((d) => d.amount));
  const label = mode === "all" ? "all time" : day ? formatDate(day) : monthName(month);

  function step(n: number) {
    setMonth(addMonths(month, n));
    setDay(null);
  }

  return (
    <ScrollView contentContainerStyle={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      <Segmented
        options={[
          ["month", "Month"],
          ["all", "All time"],
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setDay(null);
        }}
        label="Period"
      />

      {mode === "month" && (
        <View style={s.stepper}>
          <Pressable style={[s.arrow, !canGoBack && s.arrowOff]} disabled={!canGoBack} onPress={() => step(-1)} accessibilityRole="button" accessibilityLabel="Previous month">
            <Icon name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={s.monthText} accessibilityRole="header">
            {monthName(month)}
          </Text>
          <Pressable style={[s.arrow, !canGoForward && s.arrowOff]} disabled={!canGoForward} onPress={() => step(1)} accessibilityRole="button" accessibilityLabel="Next month">
            <Icon name="chevron-forward" size={24} color={colors.text} />
          </Pressable>
        </View>
      )}

      <View style={[s.hero, net < 0 && s.heroLoss]}>
        <Text style={s.heroLabel}>Net profit - {label}</Text>
        <CountUp value={net} style={s.heroValue} />
        <Text style={s.heroSub}>
          {formatPHP(t.received)} received - {formatPHP(t.expenses)} expenses
        </Text>
      </View>
      {t.unpaid > 0 && <Text style={s.loss}>Unpaid: {formatPHP(t.unpaid)}</Text>}
      {t.received === 0 && t.expenses === 0 && t.unpaid === 0 && <Text style={s.note}>Nothing recorded in this period.</Text>}

      {daily && (
        <Card>
          <View style={s.cardHead}>
            <Text style={s.title} accessibilityRole="header">
              Received per day
            </Text>
            {day && <Chip label="Whole month" selected={false} onPress={() => setDay(null)} />}
          </View>
          <Text style={s.note}>Tap a day to see only that day.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.chart}>
              {daily.map((d) => {
                const picked = day !== null && d.date.getTime() === day.getTime();
                return (
                  <Pressable
                    key={d.date.toISOString()}
                    style={[s.col, picked && s.colPicked]}
                    onPress={() => setDay(picked ? null : d.date)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: picked }}
                    accessibilityLabel={`${d.date.toDateString()}: ${formatPHP(d.amount)}`}
                  >
                    <Text style={s.value} maxFontSizeMultiplier={1.3} numberOfLines={1}>
                      {d.amount > 0 ? Math.round(d.amount) : ""}
                    </Text>
                    <GrowBar height={Math.max(2, (d.amount / max) * BAR_AREA)} style={[s.bar, picked && s.barPicked]} />
                    <Text style={s.day} maxFontSizeMultiplier={1.3}>
                      {d.date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Card>
      )}

      <Text style={s.note}>Based on data on this phone. Sync first for the latest totals.</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { padding: space.lg, gap: space.md },
  title: { fontSize: type.title, fontWeight: "700", color: colors.text },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  loss: { color: colors.danger, fontSize: type.body, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
  arrowOff: { opacity: 0.3 },
  monthText: { fontSize: type.title, fontWeight: "700", color: colors.text },
  chart: { flexDirection: "row", alignItems: "flex-end", marginTop: space.sm },
  col: { width: 36, alignItems: "center", justifyContent: "flex-end", gap: space.xs, paddingVertical: space.xs, borderRadius: radius.sm },
  colPicked: { backgroundColor: colors.border },
  hero: { padding: space.lg, borderRadius: radius.md, backgroundColor: colors.success, gap: space.xs },
  heroLoss: { backgroundColor: colors.danger },
  heroLabel: { fontSize: type.small, fontWeight: "700", color: colors.primaryText, textTransform: "uppercase" },
  heroValue: { fontSize: type.hero, fontWeight: "800", color: colors.primaryText },
  heroSub: { fontSize: type.small, color: colors.primaryText },
  bar: { width: "60%", backgroundColor: colors.accent, borderRadius: radius.sm },
  barPicked: { backgroundColor: colors.primary },
  value: { fontSize: type.tiny, color: colors.muted, minHeight: 16 },
  day: { fontSize: type.tiny, color: colors.muted },
  note: { color: colors.muted, fontSize: type.small },
});
