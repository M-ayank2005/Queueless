import React, { useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { radii, spacing } from "../../theme/theme";

export default function PrivacyPolicyScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const openEmail = () => {
    Linking.openURL("mailto:support@queueless.local?subject=Privacy%20Inquiry");
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
        <Text style={styles.pageTitle}>Privacy Policy</Text>
        <Text style={styles.pageSubtitle}>
          Effective: October 18, 2026 • QueueLess Platform
        </Text>
      </View>

      {/* Owner Review Notice */}
      <View style={styles.noticeBox}>
        <Ionicons name="information-circle" size={18} color="#D97706" />
        <Text style={styles.noticeText}>
          This policy reflects actual QueueLess data processing. Final commercial operations should undergo formal legal review.
        </Text>
      </View>

      {/* Section 1 */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="server" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>1. Data We Collect</Text>
        </View>
        <Text style={styles.sectionBody}>
          • Account Info: Name, email, phone number, and a salted bcrypt password hash. We never store plain passwords.{"\n"}
          • Queue Records: Selected services, requested quantities, ticket entry timestamps, estimated wait times, and encrypted verification tokens.{"\n"}
          • Business Info: Shop name, location address, operating hours, and service catalog.
        </Text>
      </Card>

      {/* Section 2 */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.successSubtle }]}>
            <Ionicons name="checkmark-done" size={18} color={colors.success} />
          </View>
          <Text style={styles.sectionTitle}>2. How We Use Information</Text>
        </View>
        <Text style={styles.sectionBody}>
          • Managing your position in line and calculating live dynamic wait estimates.{"\n"}
          • Verifying your spot at the counter using cryptographic QR codes without leaking personal data to strangers in line.{"\n"}
          • Allowing merchants to call or SMS you when your turn approaches.{"\n"}
          • Providing automated assistance through our Gemini AI support assistant.
        </Text>
      </Card>

      {/* Section 3 - Gemini AI */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="hardware-chip" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>3. AI Support & Google Gemini</Text>
        </View>
        <Text style={styles.sectionBody}>
          QueueLess includes an automated AI Support assistant powered by Google&apos;s Gemini API. When you ask a question about your queue spot, the assistant receives a sanitized snapshot of your own active tickets.{"\n\n"}
          Data Minimization: Passwords, session tokens, verification secrets, and other customers&apos; tickets are NEVER transmitted to Gemini. Inquiries are short-lived and used strictly to answer your support question.
        </Text>
      </Card>

      {/* Section 4 */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>4. Security & Storage</Text>
        </View>
        <Text style={styles.sectionBody}>
          All communication is encrypted via TLS. Passwords use bcrypt hashing and counter verification tokens use SHA-256. We do not sell or monetize personal information.
        </Text>
      </Card>

      {/* Section 5 - Contact */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
            <Ionicons name="mail" size={18} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>5. Contact & Privacy Requests</Text>
        </View>
        <Text style={styles.sectionBody}>
          You may update your profile or request data erasure at any time by contacting our support desk:
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
