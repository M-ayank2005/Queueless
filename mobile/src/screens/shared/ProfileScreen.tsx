import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
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
import EmptyState from "../../components/EmptyState";
import SectionHeader from "../../components/SectionHeader";
import StatusBadge from "../../components/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { colors } from "../../theme/colors";
import { radii, shadows, spacing, typography } from "../../theme/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(user?.businessProfile || null);
  const [updatingHours, setUpdatingHours] = useState(false);

  const isBusiness = user?.role === "business" || Boolean(user?.businessProfile);

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out of QueueLess?")) {
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

  const loadData = async () => {
    try {
      if (isBusiness) {
        const res = await api.get("/business/me");
        setBusinessProfile(res.data);
      } else {
        const res = await api.get("/queue/history");
        setHistory(res.data || []);
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      await loadData();
      setLoadingData(false);
    })();
  }, [isBusiness]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  if (loadingData) {
    return (
      <AppScreen scroll={false}>
        <AppLoader
          message="Loading profile & account..."
          submessage="Retrieving account settings and history"
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
      {/* Header Profile Identity Card */}
      <Card variant="elevated" style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Ionicons
              name={isBusiness ? "storefront-outline" : "person-outline"}
              size={28}
              color={colors.primary}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{user?.name || "User Account"}</Text>
            <View style={styles.rolePill}>
              <Ionicons
                name={isBusiness ? "storefront-outline" : "person-outline"}
                size={13}
                color={colors.primary}
              />
              <Text style={styles.roleText}>
                {isBusiness ? "Merchant Account" : "Customer Account"}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Account Details Card */}
      <Card variant="default" style={styles.infoCard}>
        <SectionHeader title="Account Details" icon="person-circle-outline" />

        <View style={styles.detailsList}>
          <View style={styles.detailRow}>
            <View style={styles.iconBox}>
              <Ionicons name="person-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{user?.name || "Not specified"}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <View style={styles.iconBox}>
              <Ionicons name="mail-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{user?.email || "Not specified"}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <View style={styles.iconBox}>
              <Ionicons name="call-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{user?.phone || "Not specified"}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Role-Specific Content: Business Store Information */}
      {isBusiness && (
        <Card variant="default" style={styles.infoCard}>
          <SectionHeader
            title="Store Information"
            icon="storefront-outline"
            rightElement={<StatusBadge status="open" size="sm" />}
          />

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <Ionicons name="business-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Shop Name</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.shopName || "QueueLess Store"}
                </Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <Ionicons name="location-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Store Address</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.address || "Store Location"}
                </Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <Ionicons name="time-outline" size={17} color={colors.warning} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Operating Hours</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.workingHours?.openTime || "00:00"} -{" "}
                  {businessProfile?.workingHours?.closeTime || "23:59"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.actionPillBtn}
                onPress={setHoursTo247}
                disabled={updatingHours}
                activeOpacity={0.7}
              >
                <Ionicons name="flash-outline" size={13} color={colors.primary} />
                <Text style={styles.actionPillText}>
                  {updatingHours ? "Saving..." : "Set 24/7"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <Ionicons name="list-outline" size={17} color={colors.success} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Services Catalog</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.services?.length || 0} active services
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* Role-Specific Content: Customer Booking History */}
      {!isBusiness && (
        <View style={styles.sectionWrap}>
          <SectionHeader
            title="Booking History"
            subtitle="Past visits and completed counter tickets"
            icon="receipt-outline"
            count={history.length}
          />

          {history.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No Past Visits Yet"
              description="When you join queues and complete visits, your receipts will be archived here."
            />
          ) : (
            <View style={styles.historyList}>
              {history.map((entry) => {
                const shopName =
                  entry.businessId?.businessProfile?.shopName ||
                  entry.businessId?.shopName ||
                  "QueueLess Store";

                const dateVal = entry.date || entry.joinedAt;
                const dateStr = dateVal ? new Date(dateVal).toLocaleDateString() : "Today";

                const totalCost = (entry.selectedServices || []).reduce(
                  (acc, s) => acc + (Number(s.cost) || 0),
                  0
                );

                return (
                  <Card
                    key={entry._id}
                    variant="default"
                    onPress={() => rootNavigation.navigate("QueueStatus", { id: entry._id })}
                    style={styles.historyCard}
                  >
                    <View style={styles.historyCardTop}>
                      <View style={styles.historyStoreCol}>
                        <Text style={styles.historyShopName}>{shopName}</Text>
                        <Text style={styles.historyTicket}>
                          Ticket #{entry._id.slice(-4).toUpperCase()}
                        </Text>
                      </View>
                      <StatusBadge status={entry.status} size="sm" />
                    </View>

                    {/* Services Chips */}
                    {entry.selectedServices?.length ? (
                      <View style={styles.historyServicesRow}>
                        {entry.selectedServices.map((s, idx) => (
                          <View key={`${s.name}_${idx}`} style={styles.historyServiceChip}>
                            <Text style={styles.historyServiceChipText}>{s.name}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.historyCardBottom}>
                      <Text style={styles.historyDate}>🗓 {dateStr}</Text>
                      <Text style={styles.historyPrice}>${totalCost}</Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Sign Out Button Card */}
      <Card variant="subtle" style={styles.signOutCard}>
        <AppButton
          title="Sign Out of QueueLess"
          variant="danger"
          size="lg"
          onPress={confirmLogout}
          icon="log-out-outline"
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    padding: spacing.lg,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.cardElevated,
    borderColor: colors.primaryBorder,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
    flexWrap: "wrap",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.full,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  infoCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  detailsList: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detailTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    marginRight: spacing.xs,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flexWrap: "wrap",
  },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    flexShrink: 0,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  sectionWrap: {
    gap: spacing.md,
  },
  historyList: {
    gap: spacing.md,
  },
  historyCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  historyCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  historyStoreCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    marginRight: spacing.sm,
  },
  historyShopName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    flexWrap: "wrap",
  },
  historyTicket: {
    fontSize: 12,
    color: colors.muted,
  },
  historyServicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  historyServiceChip: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  historyServiceChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  historyCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  historyDate: {
    fontSize: 12,
    color: colors.muted,
  },
  historyPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
  },
  signOutCard: {
    padding: spacing.md,
    marginTop: spacing.xs,
  },
});
