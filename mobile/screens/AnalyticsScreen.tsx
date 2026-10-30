import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { DayTotal, getDailyReceived, getFirstActivity, getTotals, listExpensesBetween, listMonthlyTotals, listUnpaidBetween, MonthTotal, Totals } from "../db/repo";
import { formatDate, plural } from "../lib/format";
import { Card, Chip, ErrorState, Segmented } from "../ui/components";
import CountUp from "../ui/CountUp";
import Icon from "../ui/Icon";
import { formatPHP, Palette, radius, space, TOUCH, type } from "../ui/theme";
import { useStyles, useTheme } from "../ui/ThemeContext";
import { useLoad } from "../ui/useLoad";

type Mode = "month" | "all";

const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const monthName = (d: Date) => d.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
const monthOnly = (d: Date) => d.toLocaleDateString("en-PH", { month: "long" });

interface StatsData {
  first: Date | null;
  totals: Totals;
  prev: Totals | null;
  daily: DayTotal[] | null;
  expenses: { description: string; amount: number }[];
  owes: { name: string; total: number }[];
  months: MonthTotal[] | null;
}

export default function AnalyticsScreen({ active = true }: { active?: boolean }) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [day, setDay] = useState<Date | null>(null);

  // Everything for the chosen day, month or all time in one load.
  const monthKey = month.getTime();
  const dayKey = day?.getTime() ?? 0;
  const load = useCallback(async (): Promise<StatsData> => {
    const first = await getFirstActivity();
    if (mode === "all") {
      return { first, totals: await getTotals(null), prev: null, daily: null, expenses: [], owes: [], months: await listMonthlyTotals() };
    }
    const m = new Date(monthKey);
    const [from, to] = dayKey ? [new Date(dayKey), addDays(new Date(dayKey), 1)] : [m, addMonths(m, 1)];
    const [a, b] = [from.toISOString(), to.toISOString()];
    const hasPrev = !dayKey && first !== null && monthKey > firstOfMonth(first).getTime();
    const [totals, prev, daily, expenses, owes] = await Promise.all([
      getTotals(a, b),
      hasPrev ? getTotals(addMonths(m, -1).toISOString(), m.toISOString()) : Promise.resolve(null),
      getDailyReceived(m, addMonths(m, 1)),
      listExpensesBetween(a, b),
      listUnpaidBetween(a, b),
    ]);
    return { first, totals, prev, daily, expenses, owes, months: null };
  }, [mode, monthKey, dayKey]);

  const { data, error, refreshing, reload } = useLoad(load, active);
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ActivityIndicator style={s.loading} color={colors.primary} />;
  const { first, totals: t, prev, daily, expenses, owes, months } = data;

  const net = t.received - t.expenses;
  const today = addDays(new Date(), 0);
  const canGoBack = first !== null && monthKey > firstOfMonth(first).getTime();
  const canGoForward = monthKey < firstOfMonth(today).getTime();
  const label = mode === "all" ? "all time" : day ? formatDate(day) : monthName(month);

  // Average per day counts only the days that have happened, so the current month is not diluted.
  const daysCounted = daily ? (monthKey === firstOfMonth(today).getTime() ? today.getDate() : daily.length) : 1;
  const best = daily?.reduce<DayTotal | null>((top, d) => (d.amount > (top?.amount ?? 0) ? d : top), null) ?? null;
  const prevNet = prev ? prev.received - prev.expenses : null;
  const gap = prevNet === null ? 0 : net - prevNet;

  const nets = (months ?? []).map((m) => m.received - m.expenses);
  const bestMonth = months?.length ? months[nets.indexOf(Math.max(...nets))] : null;

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
      {prevNet !== null && (
        <Text style={gap < 0 ? s.loss : s.good}>
          {gap === 0 ? `Same as ${monthOnly(addMonths(month, -1))}` : `${gap > 0 ? "Up" : "Down"} ${formatPHP(Math.abs(gap))} from ${monthOnly(addMonths(month, -1))}`}
        </Text>
      )}
      {t.unpaid > 0 && <Text style={s.loss}>Unpaid: {formatPHP(t.unpaid)}</Text>}

      {mode === "month" && daily && (
        <>
          <Card>
            <View style={s.cardHead}>
              <Text style={s.title} accessibilityRole="header">
                Pick a day
              </Text>
              {day && <Chip label="Whole month" selected={false} onPress={() => setDay(null)} />}
            </View>
            <View style={s.grid}>
              {daily.map((d) => {
                const picked = day !== null && d.date.getTime() === day.getTime();
                const future = d.date.getTime() > today.getTime();
                return (
                  <View key={d.date.toISOString()} style={s.cellWrap}>
                    <Pressable
                      style={[s.cell, picked && s.cellPicked, future && s.cellOff]}
                      disabled={future}
                      onPress={() => setDay(picked ? null : d.date)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: picked, disabled: future }}
                      accessibilityLabel={`${d.date.toDateString()}: ${formatPHP(d.amount)}`}
                    >
                      <Text style={[s.cellDay, picked && s.cellTextPicked]}>{d.date.getDate()}</Text>
                      <Text style={[s.cellAmount, picked && s.cellTextPicked]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                        {d.amount > 0 ? Math.round(d.amount) : ""}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card>
            <Text style={s.title} accessibilityRole="header">
              Quick facts
            </Text>
            <Text style={s.line}>{plural(t.sales, "sale")}</Text>
            {!day && <Text style={s.line}>Average per day: {formatPHP(t.received / daysCounted)}</Text>}
            {!day && best && (
              <Pressable onPress={() => setDay(best.date)} accessibilityRole="button">
                <Text style={s.line}>
                  Best day: {formatDate(best.date)}, {formatPHP(best.amount)} (tap to open)
                </Text>
              </Pressable>
            )}
          </Card>

          <Card>
            <Text style={s.title} accessibilityRole="header">
              Expenses
            </Text>
            {expenses.length === 0 && <Text style={s.note}>No expenses.</Text>}
            {expenses.map((e, i) => (
              <View key={i} style={s.row}>
                <Text style={[s.line, s.grow]} numberOfLines={1}>
                  {e.description}
                </Text>
                <Text style={s.line}>{formatPHP(e.amount)}</Text>
              </View>
            ))}
          </Card>

          <Card>
            <Text style={s.title} accessibilityRole="header">
              Who still owes
            </Text>
            {owes.length === 0 && <Text style={s.note}>Nobody owes for this period.</Text>}
            {owes.map((o) => (
              <View key={o.name} style={s.row}>
                <Text style={[s.line, s.grow]} numberOfLines={1}>
                  {o.name}
                </Text>
                <Text style={s.loss}>{formatPHP(o.total)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {mode === "all" && months && (
        <>
          {bestMonth && (
            <Card>
              <Text style={s.line}>
                Best month: {monthName(bestMonth.month)}, {formatPHP(bestMonth.received - bestMonth.expenses)}
              </Text>
              <Text style={s.line}>Average per month: {formatPHP(nets.reduce((a, b) => a + b, 0) / nets.length)}</Text>
            </Card>
          )}
          <Card>
            <Text style={s.title} accessibilityRole="header">
              Month by month
            </Text>
            {months.length === 0 && <Text style={s.note}>Nothing recorded yet. Record a sale or an expense and your totals appear here.</Text>}
            {months.map((m) => {
              const mNet = m.received - m.expenses;
              return (
                <Pressable
                  key={m.month.getTime()}
                  style={s.monthRow}
                  onPress={() => {
                    setMonth(m.month);
                    setDay(null);
                    setMode("month");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthName(m.month)}, net profit ${formatPHP(mNet)}. Open this month.`}
                >
                  <View style={s.grow}>
                    <Text style={s.line}>{monthName(m.month)}</Text>
                    <Text style={s.note}>
                      {formatPHP(m.received)} received - {formatPHP(m.expenses)} expenses
                    </Text>
                  </View>
                  <Text style={mNet < 0 ? s.loss : s.good}>{formatPHP(mNet)}</Text>
                </Pressable>
              );
            })}
          </Card>
        </>
      )}

      {t.received === 0 && t.expenses === 0 && t.unpaid === 0 && mode === "month" && <Text style={s.note}>Nothing recorded in this period.</Text>}
      <Text style={s.note}>Based on data on this phone. Sync first for the latest totals.</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { padding: space.lg, gap: space.md },
  title: { fontSize: type.title, fontWeight: "700", color: colors.text },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm },
  line: { fontSize: type.body, color: colors.text },
  good: { color: colors.success, fontSize: type.body, fontWeight: "600" },
  loss: { color: colors.danger, fontSize: type.body, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md, paddingVertical: space.xs },
  grow: { flex: 1 },
  monthRow: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: TOUCH, paddingVertical: space.xs },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
  arrowOff: { opacity: 0.3 },
  monthText: { fontSize: type.title, fontWeight: "700", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: { width: `${100 / 7}%`, padding: 2 },
  cell: { minHeight: 52, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  cellPicked: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellOff: { opacity: 0.35 },
  cellDay: { fontSize: type.body, fontWeight: "700", color: colors.text },
  cellAmount: { fontSize: type.tiny, color: colors.muted, minHeight: 16 },
  cellTextPicked: { color: colors.primaryText },
  hero: { padding: space.lg, borderRadius: radius.md, backgroundColor: colors.success, gap: space.xs },
  heroLoss: { backgroundColor: colors.danger },
  heroLabel: { fontSize: type.small, fontWeight: "700", color: colors.primaryText, textTransform: "uppercase" },
  heroValue: { fontSize: type.hero, fontWeight: "800", color: colors.primaryText },
  heroSub: { fontSize: type.small, color: colors.primaryText },
  note: { color: colors.muted, fontSize: type.small },
});
