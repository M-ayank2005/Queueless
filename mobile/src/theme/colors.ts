export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;

  card: string;
  cardSoft: string;
  cardElevated: string;
  cardGlow: string;

  border: string;
  borderLight: string;
  borderSubtle: string;

  text: string;
  textSecondary: string;
  muted: string;
  mutedDark: string;

  primary: string;
  primaryHover: string;
  primaryStrong: string;
  primaryDark: string;
  primarySubtle: string;
  primaryBorder: string;

  success: string;
  successLight: string;
  successSubtle: string;
  successBorder: string;

  warning: string;
  warningLight: string;
  warningSubtle: string;
  warningBorder: string;

  danger: string;
  dangerLight: string;
  dangerSubtle: string;
  dangerBorder: string;

  info: string;
  infoSubtle: string;

  overlay: string;
}

export const lightColors: ThemeColors = {
  // Base Backgrounds (Apple System Grouped)
  bg: "#F2F2F7",
  bgSecondary: "#E5E5EA",
  bgTertiary: "#D1D1D6",

  // Card & Surface Layers
  card: "#FFFFFF",
  cardSoft: "#F2F2F7",
  cardElevated: "#FFFFFF",
  cardGlow: "rgba(0, 113, 227, 0.08)",

  // Borders & Dividers (Apple Hairline)
  border: "rgba(60, 60, 67, 0.12)",
  borderLight: "rgba(60, 60, 67, 0.18)",
  borderSubtle: "rgba(60, 60, 67, 0.06)",

  // Typography (Apple San Francisco standard, calibrated for WCAG AA contrast)
  text: "#1D1D1F",
  textSecondary: "#3A3A3C",
  muted: "#6E6E73",
  mutedDark: "#48484A",

  // Brand Accents (Apple Signature Blue)
  primary: "#0071E3",
  primaryHover: "#0077ED",
  primaryStrong: "#0058B0",
  primaryDark: "#004080",
  primarySubtle: "rgba(0, 113, 227, 0.08)",
  primaryBorder: "rgba(0, 113, 227, 0.25)",

  // Status & Semantic Feedback (High-contrast on light background)
  success: "#1E823C",
  successLight: "#28A745",
  successSubtle: "rgba(30, 130, 60, 0.10)",
  successBorder: "rgba(30, 130, 60, 0.28)",

  warning: "#B45309",
  warningLight: "#D97706",
  warningSubtle: "rgba(180, 83, 9, 0.10)",
  warningBorder: "rgba(180, 83, 9, 0.28)",

  danger: "#D70015",
  dangerLight: "#DC2626",
  dangerSubtle: "rgba(215, 0, 21, 0.10)",
  dangerBorder: "rgba(215, 0, 21, 0.28)",

  info: "#0071E3",
  infoSubtle: "rgba(0, 113, 227, 0.08)",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.45)",
};

export const darkColors: ThemeColors = {
  // Base Backgrounds (Apple True OLED Black)
  bg: "#000000",
  bgSecondary: "#1C1C1E",
  bgTertiary: "#2C2C2E",

  // Card & Surface Layers
  card: "#1C1C1E",
  cardSoft: "#2C2C2E",
  cardElevated: "#3A3A3C",
  cardGlow: "rgba(10, 132, 255, 0.12)",

  // Borders & Dividers (Apple Hairline Dark)
  border: "rgba(255, 255, 255, 0.12)",
  borderLight: "rgba(255, 255, 255, 0.18)",
  borderSubtle: "rgba(255, 255, 255, 0.06)",

  // Typography (Apple San Francisco standard Dark, calibrated for OLED contrast)
  text: "#F5F5F7",
  textSecondary: "#D1D1D6",
  muted: "#98989D",
  mutedDark: "#7C7C82",

  // Brand Accents (Apple iOS System Blue Dark)
  primary: "#0A84FF",
  primaryHover: "#409CFF",
  primaryStrong: "#0071E3",
  primaryDark: "#0058B0",
  primarySubtle: "rgba(10, 132, 255, 0.15)",
  primaryBorder: "rgba(10, 132, 255, 0.35)",

  // Status & Semantic Feedback (Apple Dark System Colors)
  success: "#30D158",
  successLight: "#34C759",
  successSubtle: "rgba(48, 209, 88, 0.15)",
  successBorder: "rgba(48, 209, 88, 0.35)",

  warning: "#FF9F0A",
  warningLight: "#FFB340",
  warningSubtle: "rgba(255, 159, 10, 0.15)",
  warningBorder: "rgba(255, 159, 10, 0.35)",

  danger: "#FF453A",
  dangerLight: "#FF6961",
  dangerSubtle: "rgba(255, 69, 58, 0.15)",
  dangerBorder: "rgba(255, 69, 58, 0.35)",

  info: "#0A84FF",
  infoSubtle: "rgba(10, 132, 255, 0.15)",

  // Overlay
  overlay: "rgba(0, 0, 0, 0.75)",
};

// Default is Light Mode for first-time users as specified
export const colors = lightColors;
