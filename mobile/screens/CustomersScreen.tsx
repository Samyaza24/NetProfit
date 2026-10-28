import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { CustomerSummary, listCustomerSummaries } from "../db/repo";

export default function CustomersScreen() {
  const [rows, setRows] = useState<CustomerSummary[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listCustomerSummaries().then(setRows);
  }, []);

  const shown = rows.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View style={styles.container}>
      <TextInput style={styles.search} placeholder="Search customers" value={query} onChangeText={setQuery} />
      <Text style={styles.count}>{shown.length} customers</Text>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.empty}>No customers yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text>
              {item.total_visits} visits - paid {item.lifetime_value.toFixed(2)} PHP
            </Text>
            {item.outstanding_debt > 0 && (
              <Text style={styles.debt}>Owes {item.outstanding_debt.toFixed(2)} PHP</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10 },
  count: { marginVertical: 8, color: "#666" },
  empty: { textAlign: "center", marginTop: 24, color: "#666" },
  card: { padding: 12, borderRadius: 8, backgroundColor: "#f5f5f5", marginBottom: 8 },
  name: { fontWeight: "bold", fontSize: 16 },
  debt: { color: "#b00020", fontWeight: "600" },
});
