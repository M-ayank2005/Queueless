import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors } from "../theme/colors";
import { radii, spacing } from "../theme/theme";

export type BadgeStatus =
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "open"
  | "closed"
  | "serving"
  | "active";

type Props = {
  status: BadgeStatus | string;
  label?: string;
  pulse?: boolean;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
};

/**
 * StatusBadge Component
 * Standardized status indicators across Queue status, Customer Home,
 * and Business Dashboard with optional live pulsing dot.
 */
export default function StatusBadge({
  status,
  label,
  pulse = true,
  size = "md",
  style,
}: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const normalized = (status || "").toLowerCase().trim();
  const isActive = normalized === "waiting" || normalized === "in_progress" || normalized === "open" || normalized === "active";

  useEffect(() => {
    if (!pulse || !isActive) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, isActive]);

  const config = getStatusConfig(normalized, size);
  const displayText = label || config.text;

  return (
    <View
      style={[
        styles.badge,
        size === "sm" && styles.badgeSm,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          size === "sm" && styles.dotSm,
          { backgroundColor: config.color },
          isActive && pulse && { opacity: pulseAnim },
        ]}
      />
      <Text
        style={[
          styles.label,
          size === "sm" && styles.labelSm,
          { color: config.color },
        ]}
        numberOfLines={1}
      >
        {displayText}
      </Text>
    </View>
  );
}

function getStatusConfig(status: string, size: "sm" | "md" = "md") {
  switch (status) {
    case "completed":
      return {
        text: "COMPLETED",
        color: colors.success,
        bg: colors.successSubtle,
        border: colors.successBorder,
      };
    case "in_progress":
    case "serving":
      return {
        text: size === "sm" ? "SERVING" : "SERVING NOW",
        color: colors.primary,
        bg: colors.primarySubtle,
        border: colors.primaryBorder,
      };
    case "cancelled":
      return {
        text: "CANCELLED",
        color: colors.danger,
        bg: colors.dangerSubtle,
        border: colors.dangerBorder,
      };
    case "open":
      return {
        text: size === "sm" ? "OPEN" : "OPEN NOW",
        color: colors.success,
        bg: colors.successSubtle,
        border: colors.successBorder,
      };
    case "closed":
      return {
        text: "CLOSED",
        color: colors.muted,
        bg: "rgba(148, 163, 184, 0.12)",
        border: "rgba(148, 163, 184, 0.3)",
      };
    case "waiting":
    default:
      return {
        text: size === "sm" ? "IN QUEUE" : "WAITING IN QUEUE",
        color: colors.warning,
        bg: colors.warningSubtle,
        border: colors.warningBorder,
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    gap: 6,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  labelSm: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
