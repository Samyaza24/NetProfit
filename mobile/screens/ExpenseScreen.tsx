import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createExpense, listRecentDescriptions } from "../db/repo";
import { Button, Chip } from "../ui/components";
import { colors, formatPHP, radius, space, TOUCH, type } from "../ui/theme";
import { useToast } from "../ui/Toast";

export default function ExpenseScreen() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [toast, showToast] = useToast();

  useEffect(() => {
    listRecentDescriptions().then(setRecent);
  }, []);

  async function submit() {
    const parsedAmount = Number(amount);
    if (!description.trim() || !(parsedAmount > 0)) {
      Alert.alert("Enter a description and a positive amount");
      return;
    }
    await createExpense(description.trim(), parsedAmount);
    showToast(`Saved - ${description.trim()}, ${formatPHP(parsedAmount)}`);
    setDescription("");
    setAmount("");
    listRecentDescriptions().then(setRecent);
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
      <Button title="Save expense" onPress={submit} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  label: { fontSize: type.small, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  input: { minHeight: TOUCH, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: type.body },
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
