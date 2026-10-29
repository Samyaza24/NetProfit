import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { getMeta, setMeta } from "../db/schema";
import { darkColors, lightColors, Palette } from "./theme";

export type ThemePref = "system" | "light" | "dark";

interface Theme {
  colors: Palette;
  dark: boolean;
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
}

const ThemeContext = createContext<Theme>({ colors: lightColors, dark: false, pref: "system", setPref: () => undefined });

// Picks light or dark from the saved choice (System by default, which follows the phone's setting).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref | null>(null);

  useEffect(() => {
    getMeta("theme").then(
      (v) => setPrefState(v === "light" || v === "dark" ? v : "system"),
      () => setPrefState("system")
    );
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next);
    setMeta("theme", next).catch(() => undefined); // not being able to remember the choice is not worth an error
  }, []);

  const value = useMemo<Theme>(() => {
    const chosen = pref ?? "system";
    const dark = chosen === "dark" || (chosen === "system" && system === "dark");
    return { colors: dark ? darkColors : lightColors, dark, pref: chosen, setPref };
  }, [pref, system, setPref]);

  if (pref === null) return null; // wait for the saved choice so the app never flashes the wrong theme
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Builds a screen's styles from the current palette, once per theme change.
export function useStyles<T>(make: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => make(colors), [make, colors]);
}
