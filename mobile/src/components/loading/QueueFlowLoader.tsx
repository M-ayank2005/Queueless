import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { ThemeColors } from "../../theme/colors";
import { radii, spacing, typography } from "../../theme/theme";

export type QueueFlowLoaderProps = {
  /**
   * Primary status message
   */
  message?: string;
  /**
   * Optional secondary subtitle message
   */
  submessage?: string;
  /**
   * Size scale
   */
  size?: "sm" | "md" | "lg";
  /**
   * Presentation variant
   */
  variant?: "screen" | "card" | "inline" | "overlay";
  /**
   * Shorthand for full screen variant
   */
  fullScreen?: boolean;
  /**
   * Show message text
   */
  showMessage?: boolean;
  /**
   * Additional style
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * QueueFlowLoader Component (React Native)
 * 
 * Signature QueueLess queue-flow loading animation.
 * Features 60 FPS native-thread motion showing digital queue tickets
 * advancing along a luminous pathway to a service counter.
 */
export default function QueueFlowLoader({
  message = "Loading...",
  submessage,
  size = "md",
  variant = "card",
  fullScreen = false,
  showMessage = true,
  style,
}: QueueFlowLoaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reduceMotion, setReduceMotion] = useState(false);
  const animProgress = useRef(new Animated.Value(0)).current;

  // Check system accessibility preference for reduced motion
  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      isMounted = false;
      listener?.remove?.();
    };
  }, []);

  // Native thread 60 FPS animation loop
  useEffect(() => {
    if (reduceMotion) return;

    const loop = Animated.loop(
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 2200,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [reduceMotion]);

  // Size dimensions
  const isSm = size === "sm";
  const isLg = size === "lg";

  const trackWidth = isSm ? 180 : isLg ? 260 : 220;
  const trackHeight = isSm ? 48 : isLg ? 68 : 56;
  const ticketW = isSm ? 26 : isLg ? 36 : 30;
  const ticketH = isSm ? 18 : isLg ? 24 : 20;

  // Ticket 1 (Lead ticket): X ~75 -> 145 (reaching counter desk)
  const ticket1X = animProgress.interpolate({
    inputRange: [0, 0.7, 0.9, 1],
    outputRange: [0, 50, 68, 70],
  });
  const ticket1Opacity = animProgress.interpolate({
    inputRange: [0, 0.75, 0.9, 1],
    outputRange: [1, 1, 0.4, 0],
  });
  const ticket1Scale = animProgress.interpolate({
    inputRange: [0, 0.7, 0.88, 1],
    outputRange: [1, 1.05, 1.1, 0.95],
  });

  // Ticket 2 (Mid ticket): X ~30 -> 75
  const ticket2X = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 45],
  });
  const ticket2Opacity = animProgress.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.8, 0.95, 1],
  });

  // Ticket 3 (Trailing ticket): X ~-15 -> 30, fading in
  const ticket3X = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });
  const ticket3Opacity = animProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.6, 0.85],
  });

  // Progress dot traveling on track
  const progressPulseX = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackWidth - 60],
  });
  const progressPulseOpacity = animProgress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.9, 0.9, 0],
  });

  // Counter beacon arrival pulse
  const counterBeaconScale = animProgress.interpolate({
    inputRange: [0, 0.65, 0.85, 1],
    outputRange: [1, 1, 1.4, 1],
  });
  const counterArrivalOpacity = animProgress.interpolate({
    inputRange: [0, 0.68, 0.85, 1],
    outputRange: [0, 0, 1, 0],
  });

  const content = (
    <View style={[styles.canvasWrap, { width: trackWidth, height: trackHeight }]}>
      {/* 1. Underlying Queue Pathway */}
      <View style={[styles.trackLine, { width: trackWidth - 44 }]} />

      {/* Traveling Blue Signal Dot */}
      {!reduceMotion && (
        <Animated.View
          style={[
            styles.trackSignalDot,
            {
              transform: [{ translateX: progressPulseX }],
              opacity: progressPulseOpacity,
            },
          ]}
        />
      )}

      {/* 2. Advancing Tickets Line */}
      <View style={styles.ticketsRow}>
        {/* Ticket 3 (Trailing) */}
        {!reduceMotion ? (
          <Animated.View
            style={[
              styles.ticketCard,
              styles.ticketTrailing,
              {
                width: ticketW,
                height: ticketH,
                left: 10,
                transform: [{ translateX: ticket3X }],
                opacity: ticket3Opacity,
              },
            ]}
          >
            <View style={styles.ticketNotchL} />
            <View style={styles.ticketLine} />
            <View style={styles.ticketNotchR} />
          </Animated.View>
        ) : null}

        {/* Ticket 2 (Mid-Queue) */}
        {!reduceMotion ? (
          <Animated.View
            style={[
              styles.ticketCard,
              styles.ticketMid,
              {
                width: ticketW,
                height: ticketH,
                left: 48,
                transform: [{ translateX: ticket2X }],
                opacity: ticket2Opacity,
              },
            ]}
          >
            <View style={styles.ticketNotchL} />
            <View style={[styles.ticketLine, { backgroundColor: colors.muted }]} />
            <View style={styles.ticketNotchR} />
          </Animated.View>
        ) : (
          <View
            style={[
              styles.ticketCard,
              styles.ticketMid,
              { width: ticketW, height: ticketH, left: 45 },
            ]}
          >
            <View style={styles.ticketNotchL} />
            <View style={styles.ticketLine} />
            <View style={styles.ticketNotchR} />
          </View>
        )}

        {/* Ticket 1 (Lead Ticket) */}
        {!reduceMotion ? (
          <Animated.View
            style={[
              styles.ticketCard,
              styles.ticketLead,
              {
                width: ticketW,
                height: ticketH,
                left: 92,
                transform: [{ translateX: ticket1X }, { scale: ticket1Scale }],
                opacity: ticket1Opacity,
              },
            ]}
          >
            <View style={styles.ticketNotchL} />
            <View style={[styles.ticketLine, { backgroundColor: "#FFF" }]} />
            <View style={styles.ticketNotchR} />
          </Animated.View>
        ) : (
          <View
            style={[
              styles.ticketCard,
              styles.ticketLead,
              { width: ticketW, height: ticketH, left: 105 },
            ]}
          >
            <View style={styles.ticketNotchL} />
            <View style={[styles.ticketLine, { backgroundColor: "#FFF" }]} />
            <View style={styles.ticketNotchR} />
          </View>
        )}
      </View>

      {/* 3. Service Counter Desk on Right */}
      <View style={[styles.counterBox, { right: 0 }]}>
        {/* Counter Canopy / Roof */}
        <View style={styles.counterRoof} />
        {/* Calling Beacon Window */}
        <Animated.View
          style={[
            styles.counterBeacon,
            !reduceMotion && { transform: [{ scale: counterBeaconScale }] },
          ]}
        >
          <Ionicons name="storefront" size={isSm ? 14 : 17} color={colors.primary} />
        </Animated.View>
        {/* Ledge */}
        <View style={styles.counterLedge} />

        {/* Subtle Checkmark Flash when ticket completes */}
        {!reduceMotion && (
          <Animated.View
            style={[
              styles.arrivalBadge,
              { opacity: counterArrivalOpacity },
            ]}
          >
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          </Animated.View>
        )}
      </View>
    </View>
  );

  const isFull = fullScreen || variant === "screen";

  return (
    <View
      style={[
        styles.baseContainer,
        isFull && styles.screenContainer,
        variant === "card" && styles.cardContainer,
        variant === "inline" && styles.inlineContainer,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      {/* Header if full screen */}
      {isFull && (
        <View style={styles.fullBrandHeader}>
          <View style={styles.brandBadge}>
            <Ionicons name="storefront" size={20} color={colors.primary} />
          </View>
          <Text style={styles.brandTitle}>
            Queue<Text style={{ color: colors.primary }}>Less</Text>
          </Text>
        </View>
      )}

      {/* Visual Canvas */}
      {content}

      {/* Message Block */}
      {showMessage && (
        <View style={styles.textContainer}>
          <Text style={[styles.messageText, isSm && styles.msgSm, isLg && styles.msgLg]}>
            {message}
          </Text>
          {submessage ? (
            <Text style={styles.submessageText}>{submessage}</Text>
          ) : (
            <Text style={styles.brandTagline}>Live Counter Flow</Text>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  baseContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  screenContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  cardContainer: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
  },
  inlineContainer: {
    paddingVertical: spacing.md,
  },
  fullBrandHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  brandBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primaryBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.3,
  },
  canvasWrap: {
    position: "relative",
    justifyContent: "center",
  },
  trackLine: {
    position: "absolute",
    left: 4,
    top: "50%",
    height: 2,
    backgroundColor: colors.borderLight,
    borderStyle: "dashed",
  },
  trackSignalDot: {
    position: "absolute",
    left: 8,
    top: "50%",
    marginTop: -2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  ticketsRow: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 48,
    justifyContent: "center",
  },
  ticketCard: {
    position: "absolute",
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  ticketTrailing: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
  },
  ticketMid: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderLight,
  },
  ticketLead: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryHover,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  ticketNotchL: {
    position: "absolute",
    left: -3,
    top: "50%",
    marginTop: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bg,
  },
  ticketNotchR: {
    position: "absolute",
    right: -3,
    top: "50%",
    marginTop: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bg,
  },
  ticketLine: {
    width: "48%",
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.mutedDark,
  },
  counterBox: {
    position: "absolute",
    width: 38,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.cardElevated,
    borderColor: colors.border,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    top: "50%",
    marginTop: -22,
  },
  counterRoof: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: colors.border,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  counterBeacon: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  counterLedge: {
    position: "absolute",
    bottom: 0,
    left: -2,
    right: -2,
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
  },
  arrivalBadge: {
    position: "absolute",
    top: -8,
    right: -6,
  },
  textContainer: {
    alignItems: "center",
    marginTop: spacing.md,
    gap: 4,
    paddingHorizontal: spacing.md,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  msgSm: {
    fontSize: 12,
  },
  msgLg: {
    fontSize: 16,
  },
  submessageText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 16,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.mutedDark,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
