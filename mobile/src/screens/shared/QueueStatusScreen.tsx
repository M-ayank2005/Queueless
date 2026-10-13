import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppLoader from "../../components/AppLoader";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "QueueStatus">;

export default function QueueStatusScreen({ route, navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entry, setEntry] = useState<QueueEntry | null>(null);

  const load = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const response = await api.get(`/queue/status/${route.params.id}`);
      setEntry(response.data);
    } catch {
      if (isManual) {
        Alert.alert("Unable to load status", "Please try again shortly.");
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(false), 15000);
    return () => clearInterval(interval);
  }, [route.params.id]);

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <AppLoader
          message="Fetching live queue status..."
          submessage="Checking your position and wait time"
        />
      </AppScreen>
    );
  }

  if (!entry) {
    return (
      <AppScreen>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Card style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
          <Text style={styles.title}>Queue Ticket Not Found</Text>
          <Text style={styles.muted}>This ticket may have expired or been removed.</Text>
          <AppButton title="Go Back" variant="secondary" onPress={() => navigation.goBack()} />
        </Card>
      </AppScreen>
    );
  }

  const wait = entry.currentEstimatedWait ?? 0;
  const ahead = entry.peopleAhead ?? 0;
  const isCompleted = entry.status === "completed";
  const isCancelled = entry.status === "cancelled";
  const isInProgress = entry.status === "in_progress";

  const shopName =
    entry.businessId?.businessProfile?.shopName ||
    entry.businessId?.shopName ||
    "QueueLess Store";

  const shopAddress =
    entry.businessId?.businessProfile?.address ||
    entry.businessId?.address ||
    "";

  const totalCost = (entry.selectedServices || []).reduce(
    (acc, s) => acc + (Number(s.cost) || 0),
    0
  );

  return (
    <AppScreen>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.liveSyncBadge}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>LIVE SYNC (15s)</Text>
        </View>
      </View>

      {/* Hero Boarding Pass Card */}
      <Card style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <View style={styles.storeCol}>
            <Text style={styles.shopNameText}>{shopName}</Text>
            {shopAddress ? <Text style={styles.shopAddressText}>{shopAddress}</Text> : null}
          </View>

          <View
            style={[
              styles.statusPill,
              isCompleted && styles.statusCompleted,
              isCancelled && styles.statusCancelled,
              isInProgress && styles.statusProgress,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isCompleted && { backgroundColor: "#10B981" },
                isCancelled && { backgroundColor: "#EF4444" },
                isInProgress && { backgroundColor: colors.primary },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                isCompleted && { color: "#10B981" },
                isCancelled && { color: "#EF4444" },
                isInProgress && { color: colors.primary },
              ]}
            >
              {entry.status.replace("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.ticketNumberSection}>
          <Text style={styles.ticketLabel}>YOUR TICKET NUMBER</Text>
          <Text style={styles.ticketBigNumber}>
            #{entry._id.slice(-6).toUpperCase()}
          </Text>
        </View>
      </Card>

      {/* Two Column Metric Cards */}
      <View style={styles.metricRow}>
        <Card style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Ionicons name="people-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.metricBigVal}>{ahead}</Text>
          <Text style={styles.metricLabelText}>People Ahead</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
            <Ionicons name="hourglass-outline" size={22} color="#F59E0B" />
          </View>
          <Text style={[styles.metricBigVal, { color: "#F59E0B" }]}>~{wait}m</Text>
          <Text style={styles.metricLabelText}>Estimated Wait</Text>
        </Card>
      </View>

      {/* Selected Services Breakdown */}
      <Card style={styles.servicesCard}>
        <View style={styles.serviceHeaderRow}>
          <Ionicons name="list-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionHeading}>Selected Services</Text>
        </View>

        {entry.selectedServices?.length ? (
          <View style={styles.servicesList}>
            {entry.selectedServices.map((service, idx) => (
              <View key={`${service.name}_${idx}`} style={styles.serviceItemRow}>
                <View style={styles.serviceLeftCol}>
                  <Text style={styles.serviceNameText}>{service.name}</Text>
                  {service.durationMin ? (
                    <Text style={styles.serviceDurationText}>⏱ {service.durationMin} mins</Text>
                  ) : null}
                </View>
                <Text style={styles.serviceCostText}>${service.cost}</Text>
              </View>
            ))}

            <View style={styles.totalDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Estimated Cost</Text>
              <Text style={styles.totalValue}>${totalCost}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.muted}>Standard queue entry with no extra services.</Text>
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionsWrap}>
        <AppButton
          title={refreshing ? "Refreshing..." : "Refresh Status"}
          onPress={() => load(true)}
          loading={refreshing}
          icon="refresh-outline"
        />
        <AppButton
          title="Return to Home"
          variant="secondary"
          onPress={() => navigation.goBack()}
          icon="home-outline"
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  backText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  liveSyncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  syncText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  ticketCard: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: 18,
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.35)",
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  storeCol: {
    flex: 1,
    gap: 2,
  },
  shopNameText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  shopAddressText: {
    color: colors.muted,
    fontSize: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  statusCancelled: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  statusProgress: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.35)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  statusPillText: {
    color: "#FBBF24",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ticketNumberSection: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    gap: 4,
  },
  ticketLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  ticketBigNumber: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    gap: 6,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  metricBigVal: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
  },
  metricLabelText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  servicesCard: {
    paddingVertical: 18,
    gap: 14,
  },
  serviceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeading: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  servicesList: {
    gap: 10,
  },
  serviceItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceLeftCol: {
    gap: 2,
  },
  serviceNameText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  serviceDurationText: {
    color: colors.muted,
    fontSize: 11,
  },
  serviceCostText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  totalLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  totalValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "900",
  },
  actionsWrap: {
    gap: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  errorCard: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
});
