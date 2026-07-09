import { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { getMeta } from "../db/schema";
import { AuthError, syncNow } from "../sync/syncClient";

interface Props {
  onNeedsRePair: () => void;
}

export default function SyncScreen({ onNeedsRePair }: Props) {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMeta("last_synced_at").then(setLastSynced);
  }, []);

  async function handleSync() {
    setBusy(true);
    try {
      const result = await syncNow();
      setLastSynced(await getMeta("last_synced_at"));
      Alert.alert(
        "Sync complete",
        `Pushed: ${result.pushed.transactions} transactions, ${result.pushed.expenses} expenses, ${result.pushed.customers} customers.\n` +
          `Pulled: ${result.pulled.transactions} transactions, ${result.pulled.expenses} expenses, ${result.pulled.customers} customers.`
      );
    } catch (e) {
      if (e instanceof AuthError) {
        Alert.alert("Device not authorized", "Please re-pair this phone.", [
          { text: "Re-pair", onPress: onNeedsRePair },
        ]);
      } else {
        Alert.alert("Sync failed", String(e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text>Last synced: {lastSynced ?? "Never"}</Text>
      <Button title={busy ? "Syncing..." : "Sync Now"} onPress={handleSync} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 16 },
});
