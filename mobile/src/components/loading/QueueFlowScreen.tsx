import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QueueFlowLoader from "./QueueFlowLoader";
import { useTheme } from "../../context/ThemeContext";

type Props = {
  message?: string;
  submessage?: string;
};

/**
 * QueueFlowScreen
 * 
 * Full-screen loading presentation respecting device safe-area insets,
 * ideal for authentication hydration and initial cold starts.
 */
export default function QueueFlowScreen({
  message = "Starting QueueLess",
  submessage = "Connecting to counter...",
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <QueueFlowLoader
        variant="screen"
        size="lg"
        message={message}
        submessage={submessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
});

