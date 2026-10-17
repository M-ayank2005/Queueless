import React, { PropsWithChildren, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { radii, shadows, spacing } from "../theme/theme";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: "default" | "elevated" | "glow" | "subtle";
  activeOpacity?: number;
}>;

/**
 * Card Component
 * Surface container with subtle rounded corners, borders, and depth.
 * Automatically behaves as a tactile interactive card if `onPress` is supplied.
 */
export default function Card({
  children,
  style,
  onPress,
  variant = "default",
}: Props) {
  const { colors, isDark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const dynamicStyles = {
    cardBase: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
      gap: spacing.md,
      minWidth: 0,
    },
    default: {
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 6,
      elevation: 2,
    },
    elevated: {
      backgroundColor: colors.cardElevated,
      borderColor: colors.borderLight,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 10,
      elevation: 3,
    },
    glow: {
      borderColor: colors.primaryBorder,
      backgroundColor: colors.card,
      shadowColor: colors.primary,
      shadowOpacity: isDark ? 0.25 : 0.12,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 4,
    },
    subtle: {
      backgroundColor: colors.bgSecondary,
      borderColor: colors.borderSubtle,
    },
  };

  const variantStyle = dynamicStyles[variant];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressableWrap}
      >
        <Animated.View
          style={[
            dynamicStyles.cardBase,
            variantStyle,
            style,
            { transform: [{ scale }] },
          ]}
        >
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={[dynamicStyles.cardBase, variantStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressableWrap: {
    width: "100%",
  },
});
