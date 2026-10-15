import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "./AppButton";
import { colors } from "../theme/colors";
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
  iconColor = colors.primary,
  title,
  description,
  actionTitle,
  onActionPress,
  actionIcon,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color={iconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
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
    backgroundColor: colors.card,
    borderColor: colors.border,
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
    backgroundColor: colors.cardSoft,
    borderColor: colors.borderLight,
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
    color: colors.text,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  buttonWrap: {
    marginTop: spacing.xs,
    width: 170,
  },
});
