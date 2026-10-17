import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { radii, spacing } from "../../theme/theme";

type BoxProps = {
  width?: number | `${number}%` | "auto";
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBox({
  width = "100%",
  height = 20,
  borderRadius = radii.sm,
  style,
}: BoxProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeletonBox,
        {
          backgroundColor: colors.cardElevated,
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function QueueCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowBetween}>
        <View style={styles.col}>
          <SkeletonBox width={160} height={18} />
          <SkeletonBox width={100} height={13} style={{ marginTop: 6 }} />
        </View>
        <SkeletonBox width={90} height={24} borderRadius={radii.full} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.rowBetween}>
        <SkeletonBox width={90} height={28} borderRadius={radii.sm} />
        <SkeletonBox width={120} height={28} borderRadius={radii.sm} />
        <SkeletonBox width={70} height={28} borderRadius={radii.sm} />
      </View>
    </View>
  );
}

export function StoreCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.cardSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.storeHeader}>
        <SkeletonBox width={46} height={46} borderRadius={12} />
        <View style={[styles.col, { flex: 1 }]}>
          <SkeletonBox width="70%" height={17} />
          <SkeletonBox width="50%" height={13} style={{ marginTop: 6 }} />
        </View>
      </View>

      <View style={styles.rowBetween}>
        <SkeletonBox width={75} height={22} borderRadius={radii.full} />
        <SkeletonBox width={110} height={22} borderRadius={radii.full} />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.rowBetween}>
        <SkeletonBox width={90} height={16} />
        <SkeletonBox width={110} height={36} borderRadius={radii.md} />
      </View>
    </View>
  );
}

export function MetricsRowSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={styles.metricsRow}>
      <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
        <SkeletonBox width={50} height={28} style={{ marginTop: 8 }} />
        <SkeletonBox width={80} height={14} style={{ marginTop: 6 }} />
      </View>
      <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SkeletonBox width={36} height={36} borderRadius={18} />
        <SkeletonBox width={60} height={28} style={{ marginTop: 8 }} />
        <SkeletonBox width={90} height={14} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function HistoryItemSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.col}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <SkeletonBox width={60} height={16} borderRadius={radii.sm} />
          <SkeletonBox width={120} height={16} />
        </View>
        <SkeletonBox width={160} height={12} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={70} height={22} borderRadius={radii.full} />
    </View>
  );
}

export function ProfileSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md, width: "100%" }}>
      <View style={[styles.cardSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <SkeletonBox width={56} height={56} borderRadius={28} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBox width="60%" height={18} />
            <SkeletonBox width="40%" height={14} />
          </View>
        </View>
      </View>

      <View style={[styles.cardSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SkeletonBox width={120} height={16} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={44} borderRadius={radii.md} style={{ marginBottom: 10 }} />
        <SkeletonBox width="100%" height={44} borderRadius={radii.md} style={{ marginBottom: 10 }} />
        <SkeletonBox width={110} height={42} borderRadius={radii.md} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBox: {},
  cardSkeleton: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    width: "100%",
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  col: {
    justifyContent: "center",
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
});

const QueueFlowSkeleton = {
  Box: SkeletonBox,
  QueueCard: QueueCardSkeleton,
  StoreCard: StoreCardSkeleton,
  MetricsRow: MetricsRowSkeleton,
  HistoryItem: HistoryItemSkeleton,
  Profile: ProfileSkeleton,
};

export default QueueFlowSkeleton;
