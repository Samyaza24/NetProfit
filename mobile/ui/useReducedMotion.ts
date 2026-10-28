import { createContext, createElement, ReactNode, useContext, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

const ReducedMotionContext = createContext(false);

// One listener for the whole app instead of one per animated component. Children wait a moment for the
// first answer so a reduced-motion user never sees the opening animations.
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced, () => setReduced(false));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);

  if (reduced === null) return null;
  return createElement(ReducedMotionContext.Provider, { value: reduced }, children);
}

// True when the phone's "remove animations" setting is on; animations then jump to their end state.
export const useReducedMotion = () => useContext(ReducedMotionContext);
