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
import { useTheme } from "../../context/ThemeContext";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { radii, spacing } from "../../theme/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme, setTheme, colors } = useTheme();
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
          <View style={[styles.avatar, { backgroundColor: colors.cardElevated, borderColor: colors.primaryBorder }]}>
            <Ionicons
              name={isBusiness ? "storefront-outline" : "person-outline"}
              size={28}
              color={colors.primary}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name || "User Account"}</Text>
            <View style={[styles.rolePill, { backgroundColor: colors.primarySubtle, borderColor: colors.primaryBorder }]}>
              <Ionicons
                name={isBusiness ? "storefront-outline" : "person-outline"}
                size={13}
                color={colors.primary}
              />
              <Text style={[styles.roleText, { color: colors.primary }]}>
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
            <View style={[styles.iconBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Full Name</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{user?.name || "Not specified"}</Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.detailRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Email Address</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{user?.email || "Not specified"}</Text>
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.detailRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
              <Ionicons name="call-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.detailTextCol}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Phone Number</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{user?.phone || "Not specified"}</Text>
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
              <View style={[styles.iconBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
                <Ionicons name="business-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Shop Name</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {businessProfile?.shopName || "QueueLess Store"}
                </Text>
              </View>
            </View>

            <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={17} color={colors.primary} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Store Address</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {businessProfile?.address || "Store Location"}
                </Text>
              </View>
            </View>

            <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={17} color={colors.warning} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Operating Hours</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {businessProfile?.workingHours?.openTime || "00:00"} -{" "}
                  {businessProfile?.workingHours?.closeTime || "23:59"}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.actionPillBtn, { backgroundColor: colors.primarySubtle, borderColor: colors.primaryBorder }]}
                onPress={setHoursTo247}
                disabled={updatingHours}
                activeOpacity={0.7}
              >
                <Ionicons name="flash-outline" size={13} color={colors.primary} />
                <Text style={[styles.actionPillText, { color: colors.primary }]}>
                  {updatingHours ? "Saving..." : "Set 24/7"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.rowDivider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
                <Ionicons name="list-outline" size={17} color={colors.success} />
              </View>
              <View style={styles.detailTextCol}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Services Catalog</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {businessProfile?.services?.length || 0} active services
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}

      {/* Appearance & Theme Settings Card - Positioned below Account Details */}
      <Card variant="default" style={styles.infoCard}>
        <SectionHeader
          title="Appearance & Theme"
          subtitle="Select application theme for this device"
          icon="color-palette-outline"
        />

        <View style={styles.themeSelectorRow}>
          {/* Light Mode Option */}
          <TouchableOpacity
            style={[
              styles.themeOptionBtn,
              {
                backgroundColor: theme === "light" ? colors.primarySubtle : colors.cardSoft,
                borderColor: theme === "light" ? colors.primary : colors.border,
                borderWidth: theme === "light" ? 2 : 1,
              },
            ]}
            onPress={() => setTheme("light")}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: theme === "light" }}
            accessibilityLabel="Light Mode"
          >
            <View style={styles.themeOptionHeader}>
              <View style={[styles.themeIconWrap, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="sunny" size={20} color="#D97706" />
              </View>
              {theme === "light" && (
                <View style={[styles.themeCheckmark, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={[styles.themeOptionTitle, { color: colors.text }]}>Light Mode</Text>
            <Text style={[styles.themeOptionSubtitle, { color: colors.muted }]}>
              Crisp daylight clarity (Default)
            </Text>
          </TouchableOpacity>

          {/* Dark Mode Option */}
          <TouchableOpacity
            style={[
              styles.themeOptionBtn,
              {
                backgroundColor: theme === "dark" ? colors.primarySubtle : colors.cardSoft,
                borderColor: theme === "dark" ? colors.primary : colors.border,
                borderWidth: theme === "dark" ? 2 : 1,
              },
            ]}
            onPress={() => setTheme("dark")}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityState={{ selected: theme === "dark" }}
            accessibilityLabel="Dark Mode"
          >
            <View style={styles.themeOptionHeader}>
              <View style={[styles.themeIconWrap, { backgroundColor: "#1E2D4A" }]}>
                <Ionicons name="moon" size={20} color="#60A5FA" />
              </View>
              {theme === "dark" && (
                <View style={[styles.themeCheckmark, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={[styles.themeOptionTitle, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.themeOptionSubtitle, { color: colors.muted }]}>
              Midnight contrast for low light
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.themeStatusRow}>
          <Text style={[styles.themeStatusText, { color: colors.muted }]}>
            Active: <Text style={{ color: colors.text, fontWeight: "700" }}>{theme === "dark" ? "Dark Mode" : "Light Mode"}</Text>
          </Text>
        </View>
      </Card>

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
                        <Text style={[styles.historyShopName, { color: colors.text }]}>{shopName}</Text>
                        <Text style={[styles.historyTicket, { color: colors.muted }]}>
                          Ticket #{entry._id.slice(-4).toUpperCase()}
                        </Text>
                      </View>
                      <StatusBadge status={entry.status} size="sm" />
                    </View>

                    {/* Services Chips */}
                    {entry.selectedServices?.length ? (
                      <View style={styles.historyServicesRow}>
                        {entry.selectedServices.map((s, idx) => (
                          <View 
                            key={`${s.name}_${idx}`} 
                            style={[styles.historyServiceChip, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}
                          >
                            <Text style={[styles.historyServiceChipText, { color: colors.textSecondary }]}>{s.name}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    <View style={[styles.historyCardBottom, { borderTopColor: colors.borderSubtle }]}>
                      <Text style={[styles.historyDate, { color: colors.muted }]}>🗓 {dateStr}</Text>
                      <Text style={[styles.historyPrice, { color: colors.primary }]}>${totalCost}</Text>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Simple, Smaller Centered Sign Out Button */}
      <View style={styles.signOutContainer}>
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.dangerBorder, backgroundColor: colors.dangerSubtle }]}
          onPress={confirmLogout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Sign Out of QueueLess"
        >
          <Ionicons name="log-out-outline" size={15} color={colors.danger} />
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  name: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    flexWrap: "wrap",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
  },
  infoCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  themeSelectorRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  themeOptionBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  themeOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  themeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  themeCheckmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  themeOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  themeOptionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  themeStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  themeStatusText: {
    fontSize: 12,
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
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    flexWrap: "wrap",
  },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    flexShrink: 0,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  rowDivider: {
    height: 1,
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
    flexWrap: "wrap",
  },
  historyTicket: {
    fontSize: 12,
  },
  historyServicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  historyServiceChip: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  historyServiceChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  historyCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
    borderTopWidth: 1,
  },
  historyDate: {
    fontSize: 12,
  },
  historyPrice: {
    fontSize: 16,
    fontWeight: "800",
  },
  signOutContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 22,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
