import { ComponentRef, useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createExpense, listRecentDescriptions } from "../db/repo";
import { friendlyError } from "../lib/errors";
import { parseAmount } from "../lib/money";
import { Button, Chip, Summary } from "../ui/components";
import ConfirmDialog from "../ui/ConfirmDialog";
import { formatPHP, Palette, radius, space, TOUCH, type } from "../ui/theme";
import { useStyles, useTheme } from "../ui/ThemeContext";
import { useToast } from "../ui/Toast";

export default function ExpenseScreen() {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const [review, setReview] = useState<number | null>(null); // the amount waiting for confirmation
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

  // Step 1: check the form and show the summary; nothing is saved until the operator confirms.
  function ask() {
    const parsedAmount = parseAmount(amount);
    if (!description.trim()) {
      setError("Type what the money was spent on.");
      return;
    }
    if (parsedAmount === null) {
      setError("Enter an amount like 200 or 1,200.50.");
      return;
    }
    setError(null);
    Keyboard.dismiss();
    setReview(parsedAmount);
  }

  // Step 2: confirmed. The ref keeps a fast double tap from saving twice.
  async function save() {
    if (busy.current || review === null) return;
    busy.current = true;
    setSaving(true);
    try {
      await createExpense(description.trim(), review);
      showToast(`Saved - ${description.trim()}, ${formatPHP(review)}`);
      setReview(null);
      setDescription("");
      setAmount("");
      listRecentDescriptions().then(setRecent);
    } catch (e) {
      setReview(null);
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
        placeholderTextColor={colors.placeholder}
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
        placeholderTextColor={colors.placeholder}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        accessibilityLabel="Expense amount"
      />
      {error && (
        <Text style={s.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Button title="Save expense" icon="checkmark" onPress={ask} loading={saving} />
    </ScrollView>
    {toast}

    <ConfirmDialog
      visible={review !== null}
      title="Save this expense?"
      confirmLabel="Confirm and save"
      icon="checkmark-circle-outline"
      busy={saving}
      onConfirm={save}
      onCancel={() => setReview(null)}
    >
      <Summary rows={[["Description", description.trim()], ["Amount", formatPHP(review ?? 0)]]} />
    </ConfirmDialog>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: { flex: 1 },
  container: { padding: space.lg, gap: space.md },
  label: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body, color: colors.text },
  chips: { flexDirection: "row", gap: space.sm },
  error: { color: colors.danger, fontSize: type.body, fontWeight: "600" },
});
