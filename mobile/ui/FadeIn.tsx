import { ReactNode, useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

interface Props {
  children: ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

// Fades and slides its content up slightly on mount.
export default function FadeIn({ children, delay = 0, style }: Props) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 220, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduced, delay, v]);

  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}
