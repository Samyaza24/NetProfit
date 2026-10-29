import { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { friendlyError } from "../lib/errors";
import { resetEverything } from "../sync/syncClient";
import { Button, Card } from "../ui/components";
import { colors, radius, space, TOUCH, type } from "../ui/theme";

const WORD = "RESET";

// Start from scratch: erases all shop data on the PC and on this phone. Typing RESET is required.
export default function ResetCard() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setError(null);
  }

  async function confirm() {
    if (typed !== WORD || busy) return;
    setBusy(true);
    setError(null);
    try {
      await resetEverything();
      setOpen(false);
      setTyped("");
      setDone(true);
    } catch (e) {
      setError(friendlyError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={s.title} accessibilityRole="header">
        Start from scratch
      </Text>
      <Text style={s.muted}>
        Erases all clients, sales and expenses on the PC and on every phone. Phones stay paired. Back up first if you
        need the records.
      </Text>
      <Button
        title="Reset all data"
        icon="trash-outline"
        variant="danger"
        onPress={() => {
          setDone(false);
          setOpen(true);
        }}
      />
      {done && (
        <Text style={s.ok} accessibilityRole="alert">
          Everything was erased. You can start fresh. Other phones erase their copy the next time they sync.
        </Text>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={s.backdrop}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle} accessibilityRole="header">
              Erase everything?
            </Text>
            <Text style={s.body}>
              This permanently deletes every client, sale and expense on the PC and on this phone. Other phones erase
              theirs on their next sync, including anything they have not synced yet. This cannot be undone.
            </Text>
            <Text style={s.body}>Type {WORD} to confirm.</Text>
            <TextInput
              style={s.input}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={WORD}
              placeholderTextColor={colors.placeholder}
              accessibilityLabel={`Type ${WORD} to confirm`}
            />
            {error && (
              <Text style={s.error} accessibilityRole="alert">
                {error}
              </Text>
            )}
            <Button title="Erase everything" variant="danger" onPress={confirm} loading={busy} disabled={typed !== WORD} />
            <Button title="Cancel" variant="secondary" onPress={close} disabled={busy} />
          </View>
        </View>
      </Modal>
    </Card>
  );
}

const s = StyleSheet.create({
  title: { fontSize: type.title, fontWeight: "700", color: colors.text },
  muted: { fontSize: type.small, color: colors.muted, marginBottom: space.xs },
  ok: { fontSize: type.small, color: colors.success, fontWeight: "600" },
  error: { fontSize: type.body, color: colors.danger, fontWeight: "600" },
  backdrop: { flex: 1, justifyContent: "center", padding: space.lg, backgroundColor: "rgba(8, 19, 29, 0.55)" },
  dialog: { gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.bg },
  dialogTitle: { fontSize: type.big, fontWeight: "700", color: colors.text },
  body: { fontSize: type.body, color: colors.text },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body, color: colors.text },
});
