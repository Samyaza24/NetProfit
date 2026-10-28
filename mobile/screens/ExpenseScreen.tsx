import { ComponentRef, useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createExpense, listRecentDescriptions } from "../db/repo";
import { friendlyError } from "../lib/errors";
import { parseAmount } from "../lib/money";
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
  const amountInput = useRef<ComponentRef<typeof TextInput>>(null);
  const [toast, showToast] = useToast();

  useEffect(() => {
    listRecentDescriptions().then(setRecent);
  }, []);

  async function submit() {
    if (busy.current) return; // a ref, so a fast double tap cannot save twice
    const parsedAmount = parseAmount(amount);
    if (!description.trim()) {
      setError("Type what the money was spent on.");
      return;
    }
    if (parsedAmount === null) {
      setError("Enter an amount like 200 or 1,200.50.");
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
    <View style={s.root}>
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={s.label}>Description</Text>
      <TextInput
        style={s.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Wifi Bill"
        autoCorrect={false}
        maxLength={100}
        returnKeyType="next"
        onSubmitEditing={() => amountInput.current?.focus()}
        accessibilityLabel="Expense description"
      />
      {recent.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.chips}>
          {recent.map((d) => (
            <Chip key={d} label={d} selected={description === d} onPress={() => setDescription(d)} />
          ))}
        </ScrollView>
      )}
      <Text style={s.label}>Amount (PHP)</Text>
      <TextInput
        ref={amountInput}
        style={s.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="200"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        accessibilityLabel="Expense amount"
      />
      {error && (
        <Text style={s.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Button title="Save expense" icon="checkmark" onPress={submit} loading={saving} />
    </ScrollView>
    {toast}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: space.lg, gap: space.md },
  label: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body, color: colors.text },
  chips: { flexDirection: "row", gap: space.sm },
  error: { color: colors.danger, fontSize: type.body, fontWeight: "600" },
});
