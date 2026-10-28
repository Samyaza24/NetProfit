import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { countUnsynced, parseTs } from "../db/repo";
import { getMeta } from "../db/schema";
import { friendlyError } from "../lib/errors";
import { AuthError, isSyncing, SyncResult, syncNow } from "../sync/syncClient";
import { Button, Card } from "../ui/components";
import Icon from "../ui/Icon";
import { colors, space, type } from "../ui/theme";

interface Props {
  onNeedsRePair: () => void;
}

type Outcome = { kind: "ok"; result: SyncResult } | { kind: "auth" } | { kind: "error"; message: string; details: string };

export default function SyncScreen({ onNeedsRePair }: Props) {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function refresh() {
    setLastSynced(await getMeta("last_synced_at"));
    setPending(await countUnsynced());
  }

  // syncNow() returns the sync already in progress, so this never starts a second one.
  async function handleSync() {
    setBusy(true);
    setOutcome(null);
    try {
      setOutcome({ kind: "ok", result: await syncNow() });
    } catch (e) {
      setOutcome(e instanceof AuthError ? { kind: "auth" } : { kind: "error", ...friendlyError(e) });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  useEffect(() => {
    refresh();
    if (isSyncing()) handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Card>
        <Icon
          name={pending ? "cloud-upload-outline" : "cloud-done-outline"}
          size={44}
          color={pending ? colors.warning : colors.success}
        />
        <Text style={s.big}>{pending ? `${pending} waiting to sync` : "Everything is synced"}</Text>
        <Text style={s.muted}>
          Last synced: {lastSynced ? parseTs(lastSynced).toLocaleString() : "Never"}
        </Text>
      </Card>

      <Button title="Sync now" icon="sync" onPress={handleSync} loading={busy} />

      {outcome?.kind === "ok" && (
        <Card>
          <Text style={s.ok}>Sync complete</Text>
          <Text style={s.line}>
            Sent: {outcome.result.pushed.transactions} sales, {outcome.result.pushed.expenses} expenses,{" "}
            {outcome.result.pushed.customers} clients
          </Text>
          <Text style={s.line}>
            Received: {outcome.result.pulled.transactions} sales, {outcome.result.pulled.expenses} expenses,{" "}
            {outcome.result.pulled.customers} clients
          </Text>
        </Card>
      )}

      {outcome?.kind === "auth" && (
        <Card>
          <Text style={s.err}>This phone is no longer authorized.</Text>
          <Text style={s.line}>Pair it again with the QR code on your PC.</Text>
          <Button title="Re-pair" onPress={onNeedsRePair} />
        </Card>
      )}

      {outcome?.kind === "error" && (
        <Card>
          <Text style={s.err} accessibilityRole="alert">
            Could not sync
          </Text>
          <Text style={s.line}>{outcome.message}</Text>
          <Text style={s.muted}>Details: {outcome.details}</Text>
          <Button title="Try again" variant="secondary" onPress={handleSync} />
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  big: { fontSize: type.title, fontWeight: "700", color: colors.text },
  line: { fontSize: type.body, color: colors.text },
  muted: { fontSize: type.small, color: colors.muted },
  ok: { fontSize: type.title, fontWeight: "700", color: colors.success },
  err: { fontSize: type.title, fontWeight: "700", color: colors.danger },
});
