import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { createExpense } from "../db/repo";

export default function ExpenseScreen() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  async function submit() {
    const parsedAmount = Number(amount);
    if (!description.trim() || !parsedAmount || parsedAmount <= 0) {
      Alert.alert("Enter a description and a positive amount");
      return;
    }
    await createExpense(description.trim(), parsedAmount);
    Alert.alert("Saved", "Expense recorded, synced on next Sync Now.");
    setDescription("");
    setAmount("");
  }

  return (
    <View style={styles.container}>
      <Text>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Cable ties"
      />
      <Text>Amount (PHP)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="200"
      />
      <Button title="Save Expense" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 4 },
});
