import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { spacing } from "../theme/theme";

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
 * right-element slots (badges/actions), and quick-action buttons across themes.
 */
export default function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor,
  count,
  actionText,
  actionIcon,
  onActionPress,
  actionLoading = false,
  rightElement,
}: Props) {
  const { colors } = useTheme();
  const effectiveIconColor = iconColor || colors.primary;

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <View style={styles.titleRow}>
          {icon && (
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name={icon} size={18} color={effectiveIconColor} />
            </View>
          )}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {typeof count === "number" && (
            <View style={[styles.countBadge, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{count}</Text>
            </View>
          )}
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightElement ? (
        <View style={styles.rightSlot}>{rightElement}</View>
      ) : onActionPress && (actionText || actionIcon) ? (
        <TouchableOpacity
          onPress={onActionPress}
          style={[styles.actionBtn, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}
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
          {actionText ? <Text style={[styles.actionText, { color: colors.primary }]}>{actionText}</Text> : null}
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
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    flexWrap: "wrap",
  },
  countBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    flexShrink: 0,
  },
  countText: {
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
    borderWidth: 1,
    flexShrink: 0,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  spin: {
    opacity: 0.6,
  },
});
