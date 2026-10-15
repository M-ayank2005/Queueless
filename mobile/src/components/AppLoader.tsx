import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { radii, spacing, typography } from "../theme/theme";

type Props = {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
  inline?: boolean;
};

/**
 * AppLoader Component
 * Branded QueueLess loader with pulsing clock icon and smooth typography.
 */
export default function AppLoader({
  message = "Loading...",
  submessage,
  fullScreen = false,
  inline = false,
}: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const content = (
    <View style={[styles.card, inline && styles.cardInline]}>
      <Animated.View style={[styles.logoBadge, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="time" size={30} color={colors.primary} />
      </Animated.View>

      <ActivityIndicator color={colors.primary} size="small" style={styles.spinner} />

      <View style={styles.textWrap}>
        <Text style={styles.message}>{message}</Text>
        {submessage ? <Text style={styles.submessage}>{submessage}</Text> : null}
      </View>
    </View>
  );

  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <View style={styles.brandTitleWrap}>
          <Text style={styles.brandTitle}>QueueLess</Text>
          <Text style={styles.brandSubtitle}>Skip lines. Save time.</Text>
        </View>
        {content}
      </View>
    );
  }

  return (
    <View style={[styles.container, inline && styles.containerInline]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl,
  },
  brandTitleWrap: {
    alignItems: "center",
    gap: 4,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  container: {
    flex: 1,
    minHeight: 280,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  containerInline: {
    flex: 0,
    minHeight: 0,
    paddingVertical: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingVertical: 28,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    maxWidth: 320,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  cardInline: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.cardSoft,
    borderRadius: radii.lg,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    marginTop: -2,
  },
  textWrap: {
    alignItems: "center",
    gap: 4,
  },
  message: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  submessage: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
