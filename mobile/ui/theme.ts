export const colors = {
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
  success: "#1b7f3b",
  // 5.4:1 on white; also used behind white text on badges.
  warning: "#9a5b00",
  danger: "#b00020",
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
