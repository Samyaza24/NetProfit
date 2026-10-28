import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { countUnsynced } from "../db/repo";
import Logo from "./Logo";
import { colors, space, type } from "./theme";

// Brand plus always-visible sync state; polls the local count since writes happen on many screens.
export default function StatusStrip({ onPress }: { onPress: () => void }) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const load = () => countUnsynced().then(setPending);
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  const color = pending ? colors.warning : colors.success;
  const label = pending ? `${pending} pending` : "All synced";

  return (
    <View style={s.strip}>
      <Logo height={26} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pending ? `${pending} pending, tap to sync` : "All synced"}
        onPress={onPress}
        style={s.status}
      >
        <View style={[s.dot, { backgroundColor: color }]} />
        <Text style={[s.text, { color }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  status: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: space.sm, paddingLeft: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  text: { fontSize: type.small, fontWeight: "600" },
});
