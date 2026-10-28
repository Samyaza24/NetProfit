import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { countUnsynced } from "../db/repo";
import { colors, space, type } from "./theme";

// Always-visible sync state; polls the local count since writes happen on many screens.
export default function StatusStrip({ onPress }: { onPress: () => void }) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const load = () => countUnsynced().then(setPending);
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  const color = pending ? colors.warning : colors.success;
  const label = pending ? `${pending} pending - tap to sync` : "All synced";

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={s.strip}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.surface },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { fontSize: type.small, fontWeight: "600" },
});
