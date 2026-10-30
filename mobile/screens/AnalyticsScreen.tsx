import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from "react-native";
import { DayTotal, getDailyReceived, getFirstActivity, getTotals, listExpensesBetween, listMonthlyTotals, listUnpaidBetween, MonthTotal, Totals } from "../db/repo";
import { formatDate, plural } from "../lib/format";
import { Badge, Card, Chip, ErrorState, Segmented } from "../ui/components";
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
const shortDay = (d: Date) => d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
const SHOWN = 3;
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

interface StatsData {
  key: string;
  first: Date | null;
  totals: Totals;
  prev: Totals | null;
  daily: DayTotal[] | null;
  expenses: { description: string; amount: number }[];
  owes: { name: string; total: number }[];
  months: MonthTotal[] | null;
}

// A small number with a caption; tappable when onPress is given.
function Tile({ label, value, tone, onPress }: { label: string; value: string; tone?: "good" | "bad"; onPress?: () => void }) {
  const s = useStyles(makeStyles);
  const body = (
    <>
      <Text style={s.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[s.tileValue, tone === "bad" && s.loss, tone === "good" && s.good]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </>
  );
  return onPress ? (
    <Pressable style={s.tile} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Tap to open.`}>
      {body}
    </Pressable>
  ) : (
    <View style={s.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      {body}
    </View>
  );
}

// Shows the first few rows and a "Show all" link for the rest.
function ShortList({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode[] }) {
  const s = useStyles(makeStyles);
  const [all, setAll] = useState(false);
  return (
    <Card>
      <Text style={s.title} accessibilityRole="header">
        {title}
      </Text>
      {count === 0 && <Text style={s.note}>{empty}</Text>}
      {all ? children : children.slice(0, SHOWN)}
      {count > SHOWN && (
        <Pressable style={s.more} onPress={() => setAll(!all)} accessibilityRole="button">
          <Text style={s.moreText}>{all ? "Show less" : `Show all (${count})`}</Text>
        </Pressable>
      )}
    </Card>
  );
}

export default function AnalyticsScreen({ active = true }: { active?: boolean }) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState(() => firstOfMonth(new Date()));
  const [day, setDay] = useState<Date | null>(null);
  const strip = useRef<ScrollViewInstance>(null);
  const stripX = useRef<Record<number, number>>({});

  // Everything for the chosen day, month or all time in one load.
  const monthKey = month.getTime();
  const dayKey = day?.getTime() ?? 0;
  const key = `${mode}-${monthKey}-${dayKey}`;
  const load = useCallback(async (): Promise<StatsData> => {
    const first = await getFirstActivity();
    if (mode === "all") {
      return { key, first, totals: await getTotals(null), prev: null, daily: null, expenses: [], owes: [], months: await listMonthlyTotals() };
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
    return { key, first, totals, prev, daily, expenses, owes, months: null };
  }, [mode, monthKey, dayKey, key]);

  const { data, error, refreshing, reload } = useLoad(load, active);

  // Keep the chosen month in view in the month strip.
  useEffect(() => {
    const x = stripX.current[monthKey];
    if (x !== undefined) strip.current?.scrollTo({ x: Math.max(0, x - 60), animated: true });
  }, [monthKey, mode, data?.first]);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ActivityIndicator style={s.loading} color={colors.primary} />;
  const { first, totals: t, prev, daily, expenses, owes, months } = data;

  const stale = data.key !== key;
  const net = t.received - t.expenses;
  const today = addDays(new Date(), 0);
  const thisMonth = firstOfMonth(today);
  const label = mode === "all" ? "all time" : day ? formatDate(day) : monthName(month);
  const on = day ? ` on ${shortDay(day)}` : "";

  // Months from the first recorded one to now, for the strip.
  const strip_months: Date[] = [];
  for (let m = first ? firstOfMonth(first) : thisMonth; m.getTime() <= thisMonth.getTime(); m = addMonths(m, 1)) strip_months.push(m);

  // Average per day counts only the days that have happened, so the current month is not diluted.
  const daysCounted = daily ? (monthKey === thisMonth.getTime() ? today.getDate() : daily.length) : 1;
  const best = daily?.reduce<DayTotal | null>((top, d) => (d.amount > (top?.amount ?? 0) ? d : top), null) ?? null;
  const prevNet = prev ? prev.received - prev.expenses : null;
  const gap = prevNet === null ? 0 : net - prevNet;
  const maxDay = Math.max(1, ...(daily ?? []).map((d) => d.amount));
  const lead = daily ? daily[0].date.getDay() : 0;

  const nets = (months ?? []).map((m) => m.received - m.expenses);
  const bestMonth = months?.length ? months[nets.indexOf(Math.max(...nets))] : null;
  const maxAbs = Math.max(1, ...nets.map(Math.abs));

  return (
    <ScrollView
      contentContainerStyle={s.container}
      stickyHeaderIndices={[0]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
    >
      <View style={s.header}>
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
          <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.strip}>
            {strip_months.map((m) => (
              <View key={m.getTime()} onLayout={(e) => (stripX.current[m.getTime()] = e.nativeEvent.layout.x)}>
                <Chip
                  label={m.getMonth() === 0 || m.getTime() === strip_months[0].getTime() ? m.toLocaleDateString("en-PH", { month: "short", year: "numeric" }) : m.toLocaleDateString("en-PH", { month: "short" })}
                  selected={m.getTime() === monthKey}
                  onPress={() => {
                    setMonth(m);
                    setDay(null);
                  }}
                />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={[s.body, stale && s.stale]}>
        {day && (
          <View style={s.dayBar}>
            <Text style={s.dayBarText}>Viewing {formatDate(day)}</Text>
            <Chip label="Whole month" selected={false} onPress={() => setDay(null)} />
          </View>
        )}

        <View style={[s.hero, net < 0 && s.heroLoss]}>
          <View style={s.heroTop}>
            <Text style={s.heroLabel}>Net profit - {label}</Text>
            {prevNet !== null && (
              <View style={s.pill} accessible accessibilityLabel={gap === 0 ? `Same as ${monthOnly(addMonths(month, -1))}` : `${gap > 0 ? "Up" : "Down"} ${formatPHP(Math.abs(gap))} from ${monthOnly(addMonths(month, -1))}`}>
                <Icon name={gap > 0 ? "arrow-up" : gap < 0 ? "arrow-down" : "remove"} size={14} color={colors.primaryText} />
                <Text style={s.pillText}>
                  {gap === 0 ? "Same" : formatPHP(Math.abs(gap))} vs {monthOnly(addMonths(month, -1))}
                </Text>
              </View>
            )}
          </View>
          <CountUp value={net} style={s.heroValue} />
        </View>

        <View style={s.tiles}>
          <Tile label="Received" value={formatPHP(t.received)} />
          <Tile label="Expenses" value={formatPHP(t.expenses)} />
          <Tile label="Unpaid" value={formatPHP(t.unpaid)} tone={t.unpaid > 0 ? "bad" : undefined} />
        </View>

        {mode === "month" && daily && (
          <>
            <Card>
              <Text style={s.title} accessibilityRole="header">
                Pick a day
              </Text>
              <View style={s.weekRow}>
                {WEEK.map((w, i) => (
                  <Text key={i} style={s.weekDay} accessibilityElementsHidden importantForAccessibility="no">
                    {w}
                  </Text>
                ))}
              </View>
              <View style={s.grid}>
                {Array.from({ length: lead }, (_, i) => (
                  <View key={`b${i}`} style={s.cellWrap} />
                ))}
                {daily.map((d) => {
                  const picked = day !== null && d.date.getTime() === day.getTime();
                  const future = d.date.getTime() > today.getTime();
                  const isToday = d.date.getTime() === today.getTime();
                  return (
                    <View key={d.date.toISOString()} style={s.cellWrap}>
                      <Pressable
                        style={[s.cell, isToday && s.cellToday, picked && s.cellPicked, future && s.cellOff]}
                        disabled={future}
                        onPress={() => setDay(picked ? null : d.date)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: picked, disabled: future }}
                        accessibilityLabel={`${d.date.toDateString()}: ${formatPHP(d.amount)}`}
                      >
                        {d.amount > 0 && !picked && <View style={[s.heat, { opacity: 0.2 + 0.6 * (d.amount / maxDay) }]} />}
                        <Text style={[s.cellDay, picked && s.cellTextPicked]}>{d.date.getDate()}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <Text style={s.note}>{day ? `${formatDate(day)}: ${formatPHP(daily.find((d) => d.date.getTime() === day.getTime())?.amount ?? 0)} received` : "Greener days brought in more. Tap a day to see only that day."}</Text>
            </Card>

            <View style={s.tiles}>
              <Tile label="Sales" value={String(t.sales)} />
              {!day && <Tile label="Avg per day" value={formatPHP(t.received / daysCounted)} />}
              {!day && best && <Tile label="Best day" value={shortDay(best.date)} onPress={() => setDay(best.date)} />}
            </View>

            <ShortList title={`Expenses${on}`} count={expenses.length} empty="No expenses.">
              {expenses.map((e, i) => (
                <View key={i} style={s.row}>
                  <Text style={[s.line, s.grow]} numberOfLines={1}>
                    {e.description}
                  </Text>
                  <Text style={s.line}>{formatPHP(e.amount)}</Text>
                </View>
              ))}
            </ShortList>

            <ShortList title={`Who still owes${on}`} count={owes.length} empty="Nobody owes for this period.">
              {owes.map((o) => (
                <View key={o.name} style={s.row}>
                  <Text style={[s.line, s.grow]} numberOfLines={1}>
                    {o.name}
                  </Text>
                  <Text style={s.loss}>{formatPHP(o.total)}</Text>
                </View>
              ))}
            </ShortList>

            {t.received === 0 && t.expenses === 0 && t.unpaid === 0 && <Text style={s.note}>Nothing recorded in this period.</Text>}
          </>
        )}

        {mode === "all" && months && (
          <>
            {bestMonth && (
              <View style={s.tiles}>
                <Tile label="Best month" value={`${monthOnly(bestMonth.month)} ${formatPHP(bestMonth.received - bestMonth.expenses)}`} tone="good" />
                <Tile label="Average per month" value={formatPHP(nets.reduce((a, b) => a + b, 0) / nets.length)} />
              </View>
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
                    <View style={s.monthTop}>
                      <Text style={[s.line, s.grow]}>{monthName(m.month)}</Text>
                      {bestMonth && m.month.getTime() === bestMonth.month.getTime() && nets.length > 1 && <Badge label="Best" color={colors.success} />}
                      <Text style={mNet < 0 ? s.loss : s.good}>{formatPHP(mNet)}</Text>
                    </View>
                    <View style={s.track}>
                      <View style={[s.fill, { width: `${Math.max(2, (Math.abs(mNet) / maxAbs) * 100)}%`, backgroundColor: mNet < 0 ? colors.danger : colors.accent }]} />
                    </View>
                    <Text style={s.note}>
                      {formatPHP(m.received)} received - {formatPHP(m.expenses)} expenses
                    </Text>
                  </Pressable>
                );
              })}
            </Card>
          </>
        )}

        <Text style={s.note}>{plural(t.sales, "sale")} counted. Based on data on this phone. Sync first for the latest totals.</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  loading: { marginTop: space.xl },
  container: { paddingBottom: space.xl },
  header: { backgroundColor: colors.bg, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  strip: { gap: space.sm, paddingRight: space.lg },
  body: { padding: space.lg, gap: space.md },
  stale: { opacity: 0.5 },
  title: { fontSize: type.title, fontWeight: "700", color: colors.text, marginBottom: space.xs },
  line: { fontSize: type.body, color: colors.text },
  good: { color: colors.success, fontSize: type.body, fontWeight: "600" },
  loss: { color: colors.danger, fontSize: type.body, fontWeight: "600" },
  note: { color: colors.muted, fontSize: type.small },
  grow: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md, paddingVertical: space.xs },
  more: { minHeight: TOUCH, justifyContent: "center" },
  moreText: { color: colors.primary, fontSize: type.body, fontWeight: "600" },
  dayBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  dayBarText: { fontSize: type.body, fontWeight: "700", color: colors.text, flex: 1 },
  hero: { padding: space.lg, borderRadius: radius.md, backgroundColor: colors.success, gap: space.xs },
  heroLoss: { backgroundColor: colors.danger },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm, flexWrap: "wrap" },
  heroLabel: { fontSize: type.small, fontWeight: "700", color: colors.primaryText, textTransform: "uppercase", flexShrink: 1 },
  heroValue: { fontSize: type.hero, fontWeight: "800", color: colors.primaryText },
  pill: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: colors.primaryText },
  pillText: { fontSize: type.tiny, fontWeight: "700", color: colors.primaryText },
  tiles: { flexDirection: "row", gap: space.sm },
  tile: { flex: 1, padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 2, justifyContent: "center", minHeight: TOUCH },
  tileLabel: { fontSize: type.tiny, color: colors.muted, fontWeight: "600" },
  tileValue: { fontSize: type.body, fontWeight: "700", color: colors.text },
  weekRow: { flexDirection: "row", marginTop: space.xs },
  weekDay: { width: `${100 / 7}%`, textAlign: "center", fontSize: type.tiny, fontWeight: "700", color: colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", marginVertical: space.xs },
  cellWrap: { width: `${100 / 7}%`, height: 46, padding: 2 },
  cell: { flex: 1, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  cellToday: { borderColor: colors.primary, borderWidth: 2 },
  cellPicked: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellOff: { opacity: 0.35 },
  heat: { ...StyleSheet.absoluteFill, backgroundColor: colors.accent },
  cellDay: { fontSize: type.body, fontWeight: "700", color: colors.text },
  cellTextPicked: { color: colors.primaryText },
  monthRow: { gap: space.xs, paddingVertical: space.sm, minHeight: TOUCH },
  monthTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
});
