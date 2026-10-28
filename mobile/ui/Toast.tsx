import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type } from "./theme";

// Returns a node to render near the bottom of a screen and a function that shows a message briefly.
export function useToast(ms = 2500) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback(
    (text: string) => {
      clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(() => setMessage(null), ms);
    },
    [ms]
  );

  const node = message ? (
    <View style={s.toast} accessibilityLiveRegion="polite">
      <Text style={s.text}>{message}</Text>
    </View>
  ) : null;

  return [node, show] as const;
}

const s = StyleSheet.create({
  toast: { backgroundColor: colors.success, borderRadius: radius.md, padding: space.md },
  text: { color: colors.primaryText, fontSize: type.body, fontWeight: "600", textAlign: "center" },
});
