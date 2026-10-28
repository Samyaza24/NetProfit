import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, space, TOUCH, type } from "./theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = "primary", disabled, loading }: ButtonProps) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled || !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        primary ? s.buttonPrimary : s.buttonSecondary,
        (disabled || loading) && s.disabled,
        pressed && s.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.primaryText : colors.primary} />
      ) : (
        <Text style={[s.buttonText, !primary && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.chipSelected]}
    >
      <Text style={[s.chipText, selected && { color: colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

interface SegmentedProps<T extends string> {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={s.segmented}>
      {options.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected: key === value }}
          onPress={() => onChange(key)}
          style={[s.segment, key === value && s.segmentActive]}
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

export function EmptyState({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

const s = StyleSheet.create({
  button: { minHeight: TOUCH, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.primary },
  buttonText: { color: colors.primaryText, fontSize: type.body, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  card: { padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surface, gap: space.xs },
  chip: { minHeight: TOUCH, minWidth: TOUCH, paddingHorizontal: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: type.body, fontWeight: "600", color: colors.text },
  segmented: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: space.xs },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: colors.primary },
  badge: { alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { color: colors.primaryText, fontSize: type.small, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: space.xl, color: colors.muted, fontSize: type.body },
});
