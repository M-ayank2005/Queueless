import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppLoader from "../../components/AppLoader";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { CustomerTabParamList, RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { colors } from "../../theme/colors";

type Props = BottomTabScreenProps<CustomerTabParamList, "Home">;

type NearbyStore = {
  id: string;
  name: string;
  category: string;
  categoryIcon: keyof typeof Ionicons.glyphMap;
  address: string;
  distance: string;
  rating: string;
  liveWait: string;
  queueCount: number;
  qrCode: string;
  badge?: string;
  serviceCount: number;
  startingPrice: number;
  servicesPreview: string;
};

const NEARBY_STORES: NearbyStore[] = [
  {
    id: "6acdc1e216ba0d83d2e375bf",
    name: "Kirana Store",
    category: "Kirana & Essentials",
    categoryIcon: "cart-outline",
    address: "LKO Main Road",
    distance: "0.1 km away",
    rating: "5.0",
    liveWait: "~2 mins wait",
    queueCount: 0,
    badge: "Fastest",
    qrCode: "7a9cf8d7-c4fa-44fc-881e-93306e9d57ba",
    serviceCount: 2,
    startingPrice: 10,
    servicesPreview: "Biscuit, Namkeen & essentials",
  },
  {
    id: "6a01ff3faecc9b60c8a3e36e",
    name: "iTech Mobile & Repair Center",
    category: "Tech & Repair",
    categoryIcon: "hardware-chip-outline",
    address: "Shop 4, Tech Plaza, Main Market",
    distance: "0.3 km away",
    rating: "4.9",
    liveWait: "~15 mins wait",
    queueCount: 2,
    badge: "Popular",
    qrCode: "ded50422-e0f1-47ff-9faf-98431a703c38",
    serviceCount: 3,
    startingPrice: 15,
    servicesPreview: "Screen Replacement, Battery & Diagnostics",
  },
  {
    id: "6a2ebab3c791919da67fd443",
    name: "Pandit Ji Flour Mill & Spices",
    category: "Grocery & Milling",
    categoryIcon: "leaf-outline",
    address: "Old Clock Tower Market",
    distance: "0.6 km away",
    rating: "4.8",
    liveWait: "~8 mins wait",
    queueCount: 1,
    qrCode: "91a6cab3-b453-40ce-be20-b7d998ab2dbf",
    serviceCount: 3,
    startingPrice: 5,
    servicesPreview: "Atta Grinding, Mustard Oil & Multigrain",
  },
  {
    id: "69811a1f1eb99fb3ff4f54a5",
    name: "St. Xavier's Student Services",
    category: "University & Admin",
    categoryIcon: "school-outline",
    address: "Campus Admin Block A",
    distance: "1.2 km away",
    rating: "4.7",
    liveWait: "~10 mins wait",
    queueCount: 3,
    qrCode: "6c6af83b-a760-4549-aaf5-18a2510855d8",
    serviceCount: 3,
    startingPrice: 0,
    servicesPreview: "Fee Clearance, Document Verification & Transcripts",
  },
  {
    id: "6a01ff3faecc9b60c8a3e36e_luxe",
    name: "Luxe Cuts Salon & Grooming",
    category: "Salon & Spa",
    categoryIcon: "cut-outline",
    address: "12 Avenue Promenade",
    distance: "0.4 km away",
    rating: "4.9",
    liveWait: "~20 mins wait",
    queueCount: 2,
    badge: "Trending",
    qrCode: "ded50422-e0f1-47ff-9faf-98431a703c38",
    serviceCount: 3,
    startingPrice: 15,
    servicesPreview: "Haircut & Styling, Beard Trim & Hair Spa",
  },
];

const CATEGORIES = [
  "All",
  "Tech & Repair",
  "Kirana & Essentials",
  "Grocery & Milling",
  "University & Admin",
  "Salon & Spa",
];

export default function CustomerHomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [activeQueues, setActiveQueues] = useState<QueueEntry[]>([]);
  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleOpenStoreBooking = (qrCode: string) => {
    navigation.navigate("ScanJoin", { qrCode });
  };

  const filteredStores = useMemo(() => {
    if (selectedCategory === "All") return NEARBY_STORES;
    return NEARBY_STORES.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <AppLoader
          message="Loading queues & nearby services..."
          submessage="Checking live wait times and available slots"
        />
      </AppScreen>
    );
  }

  const entries = tab === "active" ? activeQueues : history;

  return (
    <AppScreen>
      {/* Clean Uncongested Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingText}>Hello, {user?.name || "Customer"} 👋</Text>
          <Text style={styles.mainTitle}>QueueLess</Text>
        </View>

        <TouchableOpacity
          style={styles.scanActionBtn}
          onPress={() => navigation.navigate("ScanJoin")}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={17} color="#FFF" />
          <Text style={styles.scanActionText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      {/* Live Queues & Past History Switcher */}
      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setTab("active")}
          style={[styles.tabBtn, tab === "active" && styles.tabActive]}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={tab === "active" ? colors.primary : colors.muted}
          />
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            Live Tickets ({activeQueues.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTab("history")}
          style={[styles.tabBtn, tab === "history" && styles.tabActive]}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={tab === "history" ? colors.primary : colors.muted}
          />
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>
            Past History ({history.length})
          </Text>
        </Pressable>
      </View>

      {/* Queue Tickets / History List */}
      <View style={styles.queueSection}>
        {entries.length === 0 ? (
          <Card style={styles.emptyQueueCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={tab === "active" ? "checkmark-circle-outline" : "calendar-outline"}
                size={26}
                color={colors.primary}
              />
            </View>
            <View style={styles.emptyTextWrap}>
              <Text style={styles.emptyTitle}>
                {tab === "active" ? "No Active Queue Tickets" : "No Past Bookings Yet"}
              </Text>
              <Text style={styles.emptyText}>
                {tab === "active"
                  ? "You're all clear! Explore nearby stores below to secure your spot in advance."
                  : "Completed or cancelled bookings will show up here."}
              </Text>
            </View>
          </Card>
        ) : (
          entries.map((entry) => {
            const shopName =
              entry.businessId?.businessProfile?.shopName ||
              entry.businessId?.shopName ||
              "QueueLess Store";
            const wait = entry.currentEstimatedWait ?? 0;
            const ahead = entry.peopleAhead ?? 0;
            const isCompleted = entry.status === "completed";
            const isCancelled = entry.status === "cancelled";

            return (
              <Pressable
                key={entry._id}
                onPress={() => rootNavigation.navigate("QueueStatus", { id: entry._id })}
                style={styles.queueCardPressable}
              >
                <Card style={styles.activeQueueCard}>
                  <View style={styles.queueCardTop}>
                    <View style={styles.flex1}>
                      <Text style={styles.queueShopName}>{shopName}</Text>
                      <Text style={styles.ticketPill}>
                        Ticket #{entry._id.slice(-4).toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isCompleted && styles.statusCompleted,
                        isCancelled && styles.statusCancelled,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          isCompleted && { backgroundColor: "#10B981" },
                          isCancelled && { backgroundColor: "#EF4444" },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isCompleted && { color: "#10B981" },
                          isCancelled && { color: "#EF4444" },
                        ]}
                      >
                        {entry.status.replace("_", " ").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.queueCardBottom}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="people-outline" size={14} color={colors.primary} />
                      <Text style={styles.metaBadgeText}>{ahead} ahead</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Ionicons name="hourglass-outline" size={14} color="#F59E0B" />
                      <Text style={[styles.metaBadgeText, { color: "#F59E0B" }]}>
                        ~{wait} mins wait
                      </Text>
                    </View>
                    <View style={styles.tapToView}>
                      <Text style={styles.tapToViewText}>Track Live →</Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Nearby Stores Section Header */}
      <View style={styles.nearbySectionHeader}>
        <View style={styles.nearbyTitleRow}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name="compass-outline" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionHeading}>Nearby Services</Text>
            <Text style={styles.sectionSubHeading}>Tap any store to view services & book queue</Text>
          </View>
        </View>
      </View>

      {/* Category Horizontal Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Stores List: Sleek, responsive cards */}
      <View style={styles.storesList}>
        {filteredStores.map((store) => (
          <TouchableOpacity
            key={store.id}
            onPress={() => handleOpenStoreBooking(store.qrCode)}
            activeOpacity={0.85}
          >
            <Card style={styles.storeCard}>
              <View style={styles.storeCardHeader}>
                <View style={styles.storeIconCircle}>
                  <Ionicons name={store.categoryIcon} size={22} color={colors.primary} />
                </View>

                <View style={styles.storeTitleCol}>
                  <View style={styles.storeNameRow}>
                    <Text style={styles.storeName}>{store.name}</Text>
                    {store.badge && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>{store.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.storeAddress}>{store.address}</Text>

                  {/* Rating + Distance + Live Wait */}
                  <View style={styles.storeMetaRow}>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#FBBF24" />
                      <Text style={styles.ratingText}>{store.rating}</Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.storeDistance}>{store.distance}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.waitPill}>
                      <View style={styles.waitDot} />
                      <Text style={styles.waitPillText}>{store.liveWait}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Services Sneak Peek / Summary */}
              <View style={styles.servicesSnippetRow}>
                <Ionicons name="pricetag-outline" size={13} color={colors.muted} />
                <Text style={styles.servicesSnippetText} numberOfLines={1}>
                  {store.servicesPreview}
                </Text>
              </View>

              {/* Action Bar */}
              <View style={styles.storeCardActionRow}>
                <Text style={styles.serviceCountHint}>
                  {store.serviceCount} services {store.startingPrice > 0 ? `from $${store.startingPrice}` : "available"}
                </Text>

                <View style={styles.bookQueueCta}>
                  <Text style={styles.bookQueueCtaText}>Select & Book</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    paddingBottom: 4,
  },
  headerLeft: {
    gap: 2,
  },
  greetingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  mainTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  scanActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scanActionText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardSoft,
    borderRadius: 12,
    paddingVertical: 11,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.16)",
  },
  tabText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: "800",
  },
  queueSection: {
    marginTop: 4,
    gap: 10,
  },
  emptyQueueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTextWrap: {
    flex: 1,
    gap: 3,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  queueCardPressable: {
    borderRadius: 16,
  },
  activeQueueCard: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.35)",
    backgroundColor: colors.card,
  },
  queueCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  flex1: {
    flex: 1,
  },
  queueShopName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  ticketPill: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  statusCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusCancelled: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  queueCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.07)",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  tapToView: {
    marginLeft: "auto",
  },
  tapToViewText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },

  /* NEARBY SECTION */
  nearbySectionHeader: {
    marginTop: 18,
    marginBottom: 4,
  },
  nearbyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(59, 130, 246, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubHeading: {
    color: colors.muted,
    fontSize: 12,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  categoryChip: {
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderColor: colors.primary,
  },
  categoryChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },

  /* STORE CARD */
  storesList: {
    gap: 12,
    paddingBottom: 24,
  },
  storeCard: {
    padding: 16,
    gap: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeCardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  storeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
  },
  storeTitleCol: {
    flex: 1,
    gap: 3,
  },
  storeNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storeName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  popularBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  popularBadgeText: {
    color: "#FBBF24",
    fontSize: 10,
    fontWeight: "800",
  },
  storeAddress: {
    color: colors.muted,
    fontSize: 12,
  },
  storeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "800",
  },
  metaDot: {
    color: colors.muted,
    fontSize: 12,
  },
  storeDistance: {
    color: colors.muted,
    fontSize: 12,
  },
  waitPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  waitDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#10B981",
  },
  waitPillText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "700",
  },

  /* SERVICES SNIPPET */
  servicesSnippetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  servicesSnippetText: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
  },

  /* ACTION ROW */
  storeCardActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  serviceCountHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  bookQueueCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookQueueCtaText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
});
