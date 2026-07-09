import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Expense, listRecentExpenses, listRecentTransactions, Transaction } from "../db/repo";

export default function HistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    listRecentTransactions().then(setTransactions);
    listRecentExpenses().then(setExpenses);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Transactions</Text>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Text>
            {item.timestamp.slice(0, 16)} - {item.amount_received} PHP ({item.status})
            {item.synced ? "" : " [pending]"}
          </Text>
        )}
      />
      <Text style={styles.header}>Expenses</Text>
      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Text>
            {item.timestamp.slice(0, 16)} - {item.description}: {item.amount} PHP
            {item.synced ? "" : " [pending]"}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontWeight: "bold", marginTop: 12, marginBottom: 4 },
});
