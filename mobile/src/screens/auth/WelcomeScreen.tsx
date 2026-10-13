import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { AuthStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <AppScreen>
      <View style={styles.container}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Ionicons name="time" size={32} color={colors.primary} />
          </View>
          <View style={styles.taglineWrap}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.pillText}>SMART QUEUE SYSTEM</Text>
            </View>
            <Text style={styles.title}>QueueLess</Text>
            <Text style={styles.tagline}>
              Skip physical lines. Track your spot live. Reclaim your valuable time.
            </Text>
          </View>
        </View>

        {/* Feature Highlights Card */}
        <Card style={styles.featureCard}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Instant QR Check-In</Text>
              <Text style={styles.featureDesc}>
                Scan store codes on-site or explore and book nearby shops remotely.
              </Text>
            </View>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureItem}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="hourglass-outline" size={20} color="#F59E0B" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Real-Time Wait Estimates</Text>
              <Text style={styles.featureDesc}>
                Know how many people are ahead and receive dynamic time updates.
              </Text>
            </View>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureItem}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="storefront-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>For Customers & Merchants</Text>
              <Text style={styles.featureDesc}>
                Shoppers skip waiting; businesses streamline counter traffic smoothly.
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <AppButton
            title="Create an Account"
            onPress={() => navigation.navigate("Register")}
            icon="person-add-outline"
          />
          <AppButton
            title="I Already Have an Account"
            variant="secondary"
            onPress={() => navigation.navigate("Login")}
            icon="log-in-outline"
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    gap: 22,
  },
  brandHeader: {
    alignItems: "center",
    gap: 14,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.cardSoft,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  taglineWrap: {
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.28)",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  pillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  tagline: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 340,
  },
  featureCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.cardSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  featureTextCol: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  featureDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  featureDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.6,
    marginVertical: 2,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 6,
  },
});
