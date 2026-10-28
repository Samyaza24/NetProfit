import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleProp, Text, TextStyle } from "react-native";
import { formatPHP } from "./theme";
import { useReducedMotion } from "./useReducedMotion";

// Counts a PHP amount up from zero on mount; JS-driven because it changes text.
export default function CountUp({ value, style }: { value: number; style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const id = v.addListener(({ value: n }) => setShown(n));
    Animated.timing(v, { toValue: value, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [value, reduced, v]);

  return <Text style={style}>{formatPHP(shown)}</Text>;
}
