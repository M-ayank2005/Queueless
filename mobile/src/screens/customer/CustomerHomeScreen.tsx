import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";
import { QueueCardSkeleton, HistoryItemSkeleton } from "../../components/SkeletonLoader";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { CustomerTabParamList, RootStackParamList } from "../../navigation/types";
import { QueueEntry, FavoriteStore } from "../../types";
import { colors } from "../../theme/colors";
import { radii, shadows, spacing, typography } from "../../theme/theme";

type Props = BottomTabScreenProps<CustomerTabParamList, "Home">;

export default function CustomerHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const laserAnim = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "favorites" | "history">("active");
  const [activeQueues, setActiveQueues] = useState<QueueEntry[]>([]);
  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteStore[]>([]);
  const [rebookingId, setRebookingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [activeRes, historyRes, favRes] = await Promise.all([
        api.get("/queue/my-queues"),
        api.get("/queue/history"),
        api.get("/queue/favorites"),
      ]);
      setActiveQueues(activeRes.data || []);
      setHistory(historyRes.data || []);
      setFavorites(favRes.data || []);
    } catch {
      // non-blocking
    }
  };

  const handleQuickRebook = async (pastTicketId: string) => {
    setRebookingId(pastTicketId);
    try {
      const res = await api.post("/queue/quick-rebook", { pastTicketId });
      Alert.alert("Success", "Rejoined queue successfully!");
      rootNavigation.navigate("QueueStatus", { id: res.data._id });
    } catch (err: any) {
      Alert.alert(
        "Rebooking Failed",
        err.response?.data?.message ||
          "Could not rebook. The store may be closed or you already have an active ticket."
      );
    } finally {
      setRebookingId(null);
    }
  };

  const handleRemoveFavorite = async (businessId: string) => {
    try {
      await api.post("/queue/favorites/toggle", { businessId });
      setFavorites((prev) => prev.filter((f) => f._id !== businessId));
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Failed to remove saved store.");
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

  useEffect(() => {
    if (scannerOpen) {
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
  }, [scannerOpen]);

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        if (Platform.OS === "web") {
          window.alert("Please grant camera permission to scan merchant counter codes.");
        } else {
          Alert.alert("Camera access needed", "Please grant camera permission to scan merchant counter codes.");
        }
        return;
      }
    }
    setTorchOn(false);
    setScannerOpen(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScannerOpen(false);
    const cleaned = data.includes("/store/") ? data.split("/store/").pop() || "" : data;
    if (cleaned) {
      navigation.navigate("ScanJoin", { qrCode: cleaned });
    }
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "C";

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
          onPress={handleOpenScanner}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={16} color="#FFF" />
          <Text style={styles.scanActionText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Switcher for Live Tickets vs Saved vs History */}
      <View style={styles.segmentContainer}>
        <Pressable
          onPress={() => setTab("active")}
          style={[styles.segmentBtn, tab === "active" && styles.segmentBtnActive]}
        >
          <Ionicons
            name="time-outline"
            size={15}
            color={tab === "active" ? colors.primary : colors.muted}
          />
          <Text style={[styles.segmentText, tab === "active" && styles.segmentTextActive]}>
            Live ({activeQueues.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("favorites")}
          style={[styles.segmentBtn, tab === "favorites" && styles.segmentBtnActive]}
        >
          <Ionicons
            name={tab === "favorites" ? "heart" : "heart-outline"}
            size={15}
            color={tab === "favorites" ? colors.danger : colors.muted}
          />
          <Text
            style={[
              styles.segmentText,
              tab === "favorites" && [styles.segmentTextActive, { color: colors.danger }],
            ]}
          >
            Saved ({favorites.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("history")}
          style={[styles.segmentBtn, tab === "history" && styles.segmentBtnActive]}
        >
          <Ionicons
            name="receipt-outline"
            size={15}
            color={tab === "history" ? colors.primary : colors.muted}
          />
          <Text style={[styles.segmentText, tab === "history" && styles.segmentTextActive]}>
            History ({history.length})
          </Text>
        </Pressable>
      </View>

      {/* Ticket List or Skeletons or Empty State */}
      <View style={styles.sectionWrap}>
        {loading ? (
          tab === "active" ? (
            <View style={{ gap: spacing.md }}>
              <QueueCardSkeleton />
              <QueueCardSkeleton />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <HistoryItemSkeleton />
              <HistoryItemSkeleton />
              <HistoryItemSkeleton />
            </View>
          )
        ) : tab === "active" ? (
          activeQueues.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="No Active Queue Tickets"
              description="You're all caught up! Scan a merchant's counter QR code to take your spot in line."
              actionTitle="Scan Store Code"
              onActionPress={handleOpenScanner}
              actionIcon="qr-code-outline"
            />
          ) : (
            activeQueues.map((entry) => {
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
                    <View style={styles.ticketBadgeCol}>
                      <StatusBadge status={entry.status} size="sm" />
                      {entry.alert?.active && (
                        <View
                          style={[
                            styles.turnAlertBadge,
                            {
                              backgroundColor:
                                entry.alert.type === "YOUR_TURN"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : "rgba(245, 158, 11, 0.2)",
                              borderColor:
                                entry.alert.type === "YOUR_TURN"
                                  ? "rgba(16, 185, 129, 0.5)"
                                  : "rgba(245, 158, 11, 0.5)",
                            },
                          ]}
                        >
                          <Ionicons
                            name={entry.alert.type === "YOUR_TURN" ? "sparkles" : "notifications"}
                            size={10}
                            color={entry.alert.type === "YOUR_TURN" ? colors.success : colors.warning}
                          />
                          <Text
                            style={[
                              styles.turnAlertBadgeText,
                              {
                                color:
                                  entry.alert.type === "YOUR_TURN"
                                    ? colors.success
                                    : colors.warning,
                              },
                            ]}
                          >
                            {entry.alert.type === "YOUR_TURN" ? "Your Turn" : "Near Turn"}
                          </Text>
                        </View>
                      )}
                    </View>
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
                        {entry.prediction?.rangeDisplay
                          ? `~${entry.prediction.rangeDisplay}`
                          : `~${wait} mins wait`}
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
          )
        ) : tab === "favorites" ? (
          favorites.length === 0 ? (
            <EmptyState
              icon="heart-outline"
              title="No Saved Stores Yet"
              description="Tap the heart icon when viewing any merchant to save your favourite spots for 1-tap rebooking."
              actionTitle="Scan Store Code"
              onActionPress={handleOpenScanner}
              actionIcon="qr-code-outline"
            />
          ) : (
            favorites.map((fav) => {
              const shopName = fav.businessProfile?.shopName || fav.name || "QueueLess Merchant";
              const address = fav.businessProfile?.address;

              return (
                <Card key={fav._id} variant="elevated" style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <View style={styles.ticketStoreCol}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <StatusBadge
                          status={fav.isOpen ? "open" : "cancelled"}
                          label={fav.isOpen ? "OPEN" : "CLOSED"}
                          size="sm"
                        />
                        {fav.openReason && !fav.isOpen && (
                          <Text style={styles.favClosedReason} numberOfLines={1}>
                            ({fav.openReason})
                          </Text>
                        )}
                      </View>
                      <Text style={styles.ticketShopName} numberOfLines={1}>
                        {shopName}
                      </Text>
                      {address && (
                        <Text style={styles.favAddress} numberOfLines={1}>
                          {address}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => handleRemoveFavorite(fav._id)}
                      style={styles.favHeartBtn}
                      activeOpacity={0.7}
                      accessibilityLabel="Remove from saved stores"
                    >
                      <Ionicons name="heart" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.ticketDottedLine} />

                  <View style={styles.ticketMetaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="people" size={14} color={colors.primary} />
                      <Text style={styles.metaChipText}>{fav.activeQueueCount} in line</Text>
                    </View>

                    <View style={[styles.metaChip, { backgroundColor: colors.warningSubtle }]}>
                      <Ionicons name="hourglass" size={14} color={colors.warning} />
                      <Text style={[styles.metaChipText, { color: colors.warning }]}>
                        {fav.prediction?.rangeDisplay
                          ? `~${fav.prediction.rangeDisplay}`
                          : `~${fav.estimatedWait} mins wait`}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.queueUpBtn}
                      onPress={() => navigation.navigate("ScanJoin", { qrCode: fav.qrCode || fav._id })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.queueUpBtnText}>Queue Up</Text>
                      <Ionicons name="arrow-forward" size={13} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )
        ) : (
          /* History Tab */
          history.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No Past Visits Yet"
              description="Completed or cancelled bookings will automatically appear here."
            />
          ) : (
            history.map((entry) => {
              const shopName =
                entry.businessId?.businessProfile?.shopName ||
                entry.businessId?.shopName ||
                "QueueLess Store";
              const dateStr = entry.date || entry.joinedAt;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Previous Visit";

              return (
                <Card
                  key={entry._id}
                  variant="subtle"
                  style={styles.historyCard}
                >
                  <View style={styles.historyHeader}>
                    <View style={styles.ticketStoreCol}>
                      <Text style={styles.historyShopName} numberOfLines={1}>
                        {shopName}
                      </Text>
                      <Text style={styles.historyDate}>
                        {formattedDate} • Ticket #{entry._id.slice(-4).toUpperCase()}
                      </Text>
                    </View>
                    <StatusBadge status={entry.status} size="sm" />
                  </View>

                  <View style={styles.ticketDottedLine} />

                  <View style={styles.historyActionsRow}>
                    <TouchableOpacity
                      style={styles.rebookBtn}
                      disabled={rebookingId === entry._id}
                      onPress={() => handleQuickRebook(entry._id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="repeat-outline"
                        size={14}
                        color={colors.primary}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.rebookBtnText}>
                        {rebookingId === entry._id ? "Rebooking..." : "Rebook Services"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.trackLiveBtn}
                      onPress={() => rootNavigation.navigate("QueueStatus", { id: entry._id })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.trackLiveText}>View Ticket</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )
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
          onPress={handleOpenScanner}
          icon="camera-outline"
          size="md"
        />
      </Card>

      {/* Direct Full-Screen QR Scanner Modal */}
      <Modal
        visible={scannerOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setScannerOpen(false)}
        statusBarTranslucent
      >
        <View
          style={[
            styles.scannerModalRoot,
            {
              paddingTop: insets.top + spacing.sm,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          {/* Modal Header Bar */}
          <View style={styles.scannerModalHeader}>
            <View style={styles.scannerModalTitleRow}>
              <View style={styles.liveIndicatorDot} />
              <Text style={styles.scannerModalTitle}>Scan Counter QR Code</Text>
            </View>
            <View style={styles.scannerModalControls}>
              <TouchableOpacity
                style={[
                  styles.scannerControlBtn,
                  torchOn && styles.scannerControlBtnActive,
                ]}
                onPress={() => setTorchOn((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={torchOn ? "flash" : "flash-outline"}
                  size={18}
                  color={torchOn ? colors.warning : colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scannerControlBtn}
                onPress={() => setScannerOpen(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Camera Viewfinder Frame */}
          <View style={styles.scannerViewfinderWrap}>
            <CameraView
              onBarcodeScanned={handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              enableTorch={torchOn}
              style={styles.scannerCameraView}
            />
            <View style={styles.scannerOverlayMask} pointerEvents="none">
              <View style={styles.scannerFocusTarget}>
                <View style={[styles.scannerCorner, styles.cornerTopLeft]} />
                <View style={[styles.scannerCorner, styles.cornerTopRight]} />
                <View style={[styles.scannerCorner, styles.cornerBottomLeft]} />
                <View style={[styles.scannerCorner, styles.cornerBottomRight]} />

                <Animated.View
                  style={[
                    styles.scannerLaserLine,
                    {
                      transform: [
                        {
                          translateY: laserAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 210],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Guide & Manual Fallback Button */}
          <View style={styles.scannerModalFooter}>
            <Text style={styles.scannerInstructionText}>
              Align the merchant counter QR code within the frame to join the live line.
            </Text>
            <TouchableOpacity
              style={styles.manualFallbackBtn}
              onPress={() => {
                setScannerOpen(false);
                navigation.navigate("ScanJoin");
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="keypad-outline" size={16} color={colors.primary} />
              <Text style={styles.manualFallbackText}>Or enter store code manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  favClosedReason: {
    fontSize: 11,
    color: colors.muted,
  },
  favAddress: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  favHeartBtn: {
    padding: 8,
    borderRadius: radii.md,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  queueUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  queueUpBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  historyCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  historyShopName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  historyDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  historyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rebookBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  rebookBtnText: {
    fontSize: 12,
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
  scannerModalRoot: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    justifyContent: "space-between",
  },
  scannerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  scannerModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  scannerModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  scannerModalControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scannerControlBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardElevated,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerControlBtnActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.warning,
  },
  scannerViewfinderWrap: {
    flex: 1,
    maxHeight: 460,
    borderRadius: radii.xl,
    overflow: "hidden",
    position: "relative",
    borderColor: colors.border,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  scannerCameraView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  scannerOverlayMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(5, 11, 24, 0.45)",
  },
  scannerFocusTarget: {
    width: 220,
    height: 220,
    position: "relative",
  },
  scannerCorner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scannerLaserLine: {
    width: "100%",
    height: 2,
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  scannerModalFooter: {
    gap: spacing.md,
    alignItems: "center",
    paddingBottom: spacing.sm,
  },
  scannerInstructionText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
  manualFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  manualFallbackText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  ticketBadgeCol: {
    alignItems: "flex-end",
    gap: 4,
  },
  turnAlertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  turnAlertBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
