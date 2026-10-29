import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { onDataChange } from "../db/events";
import { countUnsynced } from "../db/repo";
import Icon from "./Icon";
import Logo from "./Logo";
import { Palette, space, TOUCH, type } from "./theme";
import { useTheme, useStyles } from "./ThemeContext";
import { useReducedMotion } from "./useReducedMotion";

// Brand plus always-visible sync state; recounts whenever local data changes.
export default function StatusStrip({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const s = useStyles(makeStyles);
  const [pending, setPending] = useState(0);
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const load = () => countUnsynced().then(setPending, () => undefined);
    load();
    return onDataChange(load);
  }, []);

  // Gentle pulse only while something is waiting to sync.
  useEffect(() => {
    if (!pending || reduced) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pending, reduced, pulse]);

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
        <Animated.View style={{ opacity: pulse }}>
          <Icon name={pending ? "cloud-upload-outline" : "cloud-done-outline"} size={20} color={color} />
        </Animated.View>
        <Text style={[s.text, { color }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  status: { minHeight: TOUCH, flexDirection: "row", alignItems: "center", gap: space.sm, paddingLeft: space.md },
  text: { fontSize: type.small, fontWeight: "600" },
});
