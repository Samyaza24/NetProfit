import { useState } from "react";
import { KeyboardAvoidingView, StyleSheet, View } from "react-native";
import { Segmented } from "../ui/components";
import { space } from "../ui/theme";
import TransactionScreen from "./TransactionScreen";
import ExpenseScreen from "./ExpenseScreen";

type Mode = "sale" | "expense";

export default function RecordScreen() {
  const [mode, setMode] = useState<Mode>("sale");
  // Both forms stay mounted so a half-typed sale survives a look at the expense form. Padding for the
  // keyboard is applied here because edge-to-edge Android no longer resizes the window by itself.
  return (
    <KeyboardAvoidingView style={s.container} behavior="padding">
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
      <View style={[s.form, mode !== "sale" && s.hidden]}>
        <TransactionScreen />
      </View>
      <View style={[s.form, mode !== "expense" && s.hidden]}>
        <ExpenseScreen />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  switch: { paddingHorizontal: space.lg, paddingTop: space.md },
  form: { flex: 1 },
  hidden: { display: "none" },
});
