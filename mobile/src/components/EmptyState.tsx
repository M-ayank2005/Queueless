import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "./AppButton";
import { useTheme } from "../context/ThemeContext";
import { radii, spacing } from "../theme/theme";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  description: string;
  actionTitle?: string;
  onActionPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
};

/**
 * EmptyState Component
 * Modern placeholder when a list, live queue, or search returns empty results.
 */
export default function EmptyState({
  icon = "cube-outline",
  iconColor,
  title,
  description,
  actionTitle,
  onActionPress,
  actionIcon,
}: Props) {
  const { colors } = useTheme();
  const effectiveIconColor = iconColor || colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.cardSoft, borderColor: colors.borderLight }]}>
        <Ionicons name={icon} size={32} color={effectiveIconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
      </View>
      {actionTitle && onActionPress && (
        <View style={styles.buttonWrap}>
          <AppButton
            title={actionTitle}
            onPress={onActionPress}
            icon={actionIcon}
            size="sm"
            variant="secondary"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    width: "100%",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: 290,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  buttonWrap: {
    marginTop: spacing.xs,
    width: 170,
  },
});
