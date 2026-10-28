import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space, TOUCH, type } from "./theme";

interface Props<T extends string> {
  tabs: [T, string][];
  active: T;
  onChange: (key: T) => void;
}

export default function TabBar<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <View style={s.bar}>
      {tabs.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: key === active }}
          onPress={() => onChange(key)}
          style={s.tab}
        >
          <View style={[s.indicator, key === active && s.indicatorActive]} />
          <Text style={[s.label, key === active && s.labelActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  // Extra bottom padding on Android keeps tabs clear of the gesture bar.
  bar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg, paddingBottom: Platform.OS === "android" ? space.lg : 0 },
  tab: { flex: 1, minHeight: TOUCH + 8, alignItems: "center", justifyContent: "center", gap: space.xs },
  indicator: { width: 28, height: 4, borderRadius: 2, backgroundColor: "transparent" },
  indicatorActive: { backgroundColor: colors.primary },
  label: { fontSize: type.small, fontWeight: "600", color: colors.muted },
  labelActive: { color: colors.primary },
});
