import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { countUnsynced, parseTs } from "../db/repo";
import { getMeta } from "../db/schema";
import { AuthError, SyncResult, syncNow } from "../sync/syncClient";
import { Button, Card } from "../ui/components";
import { colors, space, type } from "../ui/theme";

interface Props {
  onNeedsRePair: () => void;
}

type Outcome = { kind: "ok"; result: SyncResult } | { kind: "auth" } | { kind: "error"; message: string };

export default function SyncScreen({ onNeedsRePair }: Props) {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function refresh() {
    setLastSynced(await getMeta("last_synced_at"));
    setPending(await countUnsynced());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSync() {
    setBusy(true);
    setOutcome(null);
    try {
      setOutcome({ kind: "ok", result: await syncNow() });
    } catch (e) {
      setOutcome(e instanceof AuthError ? { kind: "auth" } : { kind: "error", message: String(e) });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Card>
        <Text style={s.big}>{pending ? `${pending} waiting to sync` : "Everything is synced"}</Text>
        <Text style={s.muted}>
          Last synced: {lastSynced ? parseTs(lastSynced).toLocaleString() : "Never"}
        </Text>
      </Card>

      <Button title={busy ? "Syncing..." : "Sync now"} onPress={handleSync} loading={busy} />

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
          <Text style={s.err}>Could not sync</Text>
          <Text style={s.line}>Check that the PC is on and this phone is on the same Wi-Fi.</Text>
          <Text style={s.muted}>{outcome.message}</Text>
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
