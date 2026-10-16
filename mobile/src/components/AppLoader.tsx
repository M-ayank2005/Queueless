import React from "react";
import { StyleSheet, View } from "react-native";
import QueueFlowLoader from "./loading/QueueFlowLoader";
import { colors } from "../theme/colors";

type Props = {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
  inline?: boolean;
};

/**
 * AppLoader Component
 * 
 * QueueLess signature loading system.
 * Powered by QueueFlowLoader vector motion engine.
 */
export default function AppLoader({
  message = "Loading...",
  submessage,
  fullScreen = false,
  inline = false,
}: Props) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <QueueFlowLoader
          variant="screen"
          size="lg"
          message={message}
          submessage={submessage}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, inline && styles.containerInline]}>
      <QueueFlowLoader
        variant={inline ? "inline" : "card"}
        size={inline ? "sm" : "md"}
        message={message}
        submessage={submessage}
      />
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
  },
  container: {
    flex: 1,
    minHeight: 260,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  containerInline: {
    flex: 0,
    minHeight: 0,
    paddingVertical: 12,
  },
});
