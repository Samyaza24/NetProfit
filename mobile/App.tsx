import { useEffect, useState } from "react";
import { Platform, Pressable, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import PairScreen from "./screens/PairScreen";
import TransactionScreen from "./screens/TransactionScreen";
import ExpenseScreen from "./screens/ExpenseScreen";
import SyncScreen from "./screens/SyncScreen";
import HistoryScreen from "./screens/HistoryScreen";
import { isPaired } from "./sync/syncClient";

type Screen = "pair" | "transaction" | "expense" | "sync" | "history";

const TABS: [Screen, string][] = [
  ["transaction", "Transaction"],
  ["expense", "Expense"],
  ["sync", "Sync"],
  ["history", "History"],
];

export default function App() {
  const [paired, setPaired] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<Screen>("transaction");

  useEffect(() => {
    isPaired().then(setPaired);
  }, []);

  function requireRePair() {
    setPaired(false);
  }

  if (paired === null) return <View style={styles.root} />;

  if (!paired) {
    return (
      <SafeAreaView style={styles.root}>
        <PairScreen onPaired={() => setPaired(true)} />
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.nav}>
        {TABS.map(([key, label]) => (
          <Pressable key={key} style={[styles.tab, screen === key && styles.tabActive]} onPress={() => setScreen(key)}>
            <Text style={[styles.tabText, screen === key && styles.tabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.body}>
        {screen === "transaction" && <TransactionScreen />}
        {screen === "expense" && <ExpenseScreen />}
        {screen === "sync" && <SyncScreen onNeedsRePair={requireRePair} />}
        {screen === "history" && <HistoryScreen />}
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff", paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 0 : 0 },
  nav: { flexDirection: "row", gap: 6, padding: 8, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", backgroundColor: "#eee" },
  tabActive: { backgroundColor: "#1f6fb2" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#333" },
  tabTextActive: { color: "#fff" },
  body: { flex: 1 },
});
