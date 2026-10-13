import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  icon,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? colors.primary : "#FFFFFF"} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={
                variant === "ghost"
                  ? colors.muted
                  : variant === "secondary"
                  ? colors.text
                  : "#FFFFFF"
              }
            />
          ) : null}
          <Text
            style={[
              styles.label,
              variant === "ghost" && styles.ghostLabel,
              variant === "secondary" && styles.secondaryLabel,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primary: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: "#3B1018",
    borderColor: colors.danger,
  },
  success: {
    backgroundColor: "#064E3B",
    borderColor: colors.success,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ghostLabel: {
    color: colors.muted,
    fontWeight: "600",
  },
  secondaryLabel: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
});
