import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import AppLoader from "../../components/AppLoader";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";
import StatusBadge from "../../components/StatusBadge";
import { Chip } from "../../components/Chip";
import { AlertCard } from "../../components/AlertCard";
import { OfferBadgeIcon } from "../../assets/icons/AppIcons";
import {
  api,
  getBusinessUpdates,
  createBusinessUpdate,
  deleteBusinessUpdate
} from "../../lib/api";
import { timeAgo } from "../../lib/time";
import { BusinessTabParamList } from "../../navigation/types";
import { BusinessAnalytics, QueueEntry, ServiceItem } from "../../types";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { radii, shadows, spacing, typography } from "../../theme/theme";

type BusinessProfileResponse = {
  shopName: string;
  address: string;
  uniqueQrCode: string;
  services: ServiceItem[];
};

type Props = BottomTabScreenProps<BusinessTabParamList, "Dashboard">;

const RANGE_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "all", label: "All Time" },
];

export default function BusinessDashboardScreen(_: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<BusinessProfileResponse | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [cost, setCost] = useState("");
  const [copied, setCopied] = useState(false);
  const [addingService, setAddingService] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [addServiceExpanded, setAddServiceExpanded] = useState(false);

  // Ticket Details & Verification Modal State
  const [selectedTicket, setSelectedTicket] = useState<QueueEntry | null>(null);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyInput, setVerifyInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    ticket?: any;
  } | null>(null);

  // Counter Ticket QR Scanner & Verification State
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [targetTicketForVerification, setTargetTicketForVerification] = useState<QueueEntry | null>(null);
  const [isManualInputMode, setIsManualInputMode] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (verifyModalVisible && !isManualInputMode) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [verifyModalVisible, isManualInputMode]);

  const openScannerModal = (targetTicket?: QueueEntry) => {
    setTargetTicketForVerification(targetTicket || null);
    setVerificationResult(null);
    setVerifyInput("");
    setIsManualInputMode(false);
    setIsProcessingScan(false);
    setVerifyModalVisible(true);
  };

  // Navigation Tab State (Queue / Analytics / Catalog / Updates)
  const [activeTab, setActiveTab] = useState<"queue" | "analytics" | "catalog" | "updates">("queue");
  const [analyticsRange, setAnalyticsRange] = useState<string>("7d");
  const [analyticsData, setAnalyticsData] = useState<BusinessAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Business Updates State
  const [businessUpdates, setBusinessUpdates] = useState<any[]>([]);
  const [newUpdateModalOpen, setNewUpdateModalOpen] = useState(false);
  const [newUpdateType, setNewUpdateType] = useState<"alert" | "offer" | "info">("alert");
  const [newUpdateTitle, setNewUpdateTitle] = useState("");
  const [newUpdateMessage, setNewUpdateMessage] = useState("");
  const [newUpdateDays, setNewUpdateDays] = useState(7);
  const [publishingUpdate, setPublishingUpdate] = useState(false);
  const [updatePublishError, setUpdatePublishError] = useState("");
  const [updatePublishSuccess, setUpdatePublishSuccess] = useState(false);

  const fetchOwnUpdates = async () => {
    try {
      const data = await getBusinessUpdates();
      setBusinessUpdates(data || []);
    } catch {}
  };

  const handlePublishUpdate = async () => {
    setUpdatePublishError("");
    if (!newUpdateTitle.trim()) {
      setUpdatePublishError("Title is required (max 60 characters).");
      return;
    }
    if (newUpdateTitle.trim().length > 60) {
      setUpdatePublishError("Title must not exceed 60 characters.");
      return;
    }
    if (!newUpdateMessage.trim()) {
      setUpdatePublishError("Message is required (max 200 characters).");
      return;
    }
    if (newUpdateMessage.trim().length > 200) {
      setUpdatePublishError("Message must not exceed 200 characters.");
      return;
    }

    try {
      setPublishingUpdate(true);
      await createBusinessUpdate({
        type: newUpdateType,
        title: newUpdateTitle.trim(),
        message: newUpdateMessage.trim(),
        validForDays: newUpdateType === "offer" ? newUpdateDays : undefined,
      });

      setNewUpdateModalOpen(false);
      setNewUpdateTitle("");
      setNewUpdateMessage("");
      setNewUpdateDays(7);
      setUpdatePublishSuccess(true);
      fetchOwnUpdates();

      setTimeout(() => {
        setUpdatePublishSuccess(false);
      }, 3500);
    } catch (err: any) {
      setUpdatePublishError(err.response?.data?.message || "Failed to publish update.");
    } finally {
      setPublishingUpdate(false);
    }
  };

  const handleDeleteUpdate = (id: string) => {
    const confirmDelete = async () => {
      try {
        await deleteBusinessUpdate(id);
        setBusinessUpdates((prev) => prev.filter((u) => u._id !== id));
      } catch (err: any) {
        Alert.alert("Error", err.response?.data?.message || "Failed to delete update.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to delete this announcement?")) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Delete Announcement",
        "Are you sure you want to delete this announcement? It will be removed from customer feeds.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: confirmDelete },
        ]
      );
    }
  };

  const copyToClipboard = async () => {
    if (!profile?.uniqueQrCode) return;
    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(profile.uniqueQrCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const [profileRes, queueRes] = await Promise.all([
        api.get("/business/me"),
        api.get("/business/queue"),
      ]);
      setProfile(profileRes.data);
      setQueue(queueRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (range: string = analyticsRange, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setAnalyticsLoading(true);
      const res = await api.get(`/business/analytics?range=${range}`);
      setAnalyticsData(res.data);
    } catch (err) {
      console.error("Failed to load business analytics:", err);
    } finally {
      setAnalyticsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === "analytics") {
        await fetchAnalytics(analyticsRange, true);
      } else if (activeTab === "updates") {
        await fetchOwnUpdates();
      } else {
        const [profileRes, queueRes] = await Promise.all([
          api.get("/business/me"),
          api.get("/business/queue"),
        ]);
        setProfile(profileRes.data);
        setQueue(queueRes.data || []);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (activeTab === "analytics") {
      fetchAnalytics(analyticsRange);
    } else if (activeTab === "updates") {
      fetchOwnUpdates();
    }
  }, [activeTab, analyticsRange]);

  const activeQueue = useMemo(
    () => queue.filter((item) => item.status === "waiting" || item.status === "in_progress"),
    [queue]
  );

  const processedQueue = useMemo(
    () =>
      queue
        .filter((item) => item.status === "completed" || item.status === "cancelled")
        .sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.joinedAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.joinedAt || 0).getTime();
          return timeB - timeA;
        })
        .slice(0, 10),
    [queue]
  );

  const peakArrivalHour = useMemo(() => {
    if (!analyticsData?.peakHours?.length) return null;
    const sorted = [...analyticsData.peakHours].sort((a, b) => b.count - a.count);
    return sorted[0]?.count > 0 ? sorted[0] : null;
  }, [analyticsData]);

  const topPeakHours = useMemo(() => {
    if (!analyticsData?.peakHours?.length) return [];
    return [...analyticsData.peakHours]
      .filter((h) => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [analyticsData]);

  const maxPeakCount = useMemo(() => {
    if (!analyticsData?.peakHours?.length) return 1;
    return Math.max(...analyticsData.peakHours.map((h) => h.count), 1);
  }, [analyticsData]);

  const addService = async () => {
    if (!profile || !serviceName || !durationMin || !cost) {
      const msg = "Please enter service name, duration in minutes, and cost.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Missing details", msg);
      return;
    }

    const updated = [
      ...(profile.services || []),
      { name: serviceName.trim(), durationMin: Number(durationMin), cost: Number(cost) },
    ];

    try {
      setAddingService(true);
      const response = await api.put("/business/services", { services: updated });
      setProfile((prev) => (prev ? { ...prev, services: response.data.services } : prev));
      setServiceName("");
      setDurationMin("");
      setCost("");
    } catch {
      const msg = "Could not update services. Please try again.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Unable to save", msg);
    } finally {
      setAddingService(false);
    }
  };

  const confirmRemoveService = (index: number, name: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to remove "${name}"?`)) {
        removeService(index);
      }
    } else {
      Alert.alert(
        "Remove Service",
        `Are you sure you want to delete "${name}" from your service catalog?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: () => removeService(index) },
        ]
      );
    }
  };

  const removeService = async (index: number) => {
    if (!profile) return;
    const updated = [...profile.services];
    updated.splice(index, 1);

    try {
      const response = await api.put("/business/services", { services: updated });
      setProfile((prev) => (prev ? { ...prev, services: response.data.services } : prev));
    } catch {
      const msg = "Could not remove service.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Unable to remove", msg);
    }
  };

  const updateStatus = async (id: string, status: "completed" | "cancelled" | "in_progress") => {
    try {
      await api.put(`/business/queue/${id}/status`, { status });
      await load();
      if (selectedTicket && selectedTicket._id === id) {
        setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
      }
    } catch {
      const msg = "Status update failed. Please retry.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  };

  const processTicketVerification = async (rawInput: string) => {
    const trimmed = (rawInput || "").trim();
    if (!trimmed) {
      const msg = "Please scan ticket QR code or enter ticket ID / token.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Missing Input", msg);
      setIsProcessingScan(false);
      return;
    }

    setIsVerifying(true);
    try {
      // 1. Parse token and ticketId from QR string or manual input
      let parsedTicketId: string | undefined;
      let parsedToken: string | undefined;

      if (trimmed.startsWith("ql-ticket:")) {
        const parts = trimmed.split(":");
        if (parts.length >= 3) {
          parsedTicketId = parts[1];
          parsedToken = parts[2];
        } else if (parts.length === 2) {
          parsedToken = parts[1];
        }
      } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const obj = JSON.parse(trimmed);
          parsedTicketId = obj.ticketId;
          parsedToken = obj.token;
        } catch {
          parsedToken = trimmed;
        }
      } else {
        parsedToken = trimmed;
        parsedTicketId = trimmed;
      }

      // 2. If targetTicket was selected from a specific live queue request:
      // Verify that this scanned QR corresponds to that selected customer
      if (targetTicketForVerification) {
        const targetId = targetTicketForVerification._id;
        const targetSuffix = targetId.slice(-4).toUpperCase();

        const matchesTargetId = parsedTicketId && (
          parsedTicketId.toLowerCase() === targetId.toLowerCase() ||
          targetId.toUpperCase().endsWith(parsedTicketId.toUpperCase())
        );
        const matchesTargetToken = parsedToken && (
          targetTicketForVerification.verificationToken === parsedToken
        );

        if (parsedTicketId && !matchesTargetId && !matchesTargetToken) {
          setVerificationResult({
            success: false,
            message: `Ticket Mismatch: Scanned ticket does not match ${targetTicketForVerification.customerId?.name || targetTicketForVerification.customerName || "Customer"} (Ticket #${targetSuffix}).`,
          });
          setIsVerifying(false);
          setIsProcessingScan(false);
          return;
        }
      }

      // 3. Call backend verification endpoint (enforces store queue ownership)
      const res = await api.post("/business/queue/verify", {
        ticketId: parsedTicketId || (targetTicketForVerification ? targetTicketForVerification._id : undefined),
        token: parsedToken || trimmed,
      });

      const verifiedTicket = res.data.ticket;

      // 4. If ticket was waiting, automatically start the customer's service (in_progress)
      let serviceStarted = false;
      if (verifiedTicket && verifiedTicket.status === "waiting") {
        try {
          await api.put(`/business/queue/${verifiedTicket._id}/status`, {
            status: "in_progress",
          });
          verifiedTicket.status = "in_progress";
          serviceStarted = true;
        } catch (statusErr) {
          console.warn("Could not automatically start service status:", statusErr);
        }
      }

      const custName = verifiedTicket?.customerId?.name || verifiedTicket?.customerName || "Customer";
      const ticketNum = verifiedTicket?._id?.slice(-4).toUpperCase() || "";

      setVerificationResult({
        success: true,
        message: serviceStarted
          ? `Ticket Verified! Service has started for ${custName} (#${ticketNum}).`
          : `Ticket #${ticketNum} verified at counter successfully.`,
        ticket: verifiedTicket,
      });

      await load();

      if (selectedTicket && verifiedTicket && selectedTicket._id === verifiedTicket._id) {
        setSelectedTicket(verifiedTicket);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to verify customer ticket";
      setVerificationResult({
        success: false,
        message: msg,
      });
    } finally {
      setIsVerifying(false);
      setTimeout(() => setIsProcessingScan(false), 2000);
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isProcessingScan || isVerifying || !data) return;
    setIsProcessingScan(true);
    await processTicketVerification(data);
  };

  const handleVerifySelectedTicket = async () => {
    if (!selectedTicket) return;
    // Open scanner modal pre-targeted to this ticket
    setTicketModalVisible(false);
    openScannerModal(selectedTicket);
  };

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <AppLoader
          message="Loading store dashboard..."
          submessage="Retrieving live queue and catalog"
        />
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
      {/* Store Header Row */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.storeIconWrap}>
            <Ionicons name="storefront" size={22} color={colors.primary} />
          </View>
          <View style={styles.flex1}>
            <View style={styles.shopNameRow}>
              <Text style={styles.title} numberOfLines={1}>
                {profile?.shopName || "Business Dashboard"}
              </Text>
              <StatusBadge status="open" size="sm" />
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              📍 {profile?.address || "Store location"}
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Segmented Tab Bar - Styled with Chips */}
      <View style={styles.chipTabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipTabScroll}
        >
          <Chip
            label={`Queue (${activeQueue.length})`}
            active={activeTab === "queue"}
            onPress={() => setActiveTab("queue")}
          />
          <Chip
            label="Analytics"
            active={activeTab === "analytics"}
            onPress={() => setActiveTab("analytics")}
          />
          <Chip
            label={`Catalog (${profile?.services?.length || 0})`}
            active={activeTab === "catalog"}
            onPress={() => setActiveTab("catalog")}
          />
          <Chip
            label={`Updates (${businessUpdates.length})`}
            active={activeTab === "updates"}
            onPress={() => setActiveTab("updates")}
          />
        </ScrollView>
      </View>

      {/* TAB 1: LIVE QUEUE */}
      {activeTab === "queue" && (
        <View style={styles.tabContentContainer}>
          {/* Store QR Code Check-in Card (Shown by default as requested) */}
          <Card variant="elevated" style={styles.qrCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTitleWrap}>
                <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Store Check-In QR</Text>
              </View>
              <StatusBadge status="open" label="SCAN READY" pulse size="sm" />
            </View>

            {profile?.uniqueQrCode ? (
              <View style={styles.qrCenterWrap}>
                <View style={styles.qrWhiteBox}>
                  <Image
                    source={{
                      uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(
                        profile.uniqueQrCode
                      )}`,
                    }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.codeSnippetBox}>
                  <View style={styles.codeTextCol}>
                    <Text style={styles.codeLabel}>STORE QR IDENTIFIER</Text>
                    <Text style={styles.codeString} numberOfLines={1}>
                      {profile.uniqueQrCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.copyBtn, copied && styles.copyBtnActive]}
                    onPress={copyToClipboard}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Copy store QR identifier"
                  >
                    <Ionicons
                      name={copied ? "checkmark-circle" : "copy-outline"}
                      size={14}
                      color={copied ? colors.success : colors.primary}
                    />
                    <Text style={[styles.copyBtnText, copied && styles.copiedText]}>
                      {copied ? "Copied!" : "Copy"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.qrHelpText}>
                  Display this QR code at your checkout desk. Customers scan it with their phone to join line without crowding.
                </Text>
              </View>
            ) : null}
          </Card>

          {/* Live Queue Section */}
          <View style={styles.sectionWrap}>
            <SectionHeader
              title="Live Queue"
              subtitle="Customers currently waiting or being served"
              icon="people-outline"
              count={activeQueue.length}
              rightElement={
                <View style={styles.headerActionsRow}>
                  <TouchableOpacity
                    style={styles.headerScanBtn}
                    onPress={() => openScannerModal()}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Scan customer ticket QR"
                  >
                    <Ionicons name="qr-code-outline" size={14} color="#FFF" />
                    <Text style={styles.headerScanBtnText}>Scan Ticket</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.headerRefreshBtn}
                    onPress={onRefresh}
                    activeOpacity={0.7}
                    disabled={refreshing}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh live queue"
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={15}
                      color={colors.primary}
                      style={refreshing ? { opacity: 0.5 } : undefined}
                    />
                  </TouchableOpacity>
                </View>
              }
            />

            {activeQueue.length === 0 ? (
              <EmptyState
                icon="checkmark-circle-outline"
                iconColor={colors.success}
                title="All Caught Up!"
                description="There are no customers currently waiting in line. New check-ins will appear here immediately."
              />
            ) : (
              <View style={styles.queueList}>
                {activeQueue.map((item, index) => {
                  return (
                    <Card key={item._id} variant="elevated" style={styles.queueItemCard}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedTicket(item);
                          setTicketModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.queueItemHeader}>
                          <View style={styles.positionBadge}>
                            <Text style={styles.positionText}>#{index + 1}</Text>
                          </View>

                          <View style={styles.queueItemInfo}>
                            <View style={styles.nameBadgeRow}>
                              <Text style={styles.customerName} numberOfLines={1}>
                                {item.customerId?.name || item.customerName || "Customer Ticket"}
                              </Text>
                              {item.verifiedAt ? (
                                <View style={styles.verifiedChip}>
                                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                  <Text style={styles.verifiedChipText}>Verified</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.ticketPill}>
                              Ticket #{item._id.slice(-4).toUpperCase()} • Tap for details
                            </Text>
                          </View>

                          <StatusBadge status={item.status} size="sm" />
                        </View>

                        {/* Services summary */}
                        {item.selectedServices?.length ? (
                          <View style={styles.itemServicesRow}>
                            {item.selectedServices.map((s, idx) => {
                              const qty = s.quantity || 1;
                              return (
                                <View key={`${s.name}_${idx}`} style={styles.serviceChip}>
                                  <Text style={styles.serviceChipText}>
                                    {s.name} {qty > 1 ? `(×${qty})` : ""} (${(s.cost || 0) * qty})
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </TouchableOpacity>

                      {/* Action buttons row — If waiting, allow scanning ticket QR to claim & start service directly */}
                      {item.status === "waiting" ? (
                        <View style={styles.itemActionRow}>
                          <TouchableOpacity
                            style={styles.verifyAndStartBtn}
                            onPress={() => openScannerModal(item)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="qr-code-outline" size={15} color="#FFF" />
                            <Text style={styles.verifyAndStartBtnText}>Scan QR & Start</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={() => updateStatus(item._id, "cancelled")}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="close" size={15} color={colors.danger} />
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.inServiceContainer}>
                          <View style={styles.inServiceBadge}>
                            <Ionicons name="flash" size={12} color={colors.info} />
                            <Text style={styles.inServiceBadgeText}>SERVICE IN PROGRESS</Text>
                          </View>

                          <View style={styles.itemActionRow}>
                            <TouchableOpacity
                              style={styles.doneBtn}
                              onPress={() => updateStatus(item._id, "completed")}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="checkmark-done" size={15} color="#FFF" />
                              <Text style={styles.doneBtnText}>Mark Completed</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.cancelBtn}
                              onPress={() => updateStatus(item._id, "cancelled")}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="close" size={15} color={colors.danger} />
                              <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </Card>
                  );
                })}
              </View>
            )}
          </View>

          {/* Processed Customers Section */}
          <View style={styles.sectionWrap}>
            <SectionHeader
              title="Processed Customers"
              subtitle="Recently served or resolved customers (max 10)"
              icon="checkmark-done-circle-outline"
              iconColor={colors.success}
              count={processedQueue.length}
            />

            {processedQueue.length === 0 ? (
              <EmptyState
                icon="time-outline"
                iconColor={colors.muted}
                title="No Processed Customers Yet"
                description="Customers whose service is completed or cancelled will appear here."
              />
            ) : (
              <View style={styles.queueList}>
                {processedQueue.map((item) => {
                  const processedTimestamp = item.updatedAt || item.joinedAt;
                  const processedTimeStr = processedTimestamp
                    ? new Date(processedTimestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";

                  return (
                    <Card key={item._id} variant="subtle" style={styles.processedItemCard}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedTicket(item);
                          setTicketModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.processedItemHeader}>
                          <View style={styles.processedItemInfo}>
                            <View style={styles.processedNameRow}>
                              <View style={styles.nameBadgeRow}>
                                <Text style={styles.customerName} numberOfLines={1}>
                                  {item.customerId?.name || item.customerName || "Customer"}
                                </Text>
                                {item.verifiedAt ? (
                                  <View style={styles.verifiedChip}>
                                    <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                                    <Text style={styles.verifiedChipText}>Verified</Text>
                                  </View>
                                ) : null}
                              </View>
                              <StatusBadge status={item.status} size="sm" />
                            </View>
                            <View style={styles.processedMetaRow}>
                              <Text style={styles.ticketPill}>
                                Ticket #{item._id.slice(-4).toUpperCase()}
                              </Text>
                              {processedTimeStr ? (
                                <>
                                  <Text style={styles.dotSeparator}>•</Text>
                                  <View style={styles.processedTimeBox}>
                                    <Ionicons name="time-outline" size={12} color={colors.muted} />
                                    <Text style={styles.processedTimeText}>{processedTimeStr}</Text>
                                  </View>
                                </>
                              ) : null}
                            </View>
                          </View>
                        </View>

                        {item.selectedServices?.length ? (
                          <View style={styles.itemServicesRow}>
                            {item.selectedServices.map((s, idx) => {
                              const qty = s.quantity || 1;
                              return (
                                <View key={`${s.name}_${idx}`} style={styles.serviceChip}>
                                  <Text style={styles.serviceChipText}>
                                    {s.name} {qty > 1 ? `(×${qty})` : ""} (${(s.cost || 0) * qty})
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* TAB 2: ANALYTICS & INSIGHTS */}
      {activeTab === "analytics" && (
        <View style={styles.tabContentContainer}>
          <SectionHeader
            title="Operational Insights"
            subtitle="Queue throughput, speed ratio & revenue"
            icon="bar-chart-outline"
            actionIcon="refresh-outline"
            actionText="Refresh"
            onActionPress={() => fetchAnalytics(analyticsRange, true)}
            actionLoading={refreshing}
          />

          {/* Time range selector chips */}
          <View style={styles.rangeFilterRow}>
            {RANGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.rangeChip, analyticsRange === opt.id && styles.rangeChipActive]}
                onPress={() => setAnalyticsRange(opt.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.rangeChipText,
                    analyticsRange === opt.id && styles.rangeChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {analyticsLoading && !analyticsData ? (
            <AppLoader
              message="Computing operational metrics..."
              submessage="Analyzing ticket volume and durations"
            />
          ) : analyticsData ? (
            <>
              {/* 4 KPI Cards */}
              <View style={styles.kpiGrid}>
                {/* 1. Completed Visits */}
                <Card variant="elevated" style={styles.kpiCard}>
                  <View style={styles.kpiHeaderRow}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: colors.successSubtle }]}>
                      <Ionicons name="checkmark-done-circle" size={18} color={colors.success} />
                    </View>
                    <Text style={styles.kpiValue}>
                      {analyticsData.summary.totalCompleted}
                    </Text>
                  </View>
                  <Text style={styles.kpiLabel}>Completed Visits</Text>
                  <Text style={styles.kpiSub}>
                    {analyticsData.summary.completionRate}% completion ({analyticsData.summary.totalCustomers} total)
                  </Text>
                </Card>

                {/* 2. Estimated Revenue */}
                <Card variant="elevated" style={styles.kpiCard}>
                  <View style={styles.kpiHeaderRow}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: colors.primarySubtle }]}>
                      <Ionicons name="cash" size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.kpiValue}>
                      ${analyticsData.summary.totalRevenue}
                    </Text>
                  </View>
                  <Text style={styles.kpiLabel}>Total Revenue</Text>
                  <Text style={styles.kpiSub}>From completed tickets</Text>
                </Card>

                {/* 3. Avg Wait Time */}
                <Card variant="elevated" style={styles.kpiCard}>
                  <View style={styles.kpiHeaderRow}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: colors.warningSubtle }]}>
                      <Ionicons name="time" size={18} color={colors.warning} />
                    </View>
                    <Text style={styles.kpiValue}>
                      {analyticsData.summary.avgWaitTimeMin}m
                    </Text>
                  </View>
                  <Text style={styles.kpiLabel}>Avg Wait in Line</Text>
                  <View
                    style={[
                      styles.speedBadge,
                      analyticsData.summary.serviceSpeedRatio <= 1.0 ? styles.speedFast : styles.speedSlow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.speedBadgeText,
                        analyticsData.summary.serviceSpeedRatio <= 1.0 ? styles.speedFastText : styles.speedSlowText,
                      ]}
                    >
                      {analyticsData.summary.serviceSpeedRatio}x speed ratio
                    </Text>
                  </View>
                </Card>

                {/* 4. Service Duration */}
                <Card variant="elevated" style={styles.kpiCard}>
                  <View style={styles.kpiHeaderRow}>
                    <View style={[styles.kpiIconWrap, { backgroundColor: colors.infoSubtle }]}>
                      <Ionicons name="flash" size={18} color={colors.info} />
                    </View>
                    <Text style={styles.kpiValue}>
                      {analyticsData.summary.avgServiceDurationMin}m
                    </Text>
                  </View>
                  <Text style={styles.kpiLabel}>Avg Service Time</Text>
                  <Text style={styles.kpiSub}>Actual counter duration</Text>
                </Card>
              </View>

              {/* Peak Counter Hours Card */}
              <Card variant="elevated" style={styles.analyticsSectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="flame" size={18} color={colors.warning} />
                    <Text style={styles.sectionTitle}>Peak Counter Hours</Text>
                  </View>
                </View>

                {peakArrivalHour ? (
                  <View style={styles.busiestHourBanner}>
                    <Ionicons name="time" size={16} color={colors.warning} />
                    <Text style={styles.busiestHourText}>
                      Busiest Window:{" "}
                      <Text style={styles.busiestHourHighlight}>
                        {peakArrivalHour.label} ({peakArrivalHour.count} arrivals)
                      </Text>
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.emptyCardText}>No customer arrivals in this period.</Text>
                )}

                {topPeakHours.length > 0 && (
                  <View style={styles.peakHoursList}>
                    {topPeakHours.map((h) => {
                      const pct = Math.round((h.count / maxPeakCount) * 100);
                      return (
                        <View key={h.hour} style={styles.peakHourRow}>
                          <Text style={styles.peakHourLabel}>{h.label}</Text>
                          <View style={styles.peakHourBarTrack}>
                            <View
                              style={[
                                styles.peakHourBarFill,
                                { width: `${Math.max(pct, 5)}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.peakHourCount}>{h.count}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>

              {/* Service Popularity Distribution Card */}
              <Card variant="elevated" style={styles.analyticsSectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Service Popularity</Text>
                  </View>
                  <Text style={styles.countPill}>
                    {analyticsData.servicePopularity.length} services
                  </Text>
                </View>

                {analyticsData.servicePopularity.length === 0 ? (
                  <Text style={styles.emptyCardText}>No service bookings recorded for this period.</Text>
                ) : (
                  <View style={styles.popularityList}>
                    {analyticsData.servicePopularity.map((item, idx) => (
                      <View key={item.name} style={styles.popularityItem}>
                        <View style={styles.popItemHeader}>
                          <View style={styles.popNameRow}>
                            <View style={styles.popRankBadge}>
                              <Text style={styles.popRankText}>#{idx + 1}</Text>
                            </View>
                            <Text style={styles.popName} numberOfLines={1}>
                              {item.name}
                            </Text>
                          </View>
                          <View style={styles.popStatsRow}>
                            <Text style={styles.popCount}>{item.count} orders</Text>
                            <Text style={styles.dotSeparator}>•</Text>
                            <Text style={styles.popRevenue}>${item.revenue}</Text>
                          </View>
                        </View>
                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${Math.min(item.percentage, 100)}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.popPercentText}>{item.percentage}% of all bookings</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>

              {/* Daily Throughput List */}
              <Card variant="elevated" style={styles.analyticsSectionCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Daily Customer Throughput</Text>
                  </View>
                  <Text style={styles.countPill}>
                    {analyticsData.dailyThroughput.length} days
                  </Text>
                </View>

                <View style={styles.dailyList}>
                  {analyticsData.dailyThroughput.map((d) => (
                    <View key={d.date} style={styles.dailyRow}>
                      <View style={styles.dailyLabelWrap}>
                        <Text style={styles.dailyLabel}>{d.label}</Text>
                        <Text style={styles.dailyDate}>{d.date}</Text>
                      </View>
                      <View style={styles.dailyPillsWrap}>
                        <View style={styles.completedPill}>
                          <Ionicons name="checkmark" size={12} color={colors.success} />
                          <Text style={styles.completedPillText}>{d.completed} done</Text>
                        </View>
                        {d.cancelled > 0 && (
                          <View style={styles.cancelledPill}>
                            <Text style={styles.cancelledPillText}>{d.cancelled} canc</Text>
                          </View>
                        )}
                        <Text style={styles.dailyRevenue}>${d.revenue}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          ) : (
            <EmptyState
              icon="bar-chart-outline"
              title="No Analytics Available"
              description="Analytics will appear here once customers join and complete their tickets."
            />
          )}
        </View>
      )}

      {/* TAB 3: SERVICES CATALOG */}
      {activeTab === "catalog" && (
        <View style={styles.tabContentContainer}>
          <SectionHeader
            title="Store Services"
            subtitle="Configure services and prices available for queue booking"
            icon="pricetag-outline"
            count={profile?.services?.length || 0}
          />

          {/* Services List */}
          <View style={styles.servicesGrid}>
            {profile?.services?.map((service, index) => (
              <Card key={`${service.name}_${index}`} variant="subtle" style={styles.serviceCard}>
                <View style={styles.serviceCardLeft}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <View style={styles.serviceMetaRow}>
                    <Text style={styles.serviceDuration}>⏱ {service.durationMin} mins</Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.serviceCost}>${service.cost}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => confirmRemoveService(index, service.name)}
                  style={styles.trashBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </Card>
            ))}
          </View>

          {/* Add New Service Form / Trigger */}
          {!addServiceExpanded ? (
            <TouchableOpacity
              style={styles.addServiceTriggerBtn}
              onPress={() => setAddServiceExpanded(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add new service to catalog"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.addServiceTriggerText}>+ Add New Service to Catalog</Text>
            </TouchableOpacity>
          ) : (
            <Card variant="elevated" style={styles.addServiceCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.addServiceTitle}>Add New Service</Text>
                <TouchableOpacity
                  onPress={() => setAddServiceExpanded(false)}
                  style={{ padding: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close add service form"
                >
                  <Ionicons name="close" size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <AppInput
                label="Service Name"
                value={serviceName}
                onChangeText={setServiceName}
                placeholder="e.g. Haircut & Wash, Screen Replacement"
              />

              <View style={styles.inputTwoCol}>
                <View style={styles.flex1}>
                  <AppInput
                    label="Duration (mins)"
                    value={durationMin}
                    onChangeText={setDurationMin}
                    keyboardType="numeric"
                    placeholder="e.g. 25"
                  />
                </View>
                <View style={styles.flex1}>
                  <AppInput
                    label="Cost ($)"
                    value={cost}
                    onChangeText={setCost}
                    keyboardType="numeric"
                    placeholder="e.g. 20"
                  />
                </View>
              </View>

              <AppButton
                title="Add Service to Catalog"
                onPress={addService}
                loading={addingService}
                loadingText="Adding Service..."
                icon="add-circle-outline"
                style={{ marginTop: spacing.xs }}
              />
            </Card>
          )}
        </View>
      )}

      {/* TAB 4: UPDATES & ANNOUNCEMENTS */}
      {activeTab === "updates" && (
        <View style={styles.tabContentContainer}>
          {updatePublishSuccess && (
            <View style={{ marginBottom: 16 }}>
              <AlertCard
                type="success"
                title="Update Published"
                message="Your announcement has been sent to customer feeds."
              />
            </View>
          )}

          <SectionHeader
            title="Store Updates & Offers"
            subtitle="Broadcast alerts, special discounts, and notices to customers"
            icon="megaphone-outline"
            count={businessUpdates.length}
            rightElement={
              <AppButton
                title="+ New Update"
                onPress={() => {
                  setUpdatePublishError("");
                  setNewUpdateModalOpen(true);
                }}
                size="sm"
              />
            }
          />

          {businessUpdates.length === 0 ? (
            <EmptyState
              icon="megaphone-outline"
              title="No Updates Published"
              description="Keep customers engaged by posting notices, holiday schedules, and limited-time discounts."
              actionLabel="Create First Update"
              onAction={() => {
                setUpdatePublishError("");
                setNewUpdateModalOpen(true);
              }}
            />
          ) : (
            <View style={{ gap: 16 }}>
              {businessUpdates.map((item) => {
                let cardBg = "#EDF9FF";
                let cardBorder = "#D2EBFA";
                let iconColor = "#2F6FED";

                if (item.type === "alert") {
                  cardBg = "#FDECEC";
                  cardBorder = "#F5C2C2";
                  iconColor = "#D64545";
                } else if (item.type === "offer") {
                  cardBg = "#EFFEF5";
                  cardBorder = "#D3EED8";
                  iconColor = "#2E7D32";
                }

                let validTillText = "";
                if (item.type === "offer" && item.validTill) {
                  const d = new Date(item.validTill);
                  validTillText = `Valid till ${d.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                  })}`;
                }

                return (
                  <View
                    key={item._id}
                    style={[
                      styles.businessUpdateCard,
                      { backgroundColor: cardBg, borderColor: cardBorder },
                    ]}
                  >
                    <View style={styles.businessUpdateIconWrap}>
                      {item.type === "alert" ? (
                        <Ionicons name="warning-outline" size={24} color={iconColor} />
                      ) : item.type === "offer" ? (
                        <OfferBadgeIcon size={24} color={iconColor} />
                      ) : (
                        <Ionicons name="information-circle-outline" size={24} color={iconColor} />
                      )}
                    </View>

                    <View style={styles.flex1}>
                      <View style={styles.businessUpdateTitleRow}>
                        <Text style={styles.businessUpdateTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.businessUpdateTime}>{timeAgo(item.createdAt)}</Text>
                      </View>

                      <Text style={styles.businessUpdateMessage}>{item.message}</Text>

                      {validTillText ? (
                        <Text style={styles.businessUpdateValidTill}>{validTillText}</Text>
                      ) : null}

                      <View style={styles.businessUpdateActionsRow}>
                        <TouchableOpacity
                          onPress={() => handleDeleteUpdate(item._id)}
                          style={styles.deleteUpdateBtn}
                        >
                          <Text style={styles.deleteUpdateBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* New Update Bottom Sheet Modal */}
      <Modal
        visible={newUpdateModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewUpdateModalOpen(false)}
      >
        <View style={styles.newUpdateOverlay}>
          <View style={styles.newUpdateSheet}>
            <View style={styles.newUpdateSheetHeader}>
              <Text style={styles.newUpdateSheetTitle}>Publish New Update</Text>
              <TouchableOpacity onPress={() => setNewUpdateModalOpen(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {updatePublishError ? (
                <View style={{ marginBottom: 16 }}>
                  <AlertCard type="danger" title="Error" message={updatePublishError} />
                </View>
              ) : null}

              {/* Live Preview Card */}
              <Text style={styles.previewLabel}>LIVE PREVIEW</Text>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor:
                      newUpdateType === "alert"
                        ? "#FDECEC"
                        : newUpdateType === "offer"
                        ? "#EFFEF5"
                        : "#EDF9FF",
                    borderColor:
                      newUpdateType === "alert"
                        ? "#F5C2C2"
                        : newUpdateType === "offer"
                        ? "#D3EED8"
                        : "#D2EBFA",
                  },
                ]}
              >
                <View style={styles.previewIconWrap}>
                  {newUpdateType === "alert" ? (
                    <Ionicons name="warning-outline" size={24} color="#D64545" />
                  ) : newUpdateType === "offer" ? (
                    <OfferBadgeIcon size={24} color="#2E7D32" />
                  ) : (
                    <Ionicons name="information-circle-outline" size={24} color="#2F6FED" />
                  )}
                </View>
                <View style={styles.flex1}>
                  <View style={styles.previewTitleRow}>
                    <Text style={styles.previewTitle}>
                      {newUpdateTitle || "Announcement Title"}
                    </Text>
                    <Text style={styles.previewTime}>just now</Text>
                  </View>
                  <Text style={styles.previewShopName}>
                    {profile?.shopName || "Your Store"}
                  </Text>
                  <Text style={styles.previewMessage}>
                    {newUpdateMessage || "Customers will see this message in their Updates feed."}
                  </Text>
                  {newUpdateType === "offer" && (
                    <Text style={styles.previewValidTill}>
                      Valid for {newUpdateDays} days
                    </Text>
                  )}
                </View>
              </View>

              {/* Type Chips */}
              <Text style={styles.inputSectionLabel}>Update Type</Text>
              <View style={styles.typeChipsRow}>
                {(["alert", "offer", "info"] as const).map((t) => (
                  <Chip
                    key={t}
                    label={t.charAt(0).toUpperCase() + t.slice(1)}
                    active={newUpdateType === t}
                    onPress={() => setNewUpdateType(t)}
                  />
                ))}
              </View>

              {/* Title input with counter */}
              <View style={styles.inputWrapWithCounter}>
                <View style={styles.labelWithCounterRow}>
                  <Text style={styles.inputSectionLabel}>Title</Text>
                  <Text style={styles.counterText}>{newUpdateTitle.length}/60</Text>
                </View>
                <TextInput
                  style={styles.singleLineInput}
                  value={newUpdateTitle}
                  onChangeText={(text) => {
                    if (text.length <= 60) setNewUpdateTitle(text);
                  }}
                  placeholder="e.g. Holiday Notice, Special Discount"
                  placeholderTextColor="#9E9E9E"
                />
              </View>

              {/* Message input with counter */}
              <View style={styles.inputWrapWithCounter}>
                <View style={styles.labelWithCounterRow}>
                  <Text style={styles.inputSectionLabel}>Message</Text>
                  <Text style={styles.counterText}>{newUpdateMessage.length}/200</Text>
                </View>
                <TextInput
                  style={styles.multiLineInput}
                  value={newUpdateMessage}
                  onChangeText={(text) => {
                    if (text.length <= 200) setNewUpdateMessage(text);
                  }}
                  placeholder="Provide details about your notice, working hours adjustment, or offer."
                  placeholderTextColor="#9E9E9E"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Offer duration stepper */}
              {newUpdateType === "offer" && (
                <View style={styles.stepperSection}>
                  <Text style={styles.inputSectionLabel}>Valid For (Days)</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      onPress={() => setNewUpdateDays((d) => Math.max(1, d - 1))}
                      style={styles.stepperBtn}
                    >
                      <Ionicons name="remove" size={18} color="#284D83" />
                    </TouchableOpacity>
                    <Text style={styles.stepperValueText}>{newUpdateDays} days</Text>
                    <TouchableOpacity
                      onPress={() => setNewUpdateDays((d) => Math.min(30, d + 1))}
                      style={styles.stepperBtn}
                    >
                      <Ionicons name="add" size={18} color="#284D83" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.publishBtnWrap}>
              <AppButton
                title="Publish Update"
                onPress={handlePublishUpdate}
                loading={publishingUpdate}
                loadingText="Publishing..."
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Ticket Details Modal */}
      <Modal
        visible={ticketModalVisible && Boolean(selectedTicket)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTicketModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedTicket && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <Text style={styles.modalTicketNumber}>
                      Ticket #{selectedTicket._id.slice(-4).toUpperCase()}
                    </Text>
                    <StatusBadge status={selectedTicket.status} size="sm" />
                    {selectedTicket.verifiedAt ? (
                      <View style={styles.verifiedChip}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                        <Text style={styles.verifiedChipText}>Verified</Text>
                      </View>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => setTicketModalVisible(false)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Customer Info Card */}
                  <View style={styles.modalCustomerCard}>
                    <View style={styles.modalCustomerInfoRow}>
                      <View style={styles.modalAvatar}>
                        <Ionicons name="person" size={20} color={colors.primary} />
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.modalCustomerName}>
                          {selectedTicket.customerId?.name || selectedTicket.customerName || "Customer"}
                        </Text>
                        <Text style={styles.modalCustomerJoined}>
                          Joined: {new Date(selectedTicket.joinedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                    </View>

                    {selectedTicket.customerId?.phone ? (
                      <View style={styles.contactActionRow}>
                        <TouchableOpacity
                          style={styles.contactCallBtn}
                          onPress={() => Linking.openURL(`tel:${selectedTicket.customerId?.phone}`)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={14} color="#FFF" />
                          <Text style={styles.contactCallText}>
                            Call ({selectedTicket.customerId?.phone})
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.contactChatBtn}
                          onPress={() => Linking.openURL(`sms:${selectedTicket.customerId?.phone}`)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chatbubble-ellipses" size={14} color={colors.primary} />
                          <Text style={styles.contactChatText}>SMS / Chat</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.noContactText}>No phone contact provided for this visitor</Text>
                    )}
                  </View>

                  {/* Requested Services */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Requested Services & Quantities</Text>
                    <View style={styles.modalServicesList}>
                      {selectedTicket.selectedServices?.map((s, idx) => {
                        const qty = s.quantity || 1;
                        const duration = (s.durationMin || 0) * qty;
                        const totalCost = (s.cost || 0) * qty;
                        return (
                          <View key={idx} style={styles.modalServiceItem}>
                            <View style={styles.flex1}>
                              <Text style={styles.modalServiceName}>
                                {s.name} <Text style={styles.qtyHighlight}>×{qty}</Text>
                              </Text>
                              <Text style={styles.modalServiceMeta}>
                                ~{duration} mins {s.cost > 0 ? `($${s.cost} each)` : ""}
                              </Text>
                            </View>
                            <Text style={styles.modalServiceTotal}>${totalCost}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Subtotal row */}
                    <View style={styles.modalTotalRow}>
                      <Text style={styles.modalTotalLabel}>Total Estimate</Text>
                      <View style={styles.modalTotalValues}>
                        <Text style={styles.modalTotalDuration}>
                          ~{selectedTicket.selectedServices?.reduce((sum, s) => sum + (s.durationMin || 0) * (s.quantity || 1), 0)} mins
                        </Text>
                        <Text style={styles.modalTotalCost}>
                          ${selectedTicket.selectedServices?.reduce((sum, s) => sum + (s.cost || 0) * (s.quantity || 1), 0)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Verification Status / Action — Only active tickets can be verified */}
                  {selectedTicket.status === "waiting" || selectedTicket.status === "in_progress" ? (
                    <View style={styles.modalVerificationBox}>
                      <View style={styles.modalVerifyInfo}>
                        <Ionicons
                          name={selectedTicket.verifiedAt ? "checkmark-circle" : "shield-outline"}
                          size={20}
                          color={selectedTicket.verifiedAt ? colors.success : colors.warning}
                        />
                        <View style={styles.flex1}>
                          <Text style={styles.modalVerifyTitle}>Counter Verification</Text>
                          <Text style={styles.modalVerifySub}>
                            {selectedTicket.verifiedAt
                              ? `Verified at ${new Date(selectedTicket.verifiedAt).toLocaleTimeString()}`
                              : "Ticket has not been verified at the counter yet"}
                          </Text>
                        </View>
                      </View>

                      {!selectedTicket.verifiedAt ? (
                        <TouchableOpacity
                          style={styles.modalVerifyActionBtn}
                          onPress={handleVerifySelectedTicket}
                          disabled={isVerifying}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                          <Text style={styles.modalVerifyActionBtnText}>
                            {isVerifying ? "Verifying..." : "Verify Ticket"}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : selectedTicket.verifiedAt ? (
                    /* Read-only verification status for completed/cancelled tickets if verified during service */
                    <View style={styles.modalVerificationBox}>
                      <View style={styles.modalVerifyInfo}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        <View style={styles.flex1}>
                          <Text style={styles.modalVerifyTitle}>Counter Verified</Text>
                          <Text style={styles.modalVerifySub}>
                            Customer was verified at {new Date(selectedTicket.verifiedAt).toLocaleTimeString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Footer Status Actions */}
                <View style={styles.modalFooter}>
                  {selectedTicket.status === "waiting" ? (
                    <TouchableOpacity
                      style={styles.modalPrimaryActionBtn}
                      onPress={() => {
                        updateStatus(selectedTicket._id, "in_progress");
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={16} color="#FFF" />
                      <Text style={styles.modalPrimaryActionBtnText}>Call Customer</Text>
                    </TouchableOpacity>
                  ) : null}

                  {selectedTicket.status === "in_progress" ? (
                    <TouchableOpacity
                      style={styles.modalCompleteActionBtn}
                      onPress={() => {
                        updateStatus(selectedTicket._id, "completed");
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={16} color="#FFF" />
                      <Text style={styles.modalCompleteActionBtnText}>Complete Service</Text>
                    </TouchableOpacity>
                  ) : null}

                  {selectedTicket.status === "waiting" || selectedTicket.status === "in_progress" ? (
                    <TouchableOpacity
                      style={styles.modalCancelActionBtn}
                      onPress={() => {
                        updateStatus(selectedTicket._id, "cancelled");
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalCancelActionBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.modalCloseFooterBtn}
                    onPress={() => setTicketModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCloseFooterBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Counter Verification Modal — QR Scanner as PRIMARY, Manual input as fallback */}
      <Modal
        visible={verifyModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setVerifyModalVisible(false);
          setTargetTicketForVerification(null);
          setVerificationResult(null);
          setVerifyInput("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.verifyIconBadge}>
                  <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                </View>
                <Text style={styles.modalTitle}>Counter Ticket Verification</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setVerifyModalVisible(false);
                  setTargetTicketForVerification(null);
                  setVerificationResult(null);
                  setVerifyInput("");
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Target Ticket Banner (if initiated from a specific queue card) */}
              {targetTicketForVerification ? (
                <View style={styles.targetTicketBanner}>
                  <Ionicons name="person" size={14} color={colors.primary} />
                  <Text style={styles.targetTicketText} numberOfLines={1}>
                    Verifying for: {targetTicketForVerification.customerId?.name || targetTicketForVerification.customerName || "Customer"} (Ticket #{targetTicketForVerification._id.slice(-4).toUpperCase()})
                  </Text>
                </View>
              ) : null}

              {/* PRIMARY MODE: Live Camera QR Scanner */}
              {!isManualInputMode ? (
                <View style={styles.scannerWrapper}>
                  {!cameraPermission?.granted ? (
                    <View style={styles.permissionBox}>
                      <Ionicons name="camera-outline" size={32} color={colors.primary} />
                      <Text style={styles.permissionTitle}>Camera Access Required</Text>
                      <Text style={styles.permissionText}>
                        Allow camera access to scan customer ticket QR codes directly at your checkout desk.
                      </Text>
                      <TouchableOpacity
                        style={styles.grantBtn}
                        onPress={requestCameraPermission}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.grantBtnText}>Grant Camera Permission</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.cameraBox}>
                      <CameraView
                        onBarcodeScanned={handleBarcodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                        style={styles.cameraView}
                      />
                      <View style={styles.cameraOverlay} pointerEvents="none">
                        <View style={styles.reticle}>
                          <View style={[styles.cornerReticle, styles.topLeftCorner]} />
                          <View style={[styles.cornerReticle, styles.topRightCorner]} />
                          <View style={[styles.cornerReticle, styles.bottomLeftCorner]} />
                          <View style={[styles.cornerReticle, styles.bottomRightCorner]} />

                          <Animated.View
                            style={[
                              styles.scanningLaser,
                              {
                                transform: [
                                  {
                                    translateY: laserAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0, 150],
                                    }),
                                  },
                                ],
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  )}

                  <Text style={styles.scannerInstructionText}>
                    {isProcessingScan || isVerifying
                      ? "Verifying ticket..."
                      : "Align customer's ticket QR code within the frame"}
                  </Text>

                  {/* Fallback button to switch to manual code entry */}
                  <TouchableOpacity
                    style={styles.switchModeBtn}
                    onPress={() => setIsManualInputMode(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="keypad-outline" size={15} color={colors.primary} />
                    <Text style={styles.switchModeBtnText}>Enter Ticket Code Manually (Fallback)</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* FALLBACK MODE: Manual Ticket Code or Token Entry */
                <View style={styles.manualEntryWrapper}>
                  <Text style={styles.verifyInputLabel}>
                    Enter Ticket Number, ID, or Token
                  </Text>
                  <TextInput
                    style={styles.verifyTextInput}
                    placeholder="e.g. ql-ticket:... or ABCD or ticket ID"
                    placeholderTextColor={colors.muted}
                    value={verifyInput}
                    onChangeText={setVerifyInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <TouchableOpacity
                    style={styles.submitVerifyBtn}
                    onPress={() => processTicketVerification(verifyInput)}
                    disabled={isVerifying}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shield-checkmark" size={16} color="#FFF" />
                    <Text style={styles.submitVerifyBtnText}>
                      {isVerifying ? "Verifying..." : "Verify Customer Ticket"}
                    </Text>
                  </TouchableOpacity>

                  {/* Switch back to Camera Scanner button */}
                  <TouchableOpacity
                    style={styles.switchModeBtn}
                    onPress={() => setIsManualInputMode(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={15} color={colors.primary} />
                    <Text style={styles.switchModeBtnText}>Switch to Live QR Scanner</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Verification Result Feedback Banner */}
              {verificationResult ? (
                <View
                  style={[
                    styles.resultCard,
                    verificationResult.success ? styles.resultSuccessCard : styles.resultErrorCard,
                  ]}
                >
                  <Ionicons
                    name={verificationResult.success ? "checkmark-circle" : "alert-circle"}
                    size={22}
                    color={verificationResult.success ? colors.success : colors.danger}
                  />
                  <View style={styles.flex1}>
                    <Text
                      style={[
                        styles.resultMessage,
                        verificationResult.success
                          ? styles.resultSuccessMessage
                          : styles.resultErrorMessage,
                      ]}
                    >
                      {verificationResult.message}
                    </Text>
                    {verificationResult.ticket ? (
                      <View style={styles.resultTicketMeta}>
                        <Text style={styles.resultTicketText}>
                          Customer: {verificationResult.ticket.customerId?.name || verificationResult.ticket.customerName || "Customer"}
                        </Text>
                        <Text style={styles.resultTicketText}>
                          Ticket: #{verificationResult.ticket._id?.slice(-4).toUpperCase()}
                        </Text>
                        <Text style={styles.resultTicketText}>
                          Services: {verificationResult.ticket.selectedServices?.map((s: any) => `${s.name}${s.quantity > 1 ? ` (×${s.quantity})` : ""}`).join(", ")}
                        </Text>
                        <View style={styles.resultStatusPill}>
                          <Ionicons name="flash" size={11} color={colors.info} />
                          <Text style={styles.resultStatusPillText}>
                            Status: {verificationResult.ticket.status?.toUpperCase() || "IN PROGRESS"}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCloseFooterBtn}
                onPress={() => {
                  setVerifyModalVisible(false);
                  setTargetTicketForVerification(null);
                  setVerificationResult(null);
                  setVerifyInput("");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseFooterBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  header: {
    paddingBottom: spacing.xs,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  storeIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  shopNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  tabContentContainer: {
    gap: spacing.xxl, // Explicit 24px gap between QR card, Live Queue, and Processed Customers!
  },
  qrCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  qrCenterWrap: {
    alignItems: "center",
    gap: spacing.md,
  },
  qrWhiteBox: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: radii.lg,
    ...shadows.card,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  codeSnippetBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  codeTextCol: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.8,
  },
  codeString: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    flexShrink: 0,
  },
  copyBtnActive: {
    backgroundColor: colors.successSubtle,
    borderColor: colors.successBorder,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  copiedText: {
    color: colors.success,
  },
  qrHelpText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  sectionWrap: {
    gap: spacing.md,
  },
  queueList: {
    gap: spacing.md,
  },
  queueItemCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  queueItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  positionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  positionText: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.primary,
  },
  queueItemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    marginRight: spacing.xs,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  ticketPill: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  itemServicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  serviceChip: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  serviceChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  itemActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: 2,
  },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.danger,
  },
  servicesGrid: {
    gap: spacing.sm,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  serviceCardLeft: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    marginRight: spacing.sm,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flexWrap: "wrap",
  },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  serviceDuration: {
    fontSize: 12,
    color: colors.muted,
  },
  dotSeparator: {
    color: colors.mutedDark,
  },
  serviceCost: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.successLight,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerSubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addServiceTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.cardElevated,
    borderColor: colors.primaryBorder,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: radii.lg,
    marginTop: spacing.xs,
  },
  addServiceTriggerText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  addServiceCard: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  addServiceTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.1,
  },
  inputTwoCol: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  flex1: {
    flex: 1,
    minWidth: 120,
  },
  processedItemCard: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
  },
  processedItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  processedItemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  processedNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  processedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  processedTimeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  processedTimeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "600",
  },

  /* Navigation Segmented Tab Bar */
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: radii.md,
    gap: 5,
  },
  tabItemActive: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  tabBadge: {
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  tabBadgeActive: {
    backgroundColor: colors.primarySubtle,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
  },
  tabBadgeTextActive: {
    color: colors.primary,
  },

  /* Range Selector */
  rangeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
  },
  rangeChipActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
  },
  rangeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  rangeChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },

  /* KPI Grid */
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  kpiCard: {
    width: "47.5%",
    padding: spacing.md,
    gap: 4,
  },
  kpiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  kpiSub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  speedBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  speedFast: {
    backgroundColor: colors.successSubtle,
  },
  speedSlow: {
    backgroundColor: colors.warningSubtle,
  },
  speedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  speedFastText: {
    color: colors.success,
  },
  speedSlowText: {
    color: colors.warning,
  },

  /* Analytics Sections */
  analyticsSectionCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  countPill: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  emptyCardText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.md,
  },

  /* Busiest Hour Banner */
  busiestHourBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.warningSubtle,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  busiestHourText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  busiestHourHighlight: {
    fontWeight: "800",
    color: colors.warning,
  },
  peakHoursList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  peakHourRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  peakHourLabel: {
    width: 65,
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  peakHourBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.cardSoft,
    overflow: "hidden",
  },
  peakHourBarFill: {
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.warning,
  },
  peakHourCount: {
    width: 28,
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
  },

  /* Popularity List */
  popularityList: {
    gap: spacing.md,
  },
  popularityItem: {
    gap: 4,
  },
  popItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  popNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: spacing.sm,
  },
  popRankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  popRankText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  popName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  popStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  popCount: {
    fontSize: 12,
    color: colors.muted,
  },
  popRevenue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.successLight,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.cardSoft,
    overflow: "hidden",
    marginTop: 2,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  popPercentText: {
    fontSize: 10,
    color: colors.muted,
    alignSelf: "flex-end",
  },

  /* Daily Throughput List */
  dailyList: {
    gap: spacing.sm,
  },
  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  dailyLabelWrap: {
    gap: 1,
  },
  dailyLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  dailyDate: {
    fontSize: 10,
    color: colors.muted,
  },
  dailyPillsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  completedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  completedPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.success,
  },
  cancelledPill: {
    backgroundColor: colors.dangerSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  cancelledPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.danger,
  },
  dailyRevenue: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    marginLeft: 4,
  },

  /* Verification Banner */
  verifyActionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardElevated,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  verifyActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  verifyIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  verifyBannerSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },

  /* Verified badges */
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  verifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  verifiedChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.success,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    backgroundColor: colors.cardElevated,
    borderRadius: radii.xl,
    borderColor: colors.border,
    borderWidth: 1,
    overflow: "hidden",
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
    flex: 1,
  },
  modalTicketNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalCustomerCard: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalCustomerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCustomerName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  modalCustomerJoined: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  contactActionRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  contactCallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  contactCallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  contactChatBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.cardElevated,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  contactChatText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  noContactText: {
    fontSize: 11,
    fontStyle: "italic",
    color: colors.muted,
  },
  modalSection: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  modalServicesList: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  modalServiceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  modalServiceName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  qtyHighlight: {
    fontWeight: "800",
    color: colors.primary,
  },
  modalServiceMeta: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  modalServiceTotal: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  modalTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  modalTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  modalTotalValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalTotalDuration: {
    fontSize: 11,
    color: colors.muted,
  },
  modalTotalCost: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
  },
  modalVerificationBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  modalVerifyInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  modalVerifyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  modalVerifySub: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  modalVerifyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  modalVerifyActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.md,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  modalPrimaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  modalPrimaryActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCompleteActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  modalCompleteActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCancelActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
  },
  modalCancelActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.danger,
  },
  modalCloseFooterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  modalCloseFooterBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  verifyInputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  verifyTextInput: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: spacing.md,
  },
  submitVerifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  submitVerifyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  resultSuccessCard: {
    backgroundColor: colors.successSubtle,
    borderColor: colors.successBorder,
  },
  resultErrorCard: {
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.dangerBorder,
  },
  resultMessage: {
    fontSize: 13,
    fontWeight: "700",
  },
  resultSuccessMessage: {
    color: colors.success,
  },
  resultErrorMessage: {
    color: colors.danger,
  },
  resultTicketMeta: {
    marginTop: spacing.xs,
    gap: 2,
  },
  resultTicketText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  resultStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.infoSubtle,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginTop: 4,
  },
  resultStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.info,
  },

  /* Header Scan & Refresh Actions */
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  headerScanBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerRefreshBtn: {
    padding: 6,
    borderRadius: radii.md,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* In-Queue Verify and In-Progress Service */
  verifyAndStartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  verifyAndStartBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  inServiceContainer: {
    gap: spacing.xs,
    width: "100%",
  },
  inServiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: colors.infoSubtle,
    borderColor: colors.info,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  inServiceBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.info,
    letterSpacing: 0.5,
  },

  /* Camera Scanner in Modal */
  targetTicketBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  targetTicketText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    flex: 1,
  },
  scannerWrapper: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  cameraBox: {
    width: "100%",
    height: 220,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative",
  },
  cameraView: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  reticle: {
    width: 150,
    height: 150,
    position: "relative",
  },
  cornerReticle: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: colors.primary,
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  scanningLaser: {
    position: "absolute",
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: colors.primary,
  },
  scannerInstructionText: {
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
  },
  permissionBox: {
    padding: spacing.lg,
    backgroundColor: colors.cardSoft,
    borderRadius: radii.lg,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  permissionText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 4,
  },
  grantBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  grantBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  switchModeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.md,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    marginTop: 6,
  },
  switchModeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  manualEntryWrapper: {
    marginBottom: spacing.sm,
  },
  stepperSection: {
    marginTop: 14,
  },
  inputSectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: colors.text,
    marginBottom: 8,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardSoft,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
    gap: 16,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueText: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: colors.text,
  },
  publishBtnWrap: {
    marginTop: 16,
  },
  previewLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  previewCard: {
    width: "100%",
    borderRadius: radii.alert,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  previewIconWrap: {
    marginRight: 12,
    paddingTop: 2,
  },
  previewTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  previewTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
  },
  previewTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: colors.muted,
    marginLeft: 8,
  },
  previewShopName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  previewMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  previewValidTill: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    marginTop: 6,
  },
  typeChipsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  inputWrapWithCounter: {
    marginBottom: 14,
  },
  labelWithCounterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  counterText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.muted,
  },
  singleLineInput: {
    height: 44,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: colors.text,
  },
  multiLineInput: {
    minHeight: 80,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.text,
    textAlignVertical: "top",
  },
  chipTabBarWrap: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  chipTabScroll: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  businessUpdateCard: {
    width: "100%",
    borderRadius: radii.alert,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  businessUpdateIconWrap: {
    marginRight: 12,
    paddingTop: 2,
  },
  businessUpdateTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  businessUpdateTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
  },
  businessUpdateTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: colors.muted,
    marginLeft: 8,
  },
  businessUpdateMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  businessUpdateValidTill: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    marginTop: 6,
  },
  businessUpdateActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  deleteUpdateBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteUpdateBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: colors.danger,
  },
  newUpdateOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  newUpdateSheet: {
    backgroundColor: colors.cardElevated,
    borderTopLeftRadius: radii.bottomSheet,
    borderTopRightRadius: radii.bottomSheet,
    padding: 20,
    maxHeight: "85%",
  },
  newUpdateSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  newUpdateSheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: colors.text,
  },
});


