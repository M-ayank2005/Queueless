import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { spacing, typography } from "../theme/theme";

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  count?: number;
  actionText?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onActionPress?: () => void;
  actionLoading?: boolean;
  rightElement?: React.ReactNode;
};

/**
 * SectionHeader Component
 * Clean, consistent section dividers with icon accents, count badges,
 * right-element slots (badges/actions), and quick-action buttons.
 */
export default function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor = colors.primary,
  count,
  actionText,
  actionIcon,
  onActionPress,
  actionLoading = false,
  rightElement,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <View style={styles.titleRow}>
          {icon && (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={18} color={iconColor} />
            </View>
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {typeof count === "number" && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightElement ? (
        <View style={styles.rightSlot}>{rightElement}</View>
      ) : onActionPress && (actionText || actionIcon) ? (
        <TouchableOpacity
          onPress={onActionPress}
          style={styles.actionBtn}
          activeOpacity={0.7}
          disabled={actionLoading}
        >
          {actionIcon && (
            <Ionicons
              name={actionIcon}
              size={15}
              color={colors.primary}
              style={actionLoading ? styles.spin : undefined}
            />
          )}
          {actionText ? <Text style={styles.actionText}>{actionText}</Text> : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    width: "100%",
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    marginRight: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    flexWrap: "wrap",
  },
  countBadge: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    flexShrink: 0,
  },
  countText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },
  rightSlot: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    flexShrink: 0,
  },
  actionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  spin: {
    opacity: 0.6,
  },
});
