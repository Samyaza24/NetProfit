import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Segmented } from "../ui/components";
import { space } from "../ui/theme";
import TransactionScreen from "./TransactionScreen";
import ExpenseScreen from "./ExpenseScreen";

type Mode = "sale" | "expense";

export default function RecordScreen() {
  const [mode, setMode] = useState<Mode>("sale");
  return (
    <View style={s.container}>
      <View style={s.switch}>
        <Segmented
          options={[
            ["sale", "Sale"],
            ["expense", "Expense"],
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>
      {mode === "sale" ? <TransactionScreen /> : <ExpenseScreen />}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  switch: { paddingHorizontal: space.lg, paddingTop: space.md },
});
