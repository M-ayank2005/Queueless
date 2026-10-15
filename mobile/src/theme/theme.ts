import { Platform } from "react-native";
import { colors } from "./colors";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  badge: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.6,
  },
};

export const shadows = {
  subtle: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
    },
    default: {},
  }),
  card: Platform.select({
    ios: {
      shadowColor: "#020617",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: "0 4px 14px rgba(2, 6, 23, 0.35)",
    },
    default: {},
  }),
  glow: Platform.select({
    ios: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
    web: {
      boxShadow: `0 4px 16px rgba(59, 130, 246, 0.3)`,
    },
    default: {},
  }),
};
