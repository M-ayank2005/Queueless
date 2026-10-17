import React, { useEffect, useRef, useState } from "react";
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

type Props = {
  text?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * QueueFlowInline Component (React Native)
 * 
 * Micro queue progression for button interiors and inline status rows.
 */
export default function QueueFlowInline({
  text,
  color = "#FFFFFF",
  style,
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const anim = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [reduceMotion]);

  const dot1X = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14],
  });
  const dot1Opacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 1, 0.2],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.track}>
        {/* Destination dot */}
        <View style={[styles.destDot, { backgroundColor: color }]} />

        {/* Advancing mini ticket dot */}
        {!reduceMotion ? (
          <Animated.View
            style={[
              styles.movingDot,
              {
                backgroundColor: color,
                transform: [{ translateX: dot1X }],
                opacity: dot1Opacity,
              },
            ]}
          />
        ) : (
          <View style={[styles.staticDot, { backgroundColor: color }]} />
        )}
      </View>

      {text ? <Text style={[styles.label, { color }]}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  track: {
    width: 22,
    height: 12,
    position: "relative",
    justifyContent: "center",
  },
  destDot: {
    position: "absolute",
    right: 0,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  movingDot: {
    position: "absolute",
    left: 0,
    width: 6,
    height: 4,
    borderRadius: 1,
  },
  staticDot: {
    position: "absolute",
    left: 2,
    width: 6,
    height: 4,
    borderRadius: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});
