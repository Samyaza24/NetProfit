import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { createLocalCustomer, createTransaction, findCustomerByName } from "../db/repo";

const TIERS: { label: string; days: number; amount: number }[] = [
  { label: "1 Day - 20 PHP", days: 1, amount: 20 },
  { label: "5 Days - 50 PHP", days: 5, amount: 50 },
  { label: "7 Days - 70 PHP", days: 7, amount: 70 },
  { label: "1 Month - 200 PHP", days: 30, amount: 200 },
];

export default function TransactionScreen() {
  const [name, setName] = useState("");
  const [tier, setTier] = useState(TIERS[0]);
  const [paid, setPaid] = useState(true);

  async function submit() {
    if (!name.trim()) {
      Alert.alert("Enter a customer name");
      return;
    }
    let customer = await findCustomerByName(name.trim());
    if (!customer) customer = await createLocalCustomer(name.trim());
    await createTransaction(customer.id, tier.amount, tier.days, paid ? "Paid" : "Unpaid");
    Alert.alert("Saved", `${name} recorded (${paid ? "Paid" : "Unpaid"}), synced on next Sync Now.`);
    setName("");
  }

  return (
    <View style={styles.container}>
      <Text>Customer Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Juan Dela Cruz" />
      <Text>Tier</Text>
      {TIERS.map((t) => (
        <Button
          key={t.label}
          title={(tier.label === t.label ? "> " : "") + t.label}
          onPress={() => setTier(t)}
        />
      ))}
      <Button title={paid ? "Status: Paid" : "Status: Unpaid"} onPress={() => setPaid(!paid)} />
      <Button title="Save Transaction" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 4 },
});
