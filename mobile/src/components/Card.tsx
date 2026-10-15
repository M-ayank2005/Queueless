import React, { PropsWithChildren, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "../theme/colors";
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

  const variantStyles = {
    default: styles.cardDefault,
    elevated: styles.cardElevated,
    glow: styles.cardGlow,
    subtle: styles.cardSubtle,
  }[variant];

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
            styles.cardBase,
            variantStyles,
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
    <View style={[styles.cardBase, variantStyles, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressableWrap: {
    width: "100%",
  },
  cardBase: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    minWidth: 0,
  },
  cardDefault: {
    ...shadows.card,
  },
  cardElevated: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  cardGlow: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.card,
    ...shadows.glow,
  },
  cardSubtle: {
    backgroundColor: colors.bgSecondary,
    borderColor: colors.borderSubtle,
  },
});
