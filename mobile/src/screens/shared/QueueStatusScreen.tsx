import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
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
  const [cancelling, setCancelling] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const handleShareTicket = async () => {
    if (!entry) return;
    try {
      setSharing(true);
      const res = await api.post(`/queue/${entry._id}/share`);
      const token = res.data.shareToken;
      setShareToken(token);

      const shopName = entry.businessId?.businessProfile?.shopName || "QueueLess Store";
      const shareUrl = `https://queueless.com/shared/${token}`;
      const message = `Track my live queue spot (#${entry._id.slice(-4).toUpperCase()}) at ${shopName} in real-time:\n${shareUrl}`;

      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
          window.alert(`Share link copied to clipboard!\n${shareUrl}`);
        }
      } else {
        await Share.share({
          message,
          url: shareUrl,
          title: `QueueLess — ${shopName} Live Ticket`,
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Could not generate share link.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Share Error", msg);
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!entry) return;
    const confirmRevoke = async () => {
      try {
        await api.delete(`/queue/${entry._id}/share`);
        setShareToken(null);
        const msg = "Public share link has been revoked.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Link Revoked", msg);
      } catch (err: any) {
        const msg = err.response?.data?.message || "Could not revoke share link.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to revoke the public share link?")) {
        confirmRevoke();
      }
    } else {
      Alert.alert(
        "Revoke Share Link",
        "Are you sure you want to revoke the public share link? Anyone with the link will no longer be able to track your queue.",
        [
          { text: "Keep Link", style: "cancel" },
          { text: "Revoke", style: "destructive", onPress: confirmRevoke },
        ]
      );
    }
  };

  const load = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const response = await api.get(`/queue/status/${route.params.id}`);
      setEntry(response.data);

      if (response.data?.alert?.active && !isAlertDismissed) {
        if (Platform.OS !== "web") {
          try {
            Vibration.vibrate([0, 250, 100, 250]);
          } catch {}
        }
      }
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

  const handleCancelTicket = () => {
    if (!entry) return;
    const confirmCancel = () => {
      setCancelling(true);
      api
        .post("/queue/cancel", { queueId: entry._id })
        .then(() => {
          if (Platform.OS === "web") {
            window.alert("Your ticket has been cancelled.");
          } else {
            Alert.alert("Ticket Cancelled", "Your spot in line has been cancelled.");
          }
          load(true);
        })
        .catch((err) => {
          const msg = err.response?.data?.message || "Failed to cancel ticket.";
          if (Platform.OS === "web") {
            window.alert(msg);
          } else {
            Alert.alert("Error", msg);
          }
        })
        .finally(() => setCancelling(false));
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to leave this queue? Your spot will be forfeited.")) {
        confirmCancel();
      }
    } else {
      Alert.alert(
        "Leave Queue",
        "Are you sure you want to leave this queue? Your spot will be forfeited.",
        [
          { text: "Keep Spot", style: "cancel" },
          { text: "Leave Queue", style: "destructive", onPress: confirmCancel }
        ]
      );
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

      {/* Turn Approaching / Your Turn Notification Banner */}
      {entry.alert?.active && !isAlertDismissed && (
        <Card
          variant="elevated"
          style={[
            styles.notifAlertCard,
            entry.alert.type === "YOUR_TURN"
              ? styles.notifAlertCardYourTurn
              : styles.notifAlertCardApproaching
          ]}
        >
          <View style={styles.notifAlertHeader}>
            <View
              style={[
                styles.notifAlertIconCircle,
                entry.alert.type === "YOUR_TURN"
                  ? styles.notifIconCircleYourTurn
                  : styles.notifIconCircleApproaching
              ]}
            >
              <Ionicons
                name={entry.alert.type === "YOUR_TURN" ? "sparkles" : "notifications"}
                size={18}
                color={entry.alert.type === "YOUR_TURN" ? colors.success : colors.warning}
              />
            </View>
            <View style={styles.notifAlertTextCol}>
              <View style={styles.notifPillRow}>
                <Text
                  style={[
                    styles.notifBadgeTag,
                    { color: entry.alert.type === "YOUR_TURN" ? colors.success : colors.warning }
                  ]}
                >
                  {entry.alert.type === "YOUR_TURN" ? "COUNTER READY" : "TURN APPROACHING"}
                </Text>
              </View>
              <Text style={styles.notifAlertTitle}>{entry.alert.title}</Text>
              <Text style={styles.notifAlertBody}>{entry.alert.message}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsAlertDismissed(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.notifDismissBtn}
            >
              <Ionicons name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </Card>
      )}

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
          <Text style={styles.metricLabelText}>
            {ahead === 1 ? "Person Ahead" : "People Ahead"}
          </Text>
        </Card>

        <Card variant="elevated" style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.warningSubtle }]}>
            <Ionicons name="hourglass" size={20} color={colors.warning} />
          </View>
          <Text style={[styles.metricBigVal, { color: colors.warning }]}>
            {entry.prediction?.rangeDisplay ? `~${entry.prediction.rangeDisplay}` : `~${wait}m`}
          </Text>
          <Text style={styles.metricLabelText}>Estimated Wait</Text>
        </Card>
      </View>

      {/* Smart Prediction Telemetry Pill */}
      {entry.prediction?.confidenceLabel && !isCompleted && !isCancelled && (
        <View style={styles.predictionPill}>
          <View style={styles.predictionPillLeft}>
            <Ionicons name="sparkles" size={13} color={colors.warning} />
            <Text style={styles.predictionPillText} numberOfLines={1}>
              {entry.prediction.confidenceLabel}
            </Text>
          </View>
          {entry.estimatedServiceStartTime && wait > 0 && (
            <Text style={styles.estStartTimeText}>
              Est. {new Date(entry.estimatedServiceStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      )}

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
        {!isCancelled && (
          <AppButton
            title="Share Live Ticket"
            size="md"
            variant="secondary"
            onPress={handleShareTicket}
            loading={sharing}
            loadingText="Generating Link..."
            icon="share-social-outline"
          />
        )}

        {shareToken && !isCancelled && (
          <View style={styles.shareActiveBanner}>
            <View style={styles.shareActiveLeft}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={styles.shareActiveText}>Public link active</Text>
            </View>
            <TouchableOpacity onPress={handleRevokeShare} activeOpacity={0.7}>
              <Text style={styles.revokeText}>Revoke Link</Text>
            </TouchableOpacity>
          </View>
        )}

        <AppButton
          title="Refresh Status"
          size="lg"
          onPress={() => load(true)}
          loading={refreshing}
          loadingText="Refreshing..."
          icon="refresh-outline"
        />
        {!isCompleted && !isCancelled && (
          <AppButton
            title="Leave Queue"
            size="md"
            variant="danger"
            onPress={handleCancelTicket}
            loading={cancelling}
            loadingText="Leaving Queue..."
            icon="close-circle-outline"
          />
        )}
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
  predictionPill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  predictionPillLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: spacing.sm,
  },
  predictionPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  estStartTimeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },
  notifAlertCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  notifAlertCardYourTurn: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.4)",
  },
  notifAlertCardApproaching: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.4)",
  },
  notifAlertHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  notifAlertIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  notifIconCircleYourTurn: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  notifIconCircleApproaching: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  notifAlertTextCol: {
    flex: 1,
  },
  notifPillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  notifBadgeTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  notifAlertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  notifAlertBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  notifDismissBtn: {
    padding: 4,
  },
  shareActiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  shareActiveLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  shareActiveText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  revokeText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "700",
  },
});

