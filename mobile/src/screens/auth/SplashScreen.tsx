import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { LogoQ } from "../../components/LogoQ";
import { typography } from "../../theme/theme";

export const ONBOARDING_SEEN_KEY = "ql_onboarding_seen";

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    // Subtle fade + scale-in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Authentic QueueLess Brand Logo from frontend */}
        <View style={styles.logoWrap}>
          <LogoQ size={110} variant="brand" />
        </View>

        {/* Wordmark "QueueLess" aligned with frontend brand */}
        <Text style={styles.wordmarkQueue}>
          Queue<Text style={styles.wordmarkLess}>Less</Text>
        </Text>

        <Text style={styles.tagline}>
          SMART DIGITAL QUEUE FLOW
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#284D83",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    width: "100%",
  },
  logoWrap: {
    marginTop: 310,
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmarkQueue: {
    marginTop: 20,
    color: "#FFFFFF",
    fontSize: 42,
    fontFamily: typography.families.interSemiBold,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.8,
  },
  wordmarkLess: {
    color: "#38BDF8", // Radiant Cyan/Sky from frontend brand
    fontWeight: "800",
  },
  tagline: {
    marginTop: 8,
    color: "#93C5FD",
    fontSize: 11,
    fontFamily: typography.families.interMedium,
    fontWeight: "600",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
});
