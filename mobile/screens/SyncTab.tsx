import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Segmented } from "../ui/components";
import { space } from "../ui/theme";
import SyncScreen from "./SyncScreen";
import HistoryScreen from "./HistoryScreen";

type Mode = "sync" | "history";

export default function SyncTab({ onNeedsRePair }: { onNeedsRePair: () => void }) {
  const [mode, setMode] = useState<Mode>("sync");
  return (
    <View style={s.container}>
      <View style={s.switch}>
        <Segmented
          options={[
            ["sync", "Sync"],
            ["history", "History"],
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>
      {mode === "sync" ? <SyncScreen onNeedsRePair={onNeedsRePair} /> : <HistoryScreen />}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  switch: { paddingHorizontal: space.lg, paddingTop: space.md },
});
