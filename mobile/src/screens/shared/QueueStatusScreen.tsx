import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppLoader from "../../components/AppLoader";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { colors } from "../../theme/colors";
import { radii, shadows, spacing, typography } from "../../theme/theme";

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
        if (Platform.OS === "web") {
          window.alert("Unable to load latest status. Please try again shortly.");
        } else {
          Alert.alert("Unable to load status", "Please try again shortly.");
        }
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
          message="Tracking live queue status..."
          submessage="Checking your position and estimated wait time"
        />
      </AppScreen>
    );
  }

  if (!entry) {
    return (
      <AppScreen>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={styles.backIconCircle}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </View>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Card variant="elevated" style={styles.errorCard}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
          </View>
          <Text style={styles.errorTitle}>Queue Ticket Not Found</Text>
          <Text style={styles.errorMuted}>This ticket may have expired or was removed by the merchant.</Text>
          <AppButton title="Return to Dashboard" variant="secondary" onPress={() => navigation.goBack()} />
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
    "Store Location";

  const totalCost = (entry.selectedServices || []).reduce(
    (acc, s) => acc + (Number(s.cost) || 0),
    0
  );

  const ticketCode = `#${entry._id.slice(-6).toUpperCase()}`;

  // Timeline step calculation
  const currentStep = isCancelled ? 0 : isCompleted ? 3 : isInProgress ? 2 : 1;

  return (
    <AppScreen>
      {/* Top Header Row with Back and Live Sync Indicator */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <View style={styles.backIconCircle}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </View>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.liveSyncBadge}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>LIVE SYNC (15s)</Text>
        </View>
      </View>

      {/* Hero Boarding Pass Ticket Card */}
      <Card variant="glow" style={styles.ticketCard}>
        {/* Ticket Header */}
        <View style={styles.ticketHeader}>
          <View style={styles.storeCol}>
            <Text style={styles.shopNameText} numberOfLines={1}>{shopName}</Text>
            <Text style={styles.shopAddressText} numberOfLines={1}>📍 {shopAddress}</Text>
          </View>
          <StatusBadge status={entry.status} />
        </View>

        {/* Big Ticket Number Banner */}
        <View style={styles.ticketNumberSection}>
          <Text style={styles.ticketLabel}>YOUR TICKET NUMBER</Text>
          <Text style={styles.ticketBigNumber}>{ticketCode}</Text>
        </View>

        {/* Progress Step Timeline */}
        <View style={styles.timelineWrap}>
          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep >= 1 && styles.stepCircleActive]}>
              <Ionicons name="checkmark" size={12} color="#FFF" />
            </View>
            <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Booked</Text>
          </View>

          <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />

          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep >= 1 && !isCompleted && !isCancelled && styles.stepCirclePulse, currentStep >= 2 && styles.stepCircleActive]}>
              {currentStep >= 2 ? (
                <Ionicons name="checkmark" size={12} color="#FFF" />
              ) : (
                <View style={styles.innerDot} />
              )}
            </View>
            <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Waiting</Text>
          </View>

          <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />

          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep >= 2 && styles.stepCircleActive]}>
              {currentStep >= 3 ? (
                <Ionicons name="checkmark" size={12} color="#FFF" />
              ) : (
                <View style={styles.innerDot} />
              )}
            </View>
            <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Serving</Text>
          </View>

          <View style={[styles.stepLine, currentStep === 3 && styles.stepLineActive]} />

          <View style={styles.stepItem}>
            <View style={[styles.stepCircle, currentStep === 3 && styles.stepCircleSuccess]}>
              {currentStep === 3 ? (
                <Ionicons name="checkmark" size={12} color="#FFF" />
              ) : (
                <View style={styles.innerDot} />
              )}
            </View>
            <Text style={[styles.stepLabel, currentStep === 3 && styles.stepLabelActive]}>Done</Text>
          </View>
        </View>
      </Card>

      {/* Two Key Metrics Cards */}
      <View style={styles.metricRow}>
        <Card variant="elevated" style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="people" size={20} color={colors.primary} />
          </View>
          <Text style={styles.metricBigVal}>{ahead}</Text>
          <Text style={styles.metricLabelText}>People Ahead</Text>
        </Card>

        <Card variant="elevated" style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.warningSubtle }]}>
            <Ionicons name="hourglass" size={20} color={colors.warning} />
          </View>
          <Text style={[styles.metricBigVal, { color: colors.warning }]}>~{wait}m</Text>
          <Text style={styles.metricLabelText}>Estimated Wait</Text>
        </Card>
      </View>

      {/* Selected Services Breakdown Card */}
      <Card variant="default" style={styles.servicesCard}>
        <View style={styles.serviceHeaderRow}>
          <Ionicons name="list" size={18} color={colors.primary} />
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
          <Text style={styles.mutedText}>Standard general counter ticket.</Text>
        )}
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionsWrap}>
        <AppButton
          title="Refresh Status"
          size="lg"
          onPress={() => load(true)}
          loading={refreshing}
          loadingText="Refreshing..."
          icon="refresh-outline"
        />
        <AppButton
          title="Return to Home"
          size="md"
          variant="secondary"
          onPress={() => navigation.goBack()}
          icon="home-outline"
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing.xs,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  liveSyncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successSubtle,
    borderColor: colors.successBorder,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  syncText: {
    color: colors.successLight,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  ticketCard: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  storeCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    marginRight: spacing.sm,
  },
  shopNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    flexWrap: "wrap",
  },
  shopAddressText: {
    fontSize: 13,
    color: colors.muted,
  },
  ticketNumberSection: {
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    gap: 4,
  },
  ticketLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 1,
  },
  ticketBigNumber: {
    fontSize: 34,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 1.5,
  },
  timelineWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  stepItem: {
    alignItems: "center",
    gap: 5,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepCirclePulse: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  stepCircleSuccess: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.muted,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: "700",
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  metricIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  metricBigVal: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  metricLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  servicesCard: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  serviceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  servicesList: {
    gap: spacing.md,
  },
  serviceItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceLeftCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    marginRight: spacing.sm,
  },
  serviceNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    flexWrap: "wrap",
  },
  serviceDurationText: {
    fontSize: 12,
    color: colors.muted,
  },
  serviceCostText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    flexShrink: 0,
  },
  totalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.successLight,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 13,
    fontStyle: "italic",
  },
  actionsWrap: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  errorCard: {
    alignItems: "center",
    padding: spacing.xxl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  errorMuted: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
});
