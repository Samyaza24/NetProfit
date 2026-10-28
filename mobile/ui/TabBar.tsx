import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Icon, { IconName } from "./Icon";
import { colors, space, TOUCH, type } from "./theme";
import { useReducedMotion } from "./useReducedMotion";

interface Props<T extends string> {
  tabs: [T, string, string][];
  active: T;
  onChange: (key: T) => void;
}

function TabIcon({ name, on }: { name: string; on: boolean }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(on ? 1.1 : 1)).current;

  useEffect(() => {
    const to = on ? 1.1 : 1;
    if (reduced) scale.setValue(to);
    else Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 6 }).start();
  }, [on, reduced, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Icon name={(on ? name : `${name}-outline`) as IconName} size={24} color={on ? colors.primary : colors.muted} />
    </Animated.View>
  );
}

// Each tab names an Ionicons base icon; the outline variant shows when inactive.
export default function TabBar<T extends string>({ tabs, active, onChange }: Props<T>) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const index = Math.max(0, tabs.findIndex(([key]) => key === active));
  const tabWidth = width / tabs.length;

  useEffect(() => {
    const to = index * tabWidth;
    if (reduced || !width) x.setValue(to);
    else Animated.timing(x, { toValue: to, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [index, tabWidth, width, reduced, x]);

  return (
    <View style={s.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Animated.View style={[s.indicatorBox, { width: tabWidth, transform: [{ translateX: x }] }]}>
          <View style={s.indicator} />
        </Animated.View>
      )}
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
            <TabIcon name={icon} on={on} />
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
  indicatorBox: { position: "absolute", top: 0, left: 0, alignItems: "center" },
  indicator: { width: 32, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.primary },
  label: { fontSize: type.small, fontWeight: "600", color: colors.muted },
  labelActive: { color: colors.primary },
});
