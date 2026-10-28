import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createExpense, listRecentDescriptions } from "../db/repo";
import { friendlyError } from "../lib/errors";
import { Button, Chip } from "../ui/components";
import { colors, formatPHP, radius, space, TOUCH, type } from "../ui/theme";
import { useToast } from "../ui/Toast";

export default function ExpenseScreen() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [toast, showToast] = useToast();

  useEffect(() => {
    listRecentDescriptions().then(setRecent);
  }, []);

  async function submit() {
    if (busy.current) return; // a ref, so a fast double tap cannot save twice
    const parsedAmount = Number(amount);
    if (!description.trim() || !(parsedAmount > 0)) {
      setError("Enter a description and an amount above zero.");
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await createExpense(description.trim(), parsedAmount);
      showToast(`Saved - ${description.trim()}, ${formatPHP(parsedAmount)}`);
      setDescription("");
      setAmount("");
      listRecentDescriptions().then(setRecent);
    } catch (e) {
      setError(friendlyError(e).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Description</Text>
      <TextInput
        style={s.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Cable ties"
        accessibilityLabel="Expense description"
      />
      {recent.length > 0 && (
        <View style={s.row}>
          {recent.map((d) => (
            <Chip key={d} label={d} selected={description === d} onPress={() => setDescription(d)} />
          ))}
        </View>
      )}
      <Text style={s.label}>Amount (PHP)</Text>
      <TextInput
        style={s.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="200"
        accessibilityLabel="Expense amount"
      />
      {toast}
      {error && (
        <Text style={s.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Button title="Save expense" icon="checkmark" onPress={submit} loading={saving} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  label: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  error: { color: colors.danger, fontSize: type.body, fontWeight: "600" },
});
