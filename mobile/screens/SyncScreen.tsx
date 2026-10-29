import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { countUnsynced, parseTs } from "../db/repo";
import { getMeta } from "../db/schema";
import { shortAddress } from "../lib/address";
import { friendlyError } from "../lib/errors";
import { formatDateTime, plural } from "../lib/format";
import { AuthError, isSyncing, SyncResult, syncNow } from "../sync/syncClient";
import { Button, Card } from "../ui/components";
import Icon from "../ui/Icon";
import { colors, space, type } from "../ui/theme";
import ExportCard from "./ExportCard";
import ResetCard from "./ResetCard";

interface Props {
  active?: boolean;
  onNeedsRePair: () => void;
}

type Outcome = { kind: "ok"; result: SyncResult } | { kind: "auth" } | { kind: "error"; message: string; details: string };

export default function SyncScreen({ active = true, onNeedsRePair }: Props) {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [server, setServer] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function refresh() {
    setServer(await getMeta("server_url"));
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

  // Refresh the counts every time the tab is shown; join a sync that is already running.
  useEffect(() => {
    if (!active) return;
    refresh();
    if (isSyncing()) handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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
          Last synced: {lastSynced ? formatDateTime(parseTs(lastSynced)) : "Never"}
        </Text>
      </Card>

      <Button title="Sync now" icon="sync" onPress={handleSync} loading={busy} />

      {outcome?.kind === "ok" && (
        <Card>
          <Text style={s.ok}>Sync complete</Text>
          {outcome.result.wasReset && (
            <Text style={s.line}>The data was reset on the PC, so this phone erased its old copy and started fresh.</Text>
          )}
          <Text style={s.line}>
            Sent: {plural(outcome.result.pushed.transactions, "sale")}, {plural(outcome.result.pushed.expenses, "expense")},{" "}
            {plural(outcome.result.pushed.customers, "client")}
          </Text>
          <Text style={s.line}>
            Received: {plural(outcome.result.pulled.transactions, "sale")}, {plural(outcome.result.pulled.expenses, "expense")},{" "}
            {plural(outcome.result.pulled.customers, "client")}
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

      <Card>
        <Text style={s.big} accessibilityRole="header">
          This PC
        </Text>
        <Text style={s.line} selectable>
          {server ? shortAddress(server) : "Not paired"}
        </Text>
        <Text style={s.muted}>
          If the PC's Wi-Fi or address changed and sync cannot connect, pair again with the QR code on the PC. Records on this
          phone are kept.
        </Text>
        <Button
          title="Pair again"
          variant="secondary"
          onPress={() =>
            Alert.alert("Pair this phone again?", "Only pair with your shop PC. Records on this phone stay and sync after pairing.", [
              { text: "Cancel", style: "cancel" },
              { text: "Pair again", onPress: onNeedsRePair },
            ])
          }
        />
      </Card>

      <ExportCard />
      <ResetCard />
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
