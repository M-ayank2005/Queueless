import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radii, shadows, spacing } from "../theme/theme";

import QueueFlowInline from "./loading/QueueFlowInline";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

/**
 * AppButton Component
 * Tactile button with animated spring feedback, QueueFlow micro-loader,
 * and high-contrast typography.
 */
export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  loadingText,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  style,
  fullWidth = true,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const sizeStyles = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  }[size];

  const labelSizeStyles = {
    sm: styles.labelSm,
    md: styles.labelMd,
    lg: styles.labelLg,
  }[size];

  const iconSizes = {
    sm: 15,
    md: 18,
    lg: 20,
  }[size];

  const spinnerColor =
    variant === "secondary" || variant === "ghost" || variant === "outline"
      ? colors.primary
      : "#FFFFFF";

  const iconColor =
    variant === "ghost"
      ? colors.muted
      : variant === "secondary"
      ? colors.text
      : variant === "outline"
      ? colors.primary
      : "#FFFFFF";

  return (
    <Animated.View
      style={[
        fullWidth && styles.fullWidth,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.base,
          sizeStyles,
          styles[variant],
          (disabled || loading) && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <View style={styles.contentRow}>
            <QueueFlowInline
              color={spinnerColor}
              text={loadingText || (size === "sm" ? undefined : title)}
            />
          </View>
        ) : (
          <View style={styles.contentRow}>
            {icon && iconPosition === "left" && (
              <Ionicons name={icon} size={iconSizes} color={iconColor} />
            )}
            <Text
              style={[
                styles.label,
                labelSizeStyles,
                variant === "ghost" && styles.ghostLabel,
                variant === "secondary" && styles.secondaryLabel,
                variant === "outline" && styles.outlineLabel,
                variant === "danger" && styles.dangerLabel,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {icon && iconPosition === "right" && (
              <Ionicons name={icon} size={iconSizes} color={iconColor} />
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  base: {
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
  },
  sizeSm: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  sizeMd: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  sizeLg: {
    minHeight: 56,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.lg,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  label: {
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  labelSm: {
    fontSize: 13,
  },
  labelMd: {
    fontSize: 15,
  },
  labelLg: {
    fontSize: 16,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryHover,
    ...shadows.glow,
  },
  secondary: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  danger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: colors.dangerBorder,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.successLight,
  },
  disabled: {
    opacity: 0.5,
  },
  ghostLabel: {
    color: colors.muted,
  },
  secondaryLabel: {
    color: colors.text,
  },
  outlineLabel: {
    color: colors.primary,
  },
  dangerLabel: {
    color: colors.danger,
  },
});
