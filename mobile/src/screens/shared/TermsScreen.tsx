import React, { useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { radii, spacing } from "../../theme/theme";

export default function TermsScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const openEmail = () => {
    Linking.openURL("mailto:support@queueless.local?subject=Terms%20Inquiry");
  };

  return (
    <AppScreen contentContainerStyle={styles.screenContent}>
      {/* Header with back button */}
      <View style={styles.headerRow}>
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

        <View style={styles.versionPill}>
          <Text style={styles.versionPillText}>Version v1.0.0</Text>
        </View>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.pageTitle}>Terms & Conditions</Text>
        <Text style={styles.pageSubtitle}>
          Effective: October 18, 2026 • QueueLess Platform
        </Text>
      </View>

      {/* Owner Review Notice */}
      <View style={styles.noticeBox}>
        <Ionicons name="information-circle" size={18} color="#D97706" />
        <Text style={styles.noticeText}>
          This document represents the platform terms of service. Review with legal counsel prior to formal commercial launch.
        </Text>
      </View>

      {/* Section 1 */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="document-text" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>1. Agreement to Terms</Text>
        </View>
        <Text style={styles.sectionBody}>
          By registering, joining a queue, or scanning a store QR code, you agree to these Terms and Conditions and our Privacy Policy. If you disagree, please discontinue using the service.
        </Text>
      </Card>

      {/* Section 2 */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.successSubtle }]}>
            <Ionicons name="business" size={18} color={colors.success} />
          </View>
          <Text style={styles.sectionTitle}>2. Platform & Store Relationship</Text>
        </View>
        <Text style={styles.sectionBody}>
          QueueLess provides virtual queue management software. We do not provide physical barbershop, salon, or medical services. All service delivery, pricing, and payments take place directly between you and the merchant at their counter.
        </Text>
      </Card>

      {/* Section 3 */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="time" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>3. Dynamic Wait Times</Text>
        </View>
        <Text style={styles.sectionBody}>
          Estimated wait times are computed dynamically based on service duration, quantity, and real-time counter pace. Because real-world customer needs vary, estimates cannot be guaranteed as exact appointment times.
        </Text>
      </Card>

      {/* Section 4 */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.dangerSubtle }]}>
            <Ionicons name="warning" size={18} color={colors.danger} />
          </View>
          <Text style={styles.sectionTitle}>4. Acceptable Conduct</Text>
        </View>
        <Text style={styles.sectionBody}>
          Users may not create automated fake queue entries, attempt to tamper with counter verification tokens, or abuse the system. Violations may result in immediate ticket cancellation and account suspension.
        </Text>
      </Card>

      {/* Section 5 - Contact */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="mail" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>5. Questions & Inquiries</Text>
        </View>
        <Text style={styles.sectionBody}>
          For inquiries regarding these terms, reach our support team:
        </Text>
        <TouchableOpacity style={styles.contactBtn} onPress={openEmail} activeOpacity={0.8}>
          <Ionicons name="mail-outline" size={16} color={colors.primary} />
          <Text style={styles.contactBtnText}>support@queueless.local</Text>
        </TouchableOpacity>
      </Card>
    </AppScreen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screenContent: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: spacing.xs,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
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
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    versionPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.full,
      backgroundColor: colors.primarySubtle,
    },
    versionPillText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
    },
    titleSection: {
      gap: 4,
    },
    pageTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    pageSubtitle: {
      fontSize: 12,
      color: colors.muted,
    },
    noticeBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: "rgba(217, 119, 6, 0.12)",
      borderColor: "rgba(217, 119, 6, 0.25)",
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    noticeText: {
      flex: 1,
      fontSize: 12,
      color: "#D97706",
      fontWeight: "500",
      lineHeight: 16,
    },
    sectionCard: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    sectionBody: {
      fontSize: 13,
      color: colors.mutedDark,
      lineHeight: 20,
    },
    contactBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingTop: spacing.xs,
    },
    contactBtnText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.primary,
    },
  });
