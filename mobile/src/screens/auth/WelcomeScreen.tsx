import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import AppButton from "../../components/AppButton";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import StatusBadge from "../../components/StatusBadge";
import { AuthStackParamList } from "../../navigation/types";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { radii, shadows, spacing } from "../../theme/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Staggered entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleLogo = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleLogo, {
        toValue: 1,
        tension: 45,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <AppScreen contentContainerStyle={styles.screenContent}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Brand Header with concentric glow badge */}
        <View style={styles.brandHeader}>
          <Animated.View style={[styles.logoGlowRing, { transform: [{ scale: scaleLogo }] }]}>
            <View style={styles.logoBadge}>
              <Ionicons name="time" size={36} color={colors.primary} />
            </View>
          </Animated.View>

          <View style={styles.titleGroup}>
            <View style={styles.badgeWrapper}>
              <StatusBadge
                status="open"
                label="SMART VIRTUAL QUEUES"
                pulse
                size="sm"
                style={styles.heroBadge}
              />
            </View>
            <Text style={styles.title}>QueueLess</Text>
            <Text style={styles.subtitle}>
              Skip crowded waiting lines. Track your spot live from anywhere. Reclaim your valuable time.
            </Text>
          </View>
        </View>

        {/* Feature Highlights Card */}
        <Card variant="elevated" style={styles.featureCard}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Instant QR Check-In</Text>
              <Text style={styles.featureDesc}>
                Scan store codes at counters or book nearby spots in advance remotely.
              </Text>
            </View>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: colors.warningSubtle }]}>
              <Ionicons name="hourglass-outline" size={20} color={colors.warning} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Dynamic Wait Times</Text>
              <Text style={styles.featureDesc}>
                See exact people ahead and receive real-time updates as the line moves.
              </Text>
            </View>
          </View>

          <View style={styles.featureDivider} />

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: colors.successSubtle }]}>
              <Ionicons name="storefront-outline" size={20} color={colors.success} />
            </View>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Customers & Merchants</Text>
              <Text style={styles.featureDesc}>
                Shoppers skip waiting; store owners run an organized digital queue.
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <AppButton
            title="Create an Account"
            size="lg"
            onPress={() => navigation.navigate("Register")}
            icon="person-add-outline"
          />
          <AppButton
            title="I Already Have an Account"
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate("Login")}
            icon="log-in-outline"
          />
        </View>
      </Animated.View>
    </AppScreen>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screenContent: {
      flexGrow: 1,
    },
    container: {
      flex: 1,
      justifyContent: "space-between",
      gap: spacing.md,
    },
    brandHeader: {
      alignItems: "center",
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    logoGlowRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.cardGlow,
      borderColor: colors.primaryBorder,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.glow,
    },
    logoBadge: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.cardElevated,
      borderColor: colors.borderLight,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    titleGroup: {
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    badgeWrapper: {
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      marginBottom: 6,
    },
    heroBadge: {
      alignSelf: "center",
    },
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 21,
      maxWidth: 340,
      marginTop: 4,
    },
    featureCard: {
      padding: spacing.lg,
      gap: spacing.md,
      marginVertical: spacing.md,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
    },
    featureIconWrap: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      flexShrink: 0,
    },
    featureTextCol: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    featureTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.1,
    },
    featureDesc: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
      flexWrap: "wrap",
    },
    featureDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    actionsContainer: {
      gap: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
  });
