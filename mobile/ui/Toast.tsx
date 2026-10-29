import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text } from "react-native";
import { Palette, radius, space, type } from "./theme";
import { useStyles } from "./ThemeContext";
import { useReducedMotion } from "./useReducedMotion";

function ToastView({ message, ms }: { message: string; ms: number }) {
  const s = useStyles(makeStyles);
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  // Slides in, holds, then fades out just before the hook removes it.
  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const ease = Easing.out(Easing.cubic);
    const anim = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 200, easing: ease, useNativeDriver: true }),
      Animated.delay(Math.max(0, ms - 450)),
      Animated.timing(v, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduced, ms, v]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[s.toast, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] }]}
    >
      <Text style={s.text}>{message}</Text>
    </Animated.View>
  );
}

// Returns a node to render inside a flex:1 container (it floats over the top edge, so it never pushes
// other content around or covers the Save button) and a function that shows a message briefly.
export function useToast(ms = 2500) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback(
    (message: string) => {
      clearTimeout(timer.current);
      AccessibilityInfo.announceForAccessibility(message); // screen readers do not read a freshly mounted toast
      setToast((t) => ({ id: (t?.id ?? 0) + 1, message }));
      timer.current = setTimeout(() => setToast(null), ms);
    },
    [ms]
  );

  const node = toast ? <ToastView key={toast.id} message={toast.message} ms={ms} /> : null;
  return [node, show] as const;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  toast: { position: "absolute", left: space.lg, right: space.lg, top: space.sm, backgroundColor: colors.success, borderRadius: radius.md, padding: space.md },
  text: { color: colors.primaryText, fontSize: type.body, fontWeight: "600", textAlign: "center" },
});
