import { ReactNode, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, PressableProps, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Icon, { IconName } from "./Icon";
import { colors, radius, shadow, space, TOUCH, type } from "./theme";
import { useReducedMotion } from "./useReducedMotion";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
}

interface ScaleProps extends Omit<PressableProps, "children" | "style"> {
  contentStyle: StyleProp<ViewStyle>;
  children: ReactNode;
}

// Pressable whose visual content shrinks slightly while pressed.
function ScalePressable({ contentStyle, children, onPressIn, onPressOut, ...rest }: ScaleProps) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => {
    if (!reduced) Animated.timing(scale, { toValue: v, duration: 90, useNativeDriver: true }).start();
  };
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        to(0.97);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[contentStyle, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Button({ title, onPress, variant = "primary", disabled, loading, icon }: ButtonProps) {
  const primary = variant === "primary";
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      contentStyle={[s.button, primary ? s.buttonPrimary : s.buttonSecondary, (disabled || loading) && s.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.primaryText : colors.primary} />
      ) : (
        <View style={s.buttonContent}>
          {icon && <Icon name={icon} size={20} color={primary ? colors.primaryText : colors.primary} />}
          <Text style={[s.buttonText, !primary && { color: colors.primary }]}>{title}</Text>
        </View>
      )}
    </ScalePressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  // radio: one of several choices; checkbox: an on/off filter; button: a one-shot suggestion.
  role?: "radio" | "checkbox" | "button";
  // A second, smaller line under the label (for example the price); makes the chip narrow enough for a row of four.
  sub?: string;
}

export function Chip({ label, selected, onPress, role = "button", sub }: ChipProps) {
  const on = selected ? { color: colors.primaryText } : null;
  return (
    <ScalePressable
      accessibilityRole={role}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      accessibilityState={role === "button" ? { selected } : { checked: selected }}
      onPress={onPress}
      contentStyle={[s.chip, sub ? s.chipDense : null, selected && s.chipSelected]}
    >
      <Text style={[s.chipText, on]} numberOfLines={1}>
        {label}
      </Text>
      {sub ? (
        <Text style={[s.chipSub, on]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </ScalePressable>
  );
}

interface SegmentedProps<T extends string> {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
  // 44dp tall instead of 48dp, for dense forms where the full height would force scrolling.
  compact?: boolean;
  // Read out by screen readers when the group has no visible heading.
  label?: string;
}

export function Segmented<T extends string>({ options, value, onChange, compact, label }: SegmentedProps<T>) {
  return (
    <View style={s.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="radio"
          accessibilityState={{ checked: key === value }}
          onPress={() => onChange(key)}
          style={[s.segment, compact && s.segmentCompact, key === value && s.segmentActive]}
        >
          <Text style={[s.chipText, key === value && { color: colors.primaryText }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Badge({ label, color = colors.danger }: { label: string; color?: string }) {
  return (
    <View style={[s.badge, { backgroundColor: color }]}>
      <Text style={s.badgeText}>{label}</Text>
    </View>
  );
}

// Shown instead of a screen's content when loading failed; always offers a way to try again.
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={s.emptyWrap} accessibilityRole="alert">
      <Icon name="alert-circle-outline" size={40} color={colors.danger} />
      <Text style={s.empty}>{message}</Text>
      <Button title="Try again" variant="secondary" icon="refresh" onPress={onRetry} />
    </View>
  );
}

export function EmptyState({ text, icon = "file-tray-outline" }: { text: string; icon?: IconName }) {
  return (
    <View style={s.emptyWrap}>
      <Icon name={icon} size={40} color={colors.muted} />
      <Text style={s.empty}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  button: { minHeight: TOUCH, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.primary },
  buttonText: { color: colors.primaryText, fontSize: type.body, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  card: { padding: space.lg, borderRadius: radius.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, gap: space.xs, ...shadow },
  chip: { minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  chipDense: { paddingHorizontal: space.xs, minWidth: 0 },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: type.body, fontWeight: "600", color: colors.text },
  chipSub: { fontSize: type.small, color: colors.muted },
  segmented: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: space.xs },
  segment: { flex: 1, minHeight: TOUCH, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  segmentCompact: { minHeight: 44 },
  segmentActive: { backgroundColor: colors.primary },
  badge: { alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { color: colors.primaryText, fontSize: type.small, fontWeight: "700" },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: space.sm },
  emptyWrap: { alignItems: "center", gap: space.sm, marginTop: space.xl },
  empty: { textAlign: "center", color: colors.muted, fontSize: type.body },
});
