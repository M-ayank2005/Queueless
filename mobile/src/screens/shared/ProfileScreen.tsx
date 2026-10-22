import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenHeader from "../../components/ScreenHeader";
import AppLoader from "../../components/AppLoader";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { api } from "../../lib/api";
import { RootStackParamList } from "../../navigation/types";
import { QueueEntry } from "../../types";
import { typography, radii, shadows } from "../../theme/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme, setTheme, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<any>(user?.businessProfile || null);
  const [updatingHours, setUpdatingHours] = useState(false);

  const isBusiness = user?.role === "business" || Boolean(user?.businessProfile);
  const initialLetter = (user?.name || "U").charAt(0).toUpperCase();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(isBusiness ? "Dashboard" : "Home");
    }
  };

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
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        <AppLoader
          message="Loading profile & account..."
          submessage="Retrieving account settings and history"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: Math.max(insets.bottom + 64 + 60, 160),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#284D83"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Profile"
          showBack={true}
          onBack={handleBack}
        />

        {/* 1. Identity Card: 64px gradient avatar */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <LinearGradient
              colors={["#284D83", "#3E6BB2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarInitial}>{initialLetter}</Text>
            </LinearGradient>

            <View style={styles.headerInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || "User Account"}
              </Text>
              <Text style={styles.userRole}>
                {isBusiness ? "Merchant Account" : "Customer Account"}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Account Details Card: detail rows with 20px outline icons, 12px grey label over 15px value */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Account Details</Text>

          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.detailIcon} />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{user?.name || "Not specified"}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.detailIcon} />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{user?.email || "Not specified"}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.detailIcon} />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>{user?.phone || "Not specified"}</Text>
            </View>
          </View>
        </View>

        {/* 3. Business Information (Merchant Only) */}
        {isBusiness && (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardSectionTitle}>Store Information</Text>
              <View style={styles.openPill}>
                <Text style={styles.openPillText}>Open</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="storefront-outline" size={20} color={colors.primary} style={styles.detailIcon} />
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Shop Name</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.shopName || "QueueLess Store"}
                </Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={colors.primary} style={styles.detailIcon} />
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Store Address</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.address || "Store Location"}
                </Text>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={colors.primary} style={styles.detailIcon} />
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Operating Hours</Text>
                <Text style={styles.detailValue}>
                  {businessProfile?.workingHours?.openTime || "00:00"} -{" "}
                  {businessProfile?.workingHours?.closeTime || "23:59"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.set247Btn}
                onPress={setHoursTo247}
                disabled={updatingHours}
                activeOpacity={0.7}
              >
                <Text style={styles.set247Text}>
                  {updatingHours ? "Saving..." : "Set 24/7"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 4. Menu Actions */}
        <View style={styles.card}>
          {!isBusiness && (
            <>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => navigation.navigate("BookingHistory")}
                activeOpacity={0.7}
              >
                <Ionicons name="receipt-outline" size={20} color={colors.primary} style={styles.menuIcon} />
                <Text style={styles.menuTitle}>Booking History</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
              <View style={styles.rowDivider} />
            </>
          )}

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("HelpSupport")}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("PrivacyPolicy")}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate("Terms")}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primary} style={styles.menuIcon} />
            <Text style={styles.menuTitle}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* 5. Appearance & Theme Toggle */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Appearance</Text>
          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                theme === "light" && styles.themeBtnActive,
              ]}
              onPress={() => setTheme("light")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sunny-outline"
                size={18}
                color={theme === "light" ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  styles.themeBtnText,
                  theme === "light" && styles.themeBtnTextActive,
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeBtn,
                theme === "dark" && styles.themeBtnActive,
              ]}
              onPress={() => setTheme("dark")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="moon-outline"
                size={18}
                color={theme === "dark" ? colors.primary : colors.muted}
              />
              <Text
                style={[
                  styles.themeBtnText,
                  theme === "dark" && styles.themeBtnTextActive,
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6. Sign Out Button: Outline button (white bg, 1px #D5D5E0, radius 10, height 46) */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={confirmLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color="#FC0015" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
      paddingHorizontal: 16,
      gap: 16,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radii.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    avatarGradient: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: 24,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    headerInfo: {
      flex: 1,
      justifyContent: "center",
    },
    userName: {
      fontSize: 18,
      fontFamily: typography.families.interSemiBold,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    userRole: {
      fontSize: 13,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
      marginTop: 2,
    },
    cardSectionTitle: {
      fontSize: 16,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.textPrimary,
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
    },
    detailIcon: {
      marginRight: 14,
    },
    detailTextCol: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 12,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.text,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    openPill: {
      backgroundColor: colors.statusOpenBg,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    openPillText: {
      color: colors.statusOpenText,
      fontSize: 12,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
    },
    set247Btn: {
      backgroundColor: colors.primarySubtle,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.button,
      borderWidth: 1,
      borderColor: colors.outlineBorder,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },
    set247Text: {
      color: colors.primary,
      fontSize: 12,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
    },
    menuIcon: {
      marginRight: 14,
    },
    menuTitle: {
      flex: 1,
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.text,
    },
    themeToggleRow: {
      flexDirection: "row",
      gap: 12,
    },
    themeBtn: {
      flex: 1,
      height: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardSoft,
      gap: 8,
    },
    themeBtnActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySubtle,
    },
    themeBtnText: {
      fontSize: 14,
      fontFamily: typography.families.interRegular,
      color: colors.muted,
    },
    themeBtnTextActive: {
      color: colors.primary,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
    },
    logoutBtn: {
      height: 48,
      borderRadius: radii.button,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
      marginBottom: 32,
    },
    logoutIcon: {
      marginRight: 8,
    },
    logoutText: {
      fontSize: 15,
      fontFamily: typography.families.interMedium,
      fontWeight: "500",
      color: colors.danger,
    },
  });
