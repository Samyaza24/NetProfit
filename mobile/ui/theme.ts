// In both palettes a filled color (primary, success, warning, danger) carries primaryText on top of it,
// and the same color is readable as text on bg. Dark mode lightens the fills and darkens primaryText to keep that true.
export const lightColors = {
  primary: "#1f6fb2",
  primarySoft: "#e6f0f9",
  accent: "#22a559",
  primaryText: "#ffffff",
  bg: "#ffffff",
  surface: "#f4f7fa",
  border: "#d5dbe1",
  // Outline of text fields: dark enough (3:1 on white) to find the field without relying on its label.
  inputBorder: "#8a95a1",
  text: "#14202b",
  muted: "#5b6875",
  // Hint text inside empty fields: 4.6:1 on white, set explicitly because phone dark modes can make the default invisible.
  placeholder: "#6b7785",
  success: "#1b7f3b",
  // 5.4:1 on white; also used behind white text on badges.
  warning: "#9a5b00",
  danger: "#b00020",
  // Dim layer behind dialogs.
  backdrop: "rgba(8, 19, 29, 0.55)",
};

export type Palette = typeof lightColors;

export const darkColors: Palette = {
  primary: "#6db3f2",
  primarySoft: "#14283a",
  accent: "#4cc26d",
  primaryText: "#08131d",
  bg: "#0e1620",
  surface: "#162230",
  border: "#2a3a4a",
  inputBorder: "#7f8c99",
  text: "#e6edf3",
  muted: "#9fadba",
  placeholder: "#8795a3",
  success: "#4cc26d",
  warning: "#f0b44c",
  danger: "#ff7b7b",
  backdrop: "rgba(0, 0, 0, 0.7)",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12 };
export const type = { tiny: 12, body: 16, small: 13, title: 18, big: 24, hero: 34 };

// Soft card shadow; elevation covers Android, the shadow props cover iOS.
export const shadow = {
  shadowColor: "#0b2540",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;

// Minimum touch target in dp.
export const TOUCH = 48;

export const formatPHP = (n: number) =>
  `${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PHP`;
