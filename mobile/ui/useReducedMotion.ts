import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// True when the phone's "remove animations" setting is on; animations then jump to their end state.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);

  return reduced;
}
