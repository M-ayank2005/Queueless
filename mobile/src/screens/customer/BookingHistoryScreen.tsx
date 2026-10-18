import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import AppLoader from "../../components/AppLoader";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";
import StatusBadge from "../../components/StatusBadge";
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { radii, spacing } from "../../theme/theme";

export default function BookingHistoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = async () => {
    try {
      const res = await api.get("/queue/history");
      setHistory(res.data || []);
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadHistory();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase().trim();
    return history.filter((entry) => {
      const shopName = (
        entry.businessId?.businessProfile?.shopName ||
        entry.businessId?.shopName ||
        ""
      ).toLowerCase();
      const ticketId = entry._id.toLowerCase();
      const ticketSuffix = entry._id.slice(-4).toLowerCase();
      const services = (entry.selectedServices || [])
        .map((s) => s.name.toLowerCase())
        .join(" ");

      return (
        shopName.includes(q) ||
        ticketId.includes(q) ||
        ticketSuffix.includes(q) ||
        services.includes(q)
      );
    });
  }, [history, searchQuery]);

  const completedCount = useMemo(() => {
    return history.filter((h) => h.status === "completed").length;
  }, [history]);

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <AppLoader
          message="Loading booking history..."
          submessage="Retrieving your past visits and tickets"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Top Header Row with Back Button */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back to profile"
        >
          <View
            style={[
              styles.backIconCircle,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </View>
          <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Screen Title & Summary */}
      <View style={styles.titleSection}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>
          Booking History
        </Text>
        <Text style={[styles.pageSubtitle, { color: colors.muted }]}>
          Your past visits, counter tickets, and service receipts.
        </Text>
      </View>

      {/* Metric Highlights (if history exists) */}
      {history.length > 0 && (
        <View style={styles.statsRow}>
          <Card
            variant="default"
            style={[styles.statCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {history.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Total Visits
            </Text>
          </Card>

          <Card
            variant="default"
            style={[styles.statCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {completedCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Completed
            </Text>
          </Card>
        </View>
      )}

      {/* Search Input (if history is non-trivial) */}
      {history.length > 3 && (
        <View
          style={[
            styles.searchBarWrap,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={17} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by store or service..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Booking History List */}
      <View style={styles.sectionWrap}>
        <SectionHeader
          title="Past Visits"
          subtitle={
            filteredHistory.length !== history.length
              ? `Showing ${filteredHistory.length} of ${history.length} visits`
              : "Archived ticket records"
          }
          icon="receipt-outline"
          count={filteredHistory.length}
        />

        {filteredHistory.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={
              searchQuery ? "No Matching Visits" : "No Past Visits Yet"
            }
            description={
              searchQuery
                ? `No booking records match "${searchQuery}". Try a different keyword.`
                : "When you join store queues and complete your turns, your receipts and tickets will appear here."
            }
          />
        ) : (
          <View style={styles.historyList}>
            {filteredHistory.map((entry) => {
              const shopName =
                entry.businessId?.businessProfile?.shopName ||
                entry.businessId?.shopName ||
                "QueueLess Store";

              const dateVal = entry.date || entry.joinedAt || entry.createdAt;
              const dateStr = dateVal
                ? new Date(dateVal).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent Visit";

              const totalCost = (entry.selectedServices || []).reduce(
                (acc, s) => acc + (Number(s.cost) || 0) * (Number(s.quantity) || 1),
                0
              );

              return (
                <Card
                  key={entry._id}
                  variant="default"
                  onPress={() =>
                    navigation.navigate("QueueStatus", { id: entry._id })
                  }
                  style={styles.historyCard}
                >
                  <View style={styles.historyCardTop}>
                    <View style={styles.historyStoreCol}>
                      <Text
                        style={[styles.historyShopName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {shopName}
                      </Text>
                      <Text
                        style={[styles.historyTicket, { color: colors.muted }]}
                      >
                        Ticket #{entry._id.slice(-4).toUpperCase()}
                      </Text>
                    </View>
                    <StatusBadge status={entry.status} size="sm" />
                  </View>

                  {/* Services Chips */}
                  {entry.selectedServices?.length ? (
                    <View style={styles.historyServicesRow}>
                      {entry.selectedServices.map((s, idx) => {
                        const qty = s.quantity || 1;
                        return (
                          <View
                            key={`${s.name}_${idx}`}
                            style={[
                              styles.historyServiceChip,
                              {
                                backgroundColor: colors.cardSoft,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.historyServiceChipText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {s.name} {qty > 1 ? `(×${qty})` : ""}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.historyCardBottom,
                      { borderTopColor: colors.borderSubtle },
                    ]}
                  >
                    <View style={styles.historyMetaLeft}>
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color={colors.muted}
                      />
                      <Text
                        style={[styles.historyDate, { color: colors.muted }]}
                      >
                        {dateStr}
                      </Text>
                    </View>

                    <View style={styles.historyMetaRight}>
                      {totalCost > 0 && (
                        <Text
                          style={[
                            styles.historyPrice,
                            { color: colors.primary },
                          ]}
                        >
                          ₹{totalCost}
                        </Text>
                      )}
                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color={colors.muted}
                      />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  backIconCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
  titleSection: {
    marginBottom: spacing.md,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  sectionWrap: {
    marginBottom: spacing.xl,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyCard: {
    padding: spacing.md,
    borderRadius: radii.xl,
  },
  historyCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  historyStoreCol: {
    flex: 1,
  },
  historyShopName: {
    fontSize: 15,
    fontWeight: "700",
  },
  historyTicket: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  historyServicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: spacing.xs,
  },
  historyServiceChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  historyServiceChipText: {
    fontSize: 11,
    fontWeight: "500",
  },
  historyCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  historyMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  historyMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyPrice: {
    fontSize: 13,
    fontWeight: "700",
  },
});
