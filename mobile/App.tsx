import { useEffect, useState } from "react";
import { Button, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import PairScreen from "./screens/PairScreen";
import TransactionScreen from "./screens/TransactionScreen";
import ExpenseScreen from "./screens/ExpenseScreen";
import SyncScreen from "./screens/SyncScreen";
import HistoryScreen from "./screens/HistoryScreen";
import { isPaired } from "./sync/syncClient";

type Screen = "pair" | "transaction" | "expense" | "sync" | "history";

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
        <Button title="Transaction" onPress={() => setScreen("transaction")} />
        <Button title="Expense" onPress={() => setScreen("expense")} />
        <Button title="Sync" onPress={() => setScreen("sync")} />
        <Button title="History" onPress={() => setScreen("history")} />
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
  root: { flex: 1, backgroundColor: "#fff" },
  nav: { flexDirection: "row", justifyContent: "space-around", padding: 8 },
  body: { flex: 1 },
});
