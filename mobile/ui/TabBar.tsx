import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Icon, { IconName } from "./Icon";
import { colors, space, TOUCH, type } from "./theme";

interface Props<T extends string> {
  tabs: [T, string, string][];
  active: T;
  onChange: (key: T) => void;
}

// Each tab names an Ionicons base icon; the outline variant shows when inactive.
export default function TabBar<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <View style={s.bar}>
      {tabs.map(([key, label, icon]) => {
        const on = key === active;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(key)}
            style={s.tab}
          >
            <Icon name={(on ? icon : `${icon}-outline`) as IconName} size={24} color={on ? colors.primary : colors.muted} />
            <Text style={[s.label, on && s.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  // Extra bottom padding on Android keeps tabs clear of the gesture bar.
  bar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg, paddingBottom: Platform.OS === "android" ? space.lg : 0 },
  tab: { flex: 1, minHeight: TOUCH + 8, alignItems: "center", justifyContent: "center", gap: 2 },
  label: { fontSize: type.small, fontWeight: "600", color: colors.muted },
  labelActive: { color: colors.primary },
});
