export const colors = {
  primary: "#1f6fb2",
  primaryText: "#ffffff",
  bg: "#ffffff",
  surface: "#f3f5f7",
  border: "#d5dbe1",
  text: "#14202b",
  muted: "#5b6875",
  success: "#1b7f3b",
  warning: "#b26a00",
  danger: "#b00020",
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12 };
export const type = { body: 16, small: 13, title: 18, big: 24 };

// Minimum touch target in dp.
export const TOUCH = 48;

export const formatPHP = (n: number) =>
  `${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PHP`;
