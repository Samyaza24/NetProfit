import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";

export type IconName = keyof typeof Ionicons.glyphMap;

// Single import point for the icon set so it can be swapped in one place.
export default function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme();
  // Icons are decoration; the button or row around them carries the label.
  return <Ionicons name={name} size={size} color={color ?? colors.text} accessible={false} accessibilityElementsHidden importantForAccessibility="no" />;
}
