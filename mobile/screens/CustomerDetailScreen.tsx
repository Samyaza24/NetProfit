import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { CustomerSummary, getCustomer, listCustomerTransactions, markTransactionPaid, parseTs, setCustomerStatus, Transaction } from "../db/repo";
import { connectionOf, cutoffText } from "../lib/connection";
import { friendlyError } from "../lib/errors";
import { formatDateTime, plural, tierName } from "../lib/format";
import { Badge, Button, Card, EmptyState, ErrorState } from "../ui/components";
import ConfirmDialog from "../ui/ConfirmDialog";
import { formatPHP, Palette, space, type } from "../ui/theme";
import { useStyles, useTheme } from "../ui/ThemeContext";
import { useLoad } from "../ui/useLoad";

interface Props {
  customer: CustomerSummary;
  onBack: () => void;
  // Opens the sale form with this client and the given plan (days) filled in.
  onSellAgain?: (days: number) => void;
}

// The change waiting for the operator's confirmation.
type Ask = { kind: "status"; status: "Active" | "Disabled" } | { kind: "paid"; txn: Transaction };

export default function CustomerDetailScreen({ customer, onBack, onSellAgain }: Props) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fetchData = useCallback(async () => {
    const [rows, c] = await Promise.all([listCustomerTransactions(customer.id), getCustomer(customer.id)]);
    return { rows, manualAt: c?.status === "Disabled" ? parseTs(c.updated_at).getTime() : null };
  }, [customer.id]);
  const { data, error, reload: load } = useLoad(fetchData);
  const rows: Transaction[] = data?.rows ?? [];
  const manualAt = data?.manualAt ?? null;

  // Runs a change, then reloads; a failure tells the operator instead of failing silently.
  async function run(change: () => Promise<void>) {
    setAsk(null);
    try {
      await change();
      setActionError(null);
      load();
    } catch (e) {
      setActionError(friendlyError(e).message);
    }
  }

  // Totals come from the loaded rows so they update right after marking something paid.
  const paid = rows.filter((r) => r.status === "Paid").reduce((sum, r) => sum + r.amount_received, 0);
  const owes = rows.filter((r) => r.status === "Unpaid").reduce((sum, r) => sum + r.amount_received, 0);
  const conn = connectionOf(rows.map((r) => ({ at: parseTs(r.timestamp).getTime(), days: r.duration_days })), undefined, manualAt);

  if (!data) {
    return (
      <View style={s.container}>
        <Button title="Back to clients" icon="chevron-back" variant="secondary" onPress={onBack} />
        {error ? <ErrorState message={error} onRetry={load} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const cutting = ask?.kind === "status" && ask.status === "Disabled";

  return (
    <View style={s.container}>
      <Button title="Back to clients" icon="chevron-back" variant="secondary" onPress={onBack} />
      <Card>
        <Text style={s.name} accessibilityRole="header">
          {customer.name}
        </Text>
        <Text style={[s.line, s.status, conn.state === "connected" ? { color: colors.success } : conn.state === "cutoff" ? { color: colors.warning } : null]}>
          Wi-Fi: {conn.state === "connected" ? "Connected" : conn.state === "cutoff" ? "Cut off" : "No plan"}
        </Text>
        <Text style={s.line}>{cutoffText(conn)}</Text>
        <Text style={s.line}>{plural(rows.length, "visit")}</Text>
        <Text style={s.line}>Total spent: {formatPHP(paid)}</Text>
        {owes > 0 && <Text style={s.debt}>Owes {formatPHP(owes)}</Text>}
      </Card>
      {actionError && (
        <Text style={s.error} accessibilityRole="alert">
          Could not save the change: {actionError}
        </Text>
      )}
      {onSellAgain && rows.length > 0 && (
        <Button title={`Sell again - ${tierName(rows[0].duration_days)}`} icon="add-circle-outline" onPress={() => onSellAgain(rows[0].duration_days)} />
      )}
      {conn.state === "connected" && <Button title="Cut off now" icon="close-circle-outline" variant="secondary" onPress={() => setAsk({ kind: "status", status: "Disabled" })} />}
      {conn.manual && <Button title="Reconnect" icon="checkmark-circle-outline" onPress={() => setAsk({ kind: "status", status: "Active" })} />}
      {conn.state === "cutoff" && !conn.manual && <Text style={s.muted}>The plan has ended. Buying a new plan reconnects them.</Text>}
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={<EmptyState text="No transactions yet." />}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>{tierName(item.duration_days)}</Text>
              <Text style={s.muted}>
                {formatDateTime(parseTs(item.timestamp))}
                {item.synced ? "" : " - pending"}
              </Text>
            </View>
            <View style={s.rowEnd}>
              <Text style={s.rowTitle}>{formatPHP(item.amount_received)}</Text>
              {item.status === "Paid" ? (
                <Badge label="Paid" color={colors.success} />
              ) : (
                <Button title="Mark paid" icon="checkmark-circle-outline" variant="secondary" onPress={() => setAsk({ kind: "paid", txn: item })} />
              )}
            </View>
          </View>
        )}
      />

      <ConfirmDialog
        visible={ask?.kind === "status"}
        title={cutting ? `Cut off ${customer.name}?` : `Reconnect ${customer.name}?`}
        confirmLabel={cutting ? "Cut off now" : "Reconnect"}
        tone={cutting ? "danger" : "primary"}
        onConfirm={() => ask?.kind === "status" && run(() => setCustomerStatus(customer.id, ask.status))}
        onCancel={() => setAsk(null)}
      >
        {cutting
          ? "This marks them as cut off in NetProfit right now. You still need to disconnect them on your Wi-Fi router. Buying a new plan reconnects them automatically."
          : "This undoes the manual cut-off, so their status follows their plan again. Remember to turn their Wi-Fi back on in your router."}
      </ConfirmDialog>
      <ConfirmDialog
        visible={ask?.kind === "paid"}
        title="Mark as paid?"
        confirmLabel="Mark paid"
        icon="checkmark-circle-outline"
        onConfirm={() => ask?.kind === "paid" && run(() => markTransactionPaid(ask.txn.id))}
        onCancel={() => setAsk(null)}
      >
        {ask?.kind === "paid" ? `${tierName(ask.txn.duration_days)} - ${formatPHP(ask.txn.amount_received)}. This cannot be undone.` : ""}
      </ConfirmDialog>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, padding: space.lg, gap: space.md },
    name: { fontSize: type.big, fontWeight: "700", color: colors.text },
    line: { fontSize: type.body, color: colors.text },
    status: { fontWeight: "700" },
    debt: { fontSize: type.body, fontWeight: "700", color: colors.danger },
    error: { fontSize: type.body, fontWeight: "600", color: colors.danger },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowMain: { flex: 1 },
    rowEnd: { alignItems: "flex-end", gap: space.xs },
    rowTitle: { fontSize: type.body, fontWeight: "600", color: colors.text },
    muted: { fontSize: type.small, color: colors.muted },
  });
