import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
  StatusBar,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation/types";
import { api } from "../../lib/api";
import { QueueEntry } from "../../types";
import { AlertCard } from "../../components/AlertCard";
import AppButton from "../../components/AppButton";
import {
  BellIcon,
  ClockIcon,
  ChevronBackIcon,
  CheckCircleIcon,
} from "../../assets/icons/AppIcons";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { typography, radii, shadows } from "../../theme/theme";

type Props = NativeStackScreenProps<RootStackParamList, "QueueStatus">;

export default function QueueStatusScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  // Edit Services Bottom Sheet State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = () => {
    const q: Record<string, number> = {};
    entry?.selectedServices?.forEach((s) => {
      q[s.name] = s.quantity || 1;
    });
    setEditQuantities(q);
    setIsEditModalOpen(true);
  };

  const setEditQuantity = (serviceName: string, delta: number) => {
    setEditQuantities((prev) => {
      const current = prev[serviceName] || 0;
      const next = Math.max(0, Math.min(50, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[serviceName];
        return copy;
      }
      return { ...prev, [serviceName]: next };
    });
  };

  const handleSaveEditedServices = async () => {
    if (!entry) return;
    const catalog =
      entry.businessId?.businessProfile?.services ||
      entry.businessId?.services ||
      entry.selectedServices ||
      [];

    const selected = catalog
      .filter((s: any) => (editQuantities[s.name] || 0) > 0)
      .map((s: any) => ({
        name: s.name,
        quantity: editQuantities[s.name],
        durationMin: s.durationMin,
        cost: s.cost,
      }));

    if (selected.length === 0) {
      alert("Please select at least one service.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await api.put(`/queue/${entry._id}/services`, {
        selectedServices: selected,
      });
      setEntry(res.data);
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update services.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleShareTicket = async () => {
    if (!entry) return;
    try {
      setSharing(true);
      const res = await api.post(`/queue/${entry._id}/share`);
      const token = res.data.shareToken;
      setShareToken(token);

      const shopName =
        entry.businessId?.businessProfile?.shopName ||
        entry.businessId?.name ||
        "QueueLess Store";
      const shareUrl = `https://queueless.com/shared/${token}`;
      const message = `Track my live queue spot at ${shopName} in real-time:\n${shareUrl}`;

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
      alert(err.response?.data?.message || "Could not generate share link.");
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!entry) return;
    try {
      await api.delete(`/queue/${entry._id}/share`);
      setShareToken(null);
      alert("Public share link has been revoked.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Could not revoke share link.");
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
      // non-blocking
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
          load(true);
        })
        .catch((err) => {
          alert(err.response?.data?.message || "Failed to cancel ticket.");
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
          { text: "Leave Queue", style: "destructive", onPress: confirmCancel },
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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading ticket status...</Text>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.entryNotFoundContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronBackIcon size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <AlertCard
          type="danger"
          title="Ticket Not Found"
          message="This ticket could not be found or has expired."
        />
      </View>
    );
  }

  const shopName =
    entry.businessId?.businessProfile?.shopName ||
    entry.businessId?.name ||
    "Store";

  const peopleAhead = entry.peopleAhead ?? 0;
  const waitMin = entry.currentEstimatedWait ?? 0;
  const isCompleted = entry.status === "completed";
  const isCancelled = entry.status === "cancelled";
  const isInProgress = entry.status === "in_progress";
  const isVerified = Boolean(entry.verifiedAt);
  const ticketIdSuffix = entry._id ? entry._id.slice(-6).toUpperCase() : "";

  // Progress bar fraction: 1 / (peopleAhead + 1) -> 100% when serving
  const progressFraction = isInProgress
    ? 1
    : Math.min(1, Math.max(0.1, 1 / (peopleAhead + 1)));

  const totalCost = (entry.selectedServices || []).reduce(
    (acc, s) => acc + (Number(s.cost) || 0) * (s.quantity || 1),
    0
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />

      {/* Header: chevron-back + shop name 20px */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ChevronBackIcon size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerShopName} numberOfLines={1}>
          {shopName}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alert Banner (entry.alert) */}
        {entry.alert?.active && !isAlertDismissed && (
          <View style={styles.alertBannerWrap}>
            <AlertCard
              type={entry.alert.type === "YOUR_TURN" ? "success" : "info"}
              title={entry.alert.title}
              message={entry.alert.message}
            />
            <TouchableOpacity
              onPress={() => setIsAlertDismissed(true)}
              style={styles.dismissAlertTouch}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Completed / Cancelled Status Card */}
        {isCompleted && (
          <View style={styles.statusResultCard}>
            <AlertCard
              type="success"
              title="Service Completed"
              message="Your visit has been completed. Thank you for using QueueLess!"
            />
          </View>
        )}

        {isCancelled && (
          <View style={styles.statusResultCard}>
            <AlertCard
              type="danger"
              title="Ticket Cancelled"
              message="This queue ticket has been cancelled."
            />
          </View>
        )}

        {/* Card 1: Your position, Progress track, Note box */}
        {!isCompleted && !isCancelled && (
          <View style={styles.cardBordered}>
            {/* Top row */}
            <View style={styles.card1TopRow}>
              <Text style={styles.positionGreenText}>Your position</Text>
              <Text style={styles.aheadMutedText}>
                {peopleAhead} People Ahead
              </Text>
            </View>

            {/* Progress track */}
            <View style={styles.trackContainer}>
              <View style={styles.trackBackground}>
                <View
                  style={[
                    styles.trackFill,
                    { width: `${progressFraction * 100}%` },
                  ]}
                />
              </View>

              {/* Left node (Wait time) */}
              <View style={[styles.nodeCircle, styles.nodeLeft]}>
                <View style={styles.innerDotGreen} />
              </View>

              {/* Right node (Status) */}
              <View
                style={[
                  styles.nodeCircle,
                  styles.nodeRight,
                  isInProgress || isVerified
                    ? styles.nodeCircleGreen
                    : styles.nodeCircleMuted,
                ]}
              >
                {(isInProgress || isVerified) && (
                  <View style={styles.innerDotGreen} />
                )}
              </View>
            </View>

            {/* Under nodes row */}
            <View style={styles.underNodesRow}>
              <View style={styles.nodeLabelLeft}>
                <Text style={styles.nodeWaitTime}>
                  ~{waitMin} min
                </Text>
                <Text style={styles.nodeWaitLabel}>Wait</Text>
              </View>

              <View style={styles.nodeLabelRight}>
                {isInProgress ? (
                  <Text style={styles.statusGreenText}>Now serving</Text>
                ) : isVerified ? (
                  <Text style={styles.statusGreenText}>Checked in</Text>
                ) : (
                  <Text style={styles.statusRedText}>Waiting for check-in</Text>
                )}
              </View>
            </View>

            {/* Dotted divider: 1px dashed #CFCFCF */}
            <View style={styles.dashedDivider} />

            {/* Note box */}
            <View style={styles.noteBox}>
              <Text style={styles.noteHeading}>Note:</Text>
              <View style={styles.noteItemRow}>
                <BellIcon size={20} color={colors.textPrimary} />
                <Text style={styles.noteItemText}>
                  Keep this screen open to get an alert when your turn is near.
                </Text>
              </View>
              <View style={styles.noteItemRow}>
                <ClockIcon size={20} color={colors.textPrimary} />
                <Text style={styles.noteItemText}>Please arrive on time.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Card 2: Queue Token QR Code */}
        {!isCancelled && (
          <View style={[styles.cardBordered, styles.marginTop16]}>
            <Text style={styles.tokenCardTitle}>Queue Token</Text>
            <Text style={styles.tokenCardSubtitle}>
              Show this QR code at reception to confirm your arrival.
            </Text>

            {isVerified ? (
              <View style={styles.verifiedCardWrap}>
                <AlertCard
                  type="success"
                  title="Counter Verified"
                  message={`Arrival verified by staff at ${new Date(
                    entry.verifiedAt!
                  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                />
              </View>
            ) : (
              <View style={styles.qrImageContainer}>
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=190x190&margin=8&data=${encodeURIComponent(
                      `ql-ticket:${entry._id}:${entry.verificationToken || ""}`
                    )}`,
                  }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.tokenIdText}>Token ID: #{ticketIdSuffix}</Text>
              </View>
            )}
          </View>
        )}

        {/* Selected Services Card */}
        <View style={[styles.cardBordered, styles.marginTop16]}>
          <View style={styles.servicesCardHeader}>
            <Text style={styles.servicesHeading}>Selected Services</Text>
            {entry.status === "waiting" && (
              <TouchableOpacity
                onPress={openEditModal}
                style={styles.editServicesOutlineBtn}
              >
                <Text style={styles.editServicesOutlineText}>Edit Services</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.servicesListWrap}>
            {entry.selectedServices?.map((s, idx) => {
              const qty = s.quantity || 1;
              const unitCost = Number(s.cost) || 0;
              return (
                <View key={idx} style={styles.serviceRowItem}>
                  <Text style={styles.serviceItemName}>
                    {s.name} <Text style={styles.qtyText}>×{qty}</Text>
                  </Text>
                  <Text style={styles.serviceItemCost}>
                    ₹{unitCost * qty}
                  </Text>
                </View>
              );
            })}
            <View style={styles.serviceTotalDivider} />
            <View style={styles.serviceTotalRow}>
              <Text style={styles.serviceTotalLabel}>Total Amount</Text>
              <Text style={styles.serviceTotalValue}>₹{totalCost}</Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionsContainer}>
          {/* Share Live Ticket Outline Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleShareTicket}
            disabled={sharing}
            style={styles.shareOutlineButton}
          >
            <Ionicons name="share-outline" size={18} color="#000000" />
            <Text style={styles.shareOutlineText}>
              {sharing ? "Generating Link..." : "Share Live Ticket"}
            </Text>
          </TouchableOpacity>

          {/* Revoke link row if active */}
          {shareToken && (
            <View style={styles.revokeRow}>
              <Text style={styles.revokeText}>Public link active</Text>
              <TouchableOpacity onPress={handleRevokeShare}>
                <Text style={styles.revokeLink}>Revoke</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Leave Queue Gradient Button (centered, width 286, height 43) */}
          {!isCompleted && !isCancelled && (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleCancelTicket}
              disabled={cancelling}
              style={[styles.leaveQueueTouch, shadows.primaryButton]}
            >
              <LinearGradient
                colors={["#284D83", "#3E6BB2"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.leaveQueueGradient}
              >
                <Text style={styles.leaveQueueText}>
                  {cancelling ? "Leaving..." : "Leave Queue"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Edit Services Bottom Sheet Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Services</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {(
                entry.businessId?.businessProfile?.services ||
                entry.businessId?.services ||
                entry.selectedServices ||
                []
              ).map((svc: any) => {
                const qty = editQuantities[svc.name] || 0;
                const isSelected = qty > 0;

                return (
                  <View
                    key={svc.name}
                    style={[
                      styles.modalServiceRow,
                      isSelected && styles.modalServiceRowSelected,
                    ]}
                  >
                    <View style={styles.modalServiceInfo}>
                      <Text style={styles.modalServiceName}>{svc.name}</Text>
                      <Text style={styles.modalServiceMeta}>
                        {svc.durationMin} min • ₹{svc.cost}
                      </Text>
                    </View>

                    <View style={styles.modalStepper}>
                      <TouchableOpacity
                        onPress={() => setEditQuantity(svc.name, -1)}
                        disabled={qty === 0}
                        style={[
                          styles.stepperCircle,
                          qty === 0 && styles.stepperCircleDisabled,
                        ]}
                      >
                        <Ionicons
                          name="remove"
                          size={16}
                          color={qty === 0 ? colors.borderLight : colors.primary}
                        />
                      </TouchableOpacity>

                      <Text style={styles.stepperCount}>{qty}</Text>

                      <TouchableOpacity
                        onPress={() => setEditQuantity(svc.name, 1)}
                        style={styles.stepperCircle}
                      >
                        <Ionicons name="add" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.modalButtonWrap}>
              <AppButton
                title="Save Changes"
                onPress={handleSaveEditedServices}
                loading={isSavingEdit}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    loadingText: {
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      color: colors.textSecondary,
    },
    entryNotFoundContainer: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.bg,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: colors.bg,
    },
    backBtn: {
      padding: 6,
      marginRight: 10,
    },
    headerShopName: {
      fontSize: 20,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    alertBannerWrap: {
      position: "relative",
      marginBottom: 16,
    },
    dismissAlertTouch: {
      position: "absolute",
      top: 14,
      right: 14,
      padding: 4,
    },
    statusResultCard: {
      marginBottom: 16,
    },
    cardBordered: {
      backgroundColor: colors.card,
      borderRadius: radii.borderedCard,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    marginTop16: {
      marginTop: 16,
    },
    card1TopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    positionGreenText: {
      fontSize: 12,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.successProgress,
    },
    aheadMutedText: {
      fontSize: 12,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    trackContainer: {
      height: 24,
      position: "relative",
      justifyContent: "center",
      marginBottom: 8,
    },
    trackBackground: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: "hidden",
    },
    trackFill: {
      height: 6,
      backgroundColor: colors.successProgress,
      borderRadius: 3,
    },
    nodeCircle: {
      position: "absolute",
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    nodeLeft: {
      left: "15%",
      borderColor: colors.successProgress,
    },
    nodeRight: {
      right: "15%",
    },
    nodeCircleGreen: {
      borderColor: colors.successProgress,
    },
    nodeCircleMuted: {
      borderColor: colors.border,
    },
    innerDotGreen: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.successProgress,
    },
    underNodesRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 18,
      paddingHorizontal: 8,
    },
    nodeLabelLeft: {
      alignItems: "flex-start",
    },
    nodeWaitTime: {
      fontSize: 13,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    nodeWaitLabel: {
      fontSize: 10,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    nodeLabelRight: {
      alignItems: "flex-end",
    },
    statusGreenText: {
      fontSize: 12,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.successLight,
    },
    statusRedText: {
      fontSize: 12,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.danger,
    },
    dashedDivider: {
      height: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      marginVertical: 14,
    },
    noteBox: {
      backgroundColor: colors.cardSoft,
      borderRadius: radii.alert,
      padding: 12,
      gap: 8,
    },
    noteHeading: {
      fontSize: 13,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    noteItemRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
    },
    noteItemText: {
      flex: 1,
      fontSize: 12,
      fontFamily: typography.families.interRegular,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    tokenCardTitle: {
      fontSize: 17,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      textAlign: "center",
    },
    tokenCardSubtitle: {
      fontSize: 11,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 16,
    },
    qrImageContainer: {
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      padding: 12,
      borderRadius: radii.md,
    },
    qrImage: {
      width: 190,
      height: 190,
      backgroundColor: "#FFFFFF",
    },
    tokenIdText: {
      fontSize: 12,
      fontFamily: typography.families.interMedium,
      color: "#000000",
      marginTop: 8,
    },
    verifiedCardWrap: {
      marginVertical: 8,
    },
    servicesCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    servicesHeading: {
      fontSize: 16,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    editServicesOutlineBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardSoft,
    },
    editServicesOutlineText: {
      fontSize: 12,
      fontFamily: typography.families.interMedium,
      color: colors.primary,
    },
    servicesListWrap: {
      gap: 8,
    },
    serviceRowItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    serviceItemName: {
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.textPrimary,
    },
    qtyText: {
      color: colors.muted,
    },
    serviceItemCost: {
      fontSize: 14,
      fontFamily: typography.families.interMedium,
      color: colors.textPrimary,
    },
    serviceTotalDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    serviceTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    serviceTotalLabel: {
      fontSize: 14,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    serviceTotalValue: {
      fontSize: 16,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.primary,
    },
    actionsContainer: {
      marginTop: 24,
      alignItems: "center",
      gap: 16,
    },
    shareOutlineButton: {
      width: "100%",
      height: 46,
      borderRadius: radii.button,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardSoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    shareOutlineText: {
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    revokeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    revokeText: {
      fontSize: 12,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    revokeLink: {
      fontSize: 12,
      fontFamily: typography.families.interMedium,
      color: colors.danger,
      textDecorationLine: "underline",
    },
    leaveQueueTouch: {
      width: 286,
      height: 43,
      borderRadius: radii.button,
    },
    leaveQueueGradient: {
      width: "100%",
      height: "100%",
      borderRadius: radii.button,
      alignItems: "center",
      justifyContent: "center",
    },
    leaveQueueText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.cardElevated,
      borderTopLeftRadius: radii.heroCard,
      borderTopRightRadius: radii.heroCard,
      paddingTop: 24,
      paddingHorizontal: 20,
      maxHeight: "80%",
    },
    modalHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    modalScroll: {
      maxHeight: 320,
      marginBottom: 20,
    },
    modalServiceRow: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    modalServiceRowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySubtle,
    },
    modalServiceInfo: {
      flex: 1,
    },
    modalServiceName: {
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    modalServiceMeta: {
      fontSize: 12,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
      marginTop: 4,
    },
    modalStepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    stepperCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    stepperCircleDisabled: {
      borderColor: colors.border,
    },
    stepperCount: {
      fontSize: 15,
      fontFamily: typography.families.interSemiBold,
      color: colors.textPrimary,
      minWidth: 16,
      textAlign: "center",
    },
    modalButtonWrap: {
      marginTop: 8,
    },
  });
}
