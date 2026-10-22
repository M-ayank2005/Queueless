import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CustomerTabParamList, RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { api } from "../../lib/api";
import { QueueEntry, FavoriteStore } from "../../types";
import { Chip } from "../../components/Chip";
import { ListRow } from "../../components/ListRow";
import { QRScannerModal } from "../../components/QRScannerModal";
import EmptyState from "../../components/EmptyState";
import { QrCodeIcon, HeartIcon } from "../../assets/icons/AppIcons";
import { typography, radii, shadows } from "../../theme/theme";

type Props = BottomTabScreenProps<CustomerTabParamList, "Home">;

export default function CustomerHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"live" | "saved" | "history">("live");
  const [activeQueues, setActiveQueues] = useState<QueueEntry[]>([]);
  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteStore[]>([]);
  const [rebookingId, setRebookingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const activeRes = await api.get("/queue/my-queues");
      setActiveQueues(activeRes.data || []);

      const [historyRes, favRes] = await Promise.allSettled([
        api.get("/queue/history"),
        api.get("/queue/favorites"),
      ]);
      if (historyRes.status === "fulfilled") {
        setHistory(historyRes.value.data || []);
      }
      if (favRes.status === "fulfilled") {
        setFavorites(favRes.value.data || []);
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleQuickRebook = async (pastTicketId: string) => {
    setRebookingId(pastTicketId);
    try {
      const res = await api.post("/queue/quick-rebook", { pastTicketId });
      rootNavigation.navigate("QueueStatus", { id: res.data._id });
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Could not rebook at this time.");
    } finally {
      setRebookingId(null);
    }
  };

  const handleRemoveFavorite = async (businessId: string) => {
    try {
      await api.post("/queue/favorites/toggle", { businessId });
      setFavorites((prev) => prev.filter((f) => f._id !== businessId));
    } catch {}
  };

  const handleScannedCode = (qrCode: string) => {
    setScannerOpen(false);
    rootNavigation.navigate("ScanJoin", { qrCode });
  };

  const firstName = (user?.name || "Customer").split(" ")[0];
  const initialLetter = (user?.name || "C").charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.bg} />

      {/* Screen Content */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 12, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#284D83" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row: "Hello," above first name 20/500, right: 48px avatar */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.helloText}>Hello,</Text>
            <Text style={styles.userNameText}>{firstName}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("Profile")}
            style={styles.avatarTouch}
          >
            <LinearGradient
              colors={["#284D83", "#3E6BB2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarInitial}>{initialLetter}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Scan Bar (inset 28px, y about 109-157) */}
        <View style={styles.scanRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setScannerOpen(true)}
            style={styles.scanBar}
          >
            <QrCodeIcon size={20} color="#858585" />
            <Text style={styles.scanPlaceholder}>Scan a store QR code to join</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setScannerOpen(true)}
            style={[styles.scanButtonTouch, shadows.primaryButton]}
          >
            <LinearGradient
              colors={["#284D83", "#3E6BB2"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.scanButtonGradient}
            >
              <QrCodeIcon size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Chip Row (y about 178-217, inset 28px) */}
        <View style={styles.chipRow}>
          <Chip
            label={`Live (${activeQueues.length})`}
            active={tab === "live"}
            onPress={() => setTab("live")}
          />
          <Chip
            label={`Saved (${favorites.length})`}
            active={tab === "saved"}
            onPress={() => setTab("saved")}
          />
          <Chip
            label={`History (${history.length})`}
            active={tab === "history"}
            onPress={() => setTab("history")}
          />
        </View>

        {/* Section Title with "See all" */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {tab === "live" ? "Active Tickets" : tab === "saved" ? "Saved Stores" : "Recent History"}
          </Text>

          {tab === "live" && activeQueues.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("MyQueue")}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}

          {tab === "history" && history.length > 0 && (
            <TouchableOpacity onPress={() => rootNavigation.navigate("BookingHistory")}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lists (inset 21px) */}
        <View style={styles.listContainer}>
          {tab === "live" && (
            <>
              {activeQueues.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="No Active Queues"
                  description="Scan a QR code or pick a saved store to join a virtual queue."
                  actionLabel="Scan QR Code"
                  onAction={() => setScannerOpen(true)}
                />
              ) : (
                activeQueues.map((item) => {
                  const shopName =
                    item.businessId?.businessProfile?.shopName ||
                    item.businessId?.name ||
                    "Store Queue";
                  const peopleAhead = item.peopleAhead ?? 0;
                  const waitMin = item.currentEstimatedWait ?? 0;
                  const ticketNum = item._id ? item._id.slice(-4).toUpperCase() : "0000";

                  let alertText: string | undefined;
                  if (item.alert?.active) {
                    alertText =
                      item.alert.type === "YOUR_TURN"
                        ? "Your turn is ready!"
                        : "Your turn is near";
                  }

                  return (
                    <ListRow
                      key={item._id}
                      title={shopName}
                      subtitleNavy={`${peopleAhead} people ahead`}
                      subtitleGrey={`Ticket #${ticketNum}`}
                      statusPill={{ status: item.status }}
                      rightValue={waitMin > 0 ? `~${waitMin} min` : "Now"}
                      alertBadge={alertText}
                      onPress={() => rootNavigation.navigate("QueueStatus", { id: item._id })}
                    />
                  );
                })
              )}
            </>
          )}

          {tab === "saved" && (
            <>
              {favorites.length === 0 ? (
                <EmptyState
                  icon="heart-outline"
                  title="No Saved Stores"
                  description="Tap the heart icon when visiting any store to save it here for fast re-booking."
                />
              ) : (
                favorites.map((store) => {
                  const shopName =
                    store.businessProfile?.shopName || store.shopName || store.name || "Store";
                  const address =
                    store.businessProfile?.address || "Address unavailable";
                  const qr =
                    store.businessProfile?.uniqueQrCode || store.uniqueQrCode || store.qrCode;

                  return (
                    <ListRow
                      key={store._id}
                      title={shopName}
                      subtitleGrey={address}
                      statusPill={{
                        type: store.isOpen ? "open" : "closed",
                        label: store.isOpen ? "Open" : "Closed",
                      }}
                      rightElement={
                        <View style={styles.savedActionRow}>
                          {qr && (
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => rootNavigation.navigate("ScanJoin", { qrCode: qr })}
                              style={styles.miniQueueUpBtn}
                            >
                              <LinearGradient
                                colors={["#284D83", "#3E6BB2"]}
                                style={styles.miniGradient}
                              >
                                <Text style={styles.miniQueueUpText}>Queue Up</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => handleRemoveFavorite(store._id)}
                            style={styles.removeFavBtn}
                          >
                            <HeartIcon size={20} color="#FC0015" filled />
                          </TouchableOpacity>
                        </View>
                      }
                      onPress={() => {
                        if (qr) rootNavigation.navigate("ScanJoin", { qrCode: qr });
                      }}
                    />
                  );
                })
              )}
            </>
          )}

          {tab === "history" && (
            <>
              {history.length === 0 ? (
                <EmptyState
                  icon="calendar-outline"
                  title="No Past Visits"
                  description="Your completed and cancelled tickets will appear here."
                />
              ) : (
                history.slice(0, 10).map((ticket) => {
                  const shopName =
                    ticket.businessId?.businessProfile?.shopName ||
                    ticket.businessId?.name ||
                    "Past Visit";
                  const dateStr = ticket.date
                    ? new Date(ticket.date).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                      })
                    : "";
                  const ticketNum = ticket._id ? ticket._id.slice(-4).toUpperCase() : "";

                  return (
                    <ListRow
                      key={ticket._id}
                      title={shopName}
                      subtitleGrey={`${dateStr} • #${ticketNum}`}
                      statusPill={{ status: ticket.status }}
                      rightElement={
                        <TouchableOpacity
                          onPress={() => handleQuickRebook(ticket._id)}
                          disabled={rebookingId === ticket._id}
                        >
                          <Text style={styles.rebookText}>
                            {rebookingId === ticket._id ? "Rebooking..." : "Rebook"}
                          </Text>
                        </TouchableOpacity>
                      }
                      onPress={() => rootNavigation.navigate("QueueStatus", { id: ticket._id })}
                    />
                  );
                })
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* QR Camera Scanner Modal */}
      <QRScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScannedCode}
        onManualEntry={() => {
          setScannerOpen(false);
          rootNavigation.navigate("ScanJoin");
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollContent: {
      flexGrow: 1,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    helloText: {
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    userNameText: {
      fontSize: 20,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      marginTop: 2,
    },
    avatarTouch: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    avatarGradient: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: 20,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    scanRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 28,
      gap: 12,
      marginBottom: 22,
    },
    scanBar: {
      flex: 1,
      height: 48,
      backgroundColor: colors.cardSoft,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.search,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      gap: 10,
    },
    scanPlaceholder: {
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.placeholder,
    },
    scanButtonTouch: {
      width: 48,
      height: 48,
      borderRadius: radii.iconButton,
    },
    scanButtonGradient: {
      width: 48,
      height: 48,
      borderRadius: radii.iconButton,
      alignItems: "center",
      justifyContent: "center",
    },
    chipRow: {
      flexDirection: "row",
      paddingHorizontal: 28,
      gap: 16,
      marginBottom: 26,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 21,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: typography.families.interRegular,
      color: colors.textPrimary,
    },
    seeAllText: {
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    listContainer: {
      paddingHorizontal: 21,
      gap: 12,
    },
    savedActionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    miniQueueUpBtn: {
      borderRadius: 8,
      overflow: "hidden",
    },
    miniGradient: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    miniQueueUpText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
    },
    removeFavBtn: {
      padding: 4,
    },
    rebookText: {
      color: colors.primary,
      fontSize: 13,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
    },
  });
