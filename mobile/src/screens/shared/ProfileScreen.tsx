import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppLoader from "../../components/AppLoader";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { colors } from "../../theme/colors";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [businessProfile, setBusinessProfile] = useState<any>(user?.businessProfile || null);
  const [updatingHours, setUpdatingHours] = useState(false);

  const isBusiness = user?.role === "business" || Boolean(user?.businessProfile);

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        logout();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out of QueueLess?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: logout },
      ]);
    }
  };

  const setHoursTo247 = async () => {
    try {
      setUpdatingHours(true);
      await api.put("/business/settings", {
        workingHours: {
          openTime: "00:00",
          closeTime: "23:59",
          closedDays: [],
        },
      });
      setBusinessProfile((prev: any) => ({
        ...prev,
        workingHours: { openTime: "00:00", closeTime: "23:59", closedDays: [] },
      }));
      const msg = "Store is now set to 24/7 (Always Open)! Customers can join anytime.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Store Updated", msg);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Could not update hours";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    } finally {
      setUpdatingHours(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        if (isBusiness) {
          const res = await api.get("/business/me");
          setBusinessProfile(res.data);
        } else {
          const res = await api.get("/queue/history");
          setHistory(res.data || []);
        }
      } catch {
        // graceful fallback
      } finally {
        setLoadingData(false);
      }
    })();
  }, [isBusiness]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "rgba(16, 185, 129, 0.15)", text: "#10B981", border: "rgba(16, 185, 129, 0.3)" };
      case "in_progress":
        return { bg: "rgba(59, 130, 246, 0.15)", text: "#60A5FA", border: "rgba(59, 130, 246, 0.3)" };
      case "cancelled":
        return { bg: "rgba(239, 68, 68, 0.15)", text: "#EF4444", border: "rgba(239, 68, 68, 0.3)" };
      default:
        return { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.3)" };
    }
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <AppScreen>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{user?.name || "User"}</Text>
          <View style={styles.rolePill}>
            <Ionicons
              name={isBusiness ? "storefront-outline" : "person-outline"}
              size={13}
              color={colors.primary}
            />
            <Text style={styles.roleText}>{isBusiness ? "Business Account" : "Customer Account"}</Text>
          </View>
        </View>
      </View>

      {/* Account Details Card */}
      <Card style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.detailList}>
          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Ionicons name="person-outline" size={16} color={colors.muted} />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{user?.name || "Not provided"}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Ionicons name="mail-outline" size={16} color={colors.muted} />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{user?.email || "name@example.com"}</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <View style={styles.detailIconWrap}>
              <Ionicons name="call-outline" size={16} color={colors.muted} />
            </View>
            <View style={styles.detailTextWrap}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{user?.phone || "+1 555 123 4567"}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* BUSINESS VIEW: Store Details */}
      {isBusiness ? (
        <Card style={styles.detailsCard}>
          <View style={styles.storeHeaderRow}>
            <Text style={styles.sectionTitle}>Store Information</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Open</Text>
            </View>
          </View>

          <View style={styles.detailList}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="business-outline" size={16} color={colors.muted} />
              </View>
              <View style={styles.detailTextWrap}>
                <Text style={styles.detailLabel}>Shop Name</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.shopName || user?.businessProfile?.shopName || user?.name}
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="location-outline" size={16} color={colors.muted} />
              </View>
              <View style={styles.detailTextWrap}>
                <Text style={styles.detailLabel}>Store Address</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.address || user?.businessProfile?.address || "Store Address"}
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="time-outline" size={16} color={colors.muted} />
              </View>
              <View style={styles.detailTextWrap}>
                <Text style={styles.detailLabel}>Operating Hours</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.workingHours?.openTime && businessProfile?.workingHours?.closeTime
                    ? `${businessProfile.workingHours.openTime} - ${businessProfile.workingHours.closeTime}`
                    : "24/7 (00:00 - 23:59)"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.setHoursBtn}
                onPress={setHoursTo247}
                disabled={updatingHours}
                activeOpacity={0.8}
              >
                <Ionicons name="flash-outline" size={13} color={colors.primary} />
                <Text style={styles.setHoursBtnText}>
                  {updatingHours ? "..." : "Set 24/7"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.separator} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconWrap}>
                <Ionicons name="list-outline" size={16} color={colors.muted} />
              </View>
              <View style={styles.detailTextWrap}>
                <Text style={styles.detailLabel}>Services Offered</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.services?.length || user?.businessProfile?.services?.length || 0} active services
                </Text>
              </View>
            </View>
          </View>
        </Card>
      ) : (
        /* CUSTOMER VIEW: Booking History Section */
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Booking History</Text>
            <Text style={styles.countBadge}>
              {history.length} {history.length === 1 ? "booking" : "bookings"}
            </Text>
          </View>

          {loadingData ? (
            <AppLoader
              message="Loading your booking history..."
              submessage="Retrieving your past visits and receipts"
              inline
            />
          ) : history.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={30} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>No Booking History</Text>
              <Text style={styles.emptyText}>
                You haven&apos;t joined any queues yet. Use the Scan & Join tab or explore nearby stores to book!
              </Text>
            </Card>
          ) : (
            <View style={styles.historyList}>
              {history.map((entry) => {
                const shopName =
                  entry.businessId?.businessProfile?.shopName ||
                  entry.businessId?.shopName ||
                  "Store Appointment";
                const statusConfig = getStatusColor(entry.status);
                const totalCost = (entry.selectedServices || []).reduce(
                  (acc, s) => acc + (Number(s.cost) || 0),
                  0
                );
                const ticketNo = entry._id ? entry._id.slice(-4).toUpperCase() : "0000";

                return (
                  <Pressable
                    key={entry._id}
                    onPress={() => rootNavigation.navigate("QueueStatus", { id: entry._id })}
                    style={({ pressed }) => [styles.bookingCardWrap, pressed && styles.pressed]}
                  >
                    <Card style={styles.bookingCard}>
                      <View style={styles.bookingTopRow}>
                        <View style={styles.shopInfo}>
                          <Text style={styles.bookingShop}>{shopName}</Text>
                          <Text style={styles.ticketBadge}>Ticket #{ticketNo}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: statusConfig.bg,
                              borderColor: statusConfig.border,
                            },
                          ]}
                        >
                          <Text style={[styles.statusText, { color: statusConfig.text }]}>
                            {entry.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {entry.selectedServices && entry.selectedServices.length > 0 ? (
                        <View style={styles.servicesPills}>
                          {entry.selectedServices.map((service, idx) => (
                            <View key={idx} style={styles.servicePill}>
                              <Text style={styles.servicePillText}>{service.name}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.bookingFooter}>
                        <Text style={styles.bookingDate}>
                          {entry.date ? new Date(entry.date).toLocaleDateString() : "Recent"}
                        </Text>
                        {totalCost > 0 ? (
                          <Text style={styles.bookingCost}>${totalCost}</Text>
                        ) : null}
                      </View>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Logout Action */}
      <View style={styles.logoutWrap}>
        <AppButton
          title="Sign Out"
          variant="danger"
          onPress={confirmLogout}
          icon="log-out-outline"
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardSoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  roleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  detailsCard: {
    paddingVertical: 18,
    gap: 12,
  },
  storeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  countBadge: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  detailList: {
    marginTop: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  centeredCard: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },
  emptyCard: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textAlign: "center",
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  historyList: {
    gap: 10,
  },
  bookingCardWrap: {
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  bookingCard: {
    padding: 16,
    gap: 10,
  },
  bookingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shopInfo: {
    flex: 1,
    gap: 2,
  },
  bookingShop: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  ticketBadge: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  servicesPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  servicePill: {
    backgroundColor: colors.cardSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  servicePillText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookingDate: {
    color: colors.muted,
    fontSize: 12,
  },
  bookingCost: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  logoutWrap: {
    marginTop: 8,
    marginBottom: 20,
  },
  setHoursBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  setHoursBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
});
