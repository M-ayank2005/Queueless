import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";
import { QueueCardSkeleton } from "../../components/SkeletonLoader";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { CustomerTabParamList, RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { colors } from "../../theme/colors";
import { radii, shadows, spacing, typography } from "../../theme/theme";

type Props = BottomTabScreenProps<CustomerTabParamList, "Home">;

export default function CustomerHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [activeQueues, setActiveQueues] = useState<QueueEntry[]>([]);
  const [history, setHistory] = useState<QueueEntry[]>([]);

  const fetchData = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        api.get("/queue/my-queues"),
        api.get("/queue/history"),
      ]);
      setActiveQueues(activeRes.data || []);
      setHistory(historyRes.data || []);
    } catch {
      // non-blocking
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "C";
  const entries = tab === "active" ? activeQueues : history;

  if (loading) {
    return (
      <AppScreen hasTabBar>
        <View style={styles.headerRow}>
          <View style={styles.userCol}>
            <Text style={styles.greetingText}>Hello, {user?.name || "Customer"} 👋</Text>
            <Text style={styles.mainTitle}>QueueLess</Text>
          </View>
        </View>
        <QueueCardSkeleton />
        <QueueCardSkeleton />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      hasTabBar
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Top Header Row with Avatar & Scan Action */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.userCol}>
            <Text style={styles.greetingText} numberOfLines={1}>
              Hello, {user?.name || "Customer"} 👋
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.mainTitle} numberOfLines={1}>
                QueueLess
              </Text>
              <StatusBadge status="active" label="LIVE" pulse size="sm" />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.scanActionBtn}
          onPress={() => navigation.navigate("ScanJoin")}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={16} color="#FFF" />
          <Text style={styles.scanActionText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Switcher for Live Tickets vs History */}
      <View style={styles.segmentContainer}>
        <Pressable
          onPress={() => setTab("active")}
          style={[styles.segmentBtn, tab === "active" && styles.segmentBtnActive]}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={tab === "active" ? colors.primary : colors.muted}
          />
          <Text style={[styles.segmentText, tab === "active" && styles.segmentTextActive]}>
            Live Tickets ({activeQueues.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("history")}
          style={[styles.segmentBtn, tab === "history" && styles.segmentBtnActive]}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={tab === "history" ? colors.primary : colors.muted}
          />
          <Text style={[styles.segmentText, tab === "history" && styles.segmentTextActive]}>
            History ({history.length})
          </Text>
        </Pressable>
      </View>

      {/* Ticket List or Empty State */}
      <View style={styles.sectionWrap}>
        {entries.length === 0 ? (
          <EmptyState
            icon={tab === "active" ? "checkmark-circle-outline" : "receipt-outline"}
            title={tab === "active" ? "No Active Queue Tickets" : "No Past Visits Yet"}
            description={
              tab === "active"
                ? "You're all caught up! Scan a merchant's counter QR code to take your spot in line."
                : "Completed or cancelled bookings will automatically appear here."
            }
            actionTitle={tab === "active" ? "Scan Store Code" : undefined}
            onActionPress={tab === "active" ? () => navigation.navigate("ScanJoin") : undefined}
            actionIcon="qr-code-outline"
          />
        ) : (
          entries.map((entry) => {
            const shopName =
              entry.businessId?.businessProfile?.shopName ||
              entry.businessId?.shopName ||
              "QueueLess Store";
            const wait = entry.currentEstimatedWait ?? 0;
            const ahead = entry.peopleAhead ?? 0;

            return (
              <Card
                key={entry._id}
                variant="elevated"
                onPress={() => rootNavigation.navigate("QueueStatus", { id: entry._id })}
                style={styles.ticketCard}
              >
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketStoreCol}>
                    <Text style={styles.ticketShopName} numberOfLines={1}>
                      {shopName}
                    </Text>
                    <Text style={styles.ticketNumber}>
                      Ticket #{entry._id.slice(-4).toUpperCase()}
                    </Text>
                  </View>
                  <StatusBadge status={entry.status} size="sm" />
                </View>

                <View style={styles.ticketDottedLine} />

                <View style={styles.ticketMetaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="people" size={14} color={colors.primary} />
                    <Text style={styles.metaChipText}>{ahead} ahead</Text>
                  </View>

                  <View style={[styles.metaChip, { backgroundColor: colors.warningSubtle }]}>
                    <Ionicons name="hourglass" size={14} color={colors.warning} />
                    <Text style={[styles.metaChipText, { color: colors.warning }]}>
                      ~{wait} mins wait
                    </Text>
                  </View>

                  <View style={styles.trackLiveBtn}>
                    <Text style={styles.trackLiveText}>Track Live</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* Quick QR Check-In Action Card */}
      <Card variant="subtle" style={styles.quickActionCard}>
        <View style={styles.quickActionHeader}>
          <View style={styles.quickActionIconWrap}>
            <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.quickActionTextCol}>
            <Text style={styles.quickActionTitle}>Join a Virtual Queue</Text>
            <Text style={styles.quickActionSubtitle}>
              Scan the counter QR poster at any store or enter the store code manually to take a live ticket without physically waiting in line.
            </Text>
          </View>
        </View>

        <AppButton
          title="Open Camera Scanner"
          onPress={() => navigation.navigate("ScanJoin")}
          icon="camera-outline"
          size="md"
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginRight: spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  userCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  greetingText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  scanActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    flexShrink: 0,
    ...shadows.glow,
  },
  scanActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: radii.sm,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  sectionWrap: {
    gap: spacing.md,
  },
  ticketCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  ticketStoreCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    marginRight: spacing.sm,
  },
  ticketShopName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  ticketNumber: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  ticketDottedLine: {
    height: 1,
    backgroundColor: colors.border,
  },
  ticketMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
    flexShrink: 0,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  trackLiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  trackLiveText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  quickActionCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  quickActionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  quickActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  quickActionTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    flexWrap: "wrap",
  },
});
