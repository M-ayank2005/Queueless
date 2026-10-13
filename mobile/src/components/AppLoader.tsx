import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  message?: string;
  submessage?: string;
  fullScreen?: boolean;
  inline?: boolean;
};

export default function AppLoader({
  message = "Loading...",
  submessage,
  fullScreen = false,
  inline = false,
}: Props) {
  const content = (
    <View style={[styles.card, inline && styles.cardInline]}>
      <View style={styles.spinnerWrap}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.message}>{message}</Text>
        {submessage ? <Text style={styles.submessage}>{submessage}</Text> : null}
      </View>
    </View>
  );

  if (fullScreen) {
    return <View style={styles.fullScreen}>{content}</View>;
  }

  return <View style={[styles.container, inline && styles.containerInline]}>{content}</View>;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
    minHeight: 280,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 32,
  },
  containerInline: {
    flex: 0,
    minHeight: 0,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    maxWidth: 340,
    width: "100%",
  },
  cardInline: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.cardSoft,
  },
  spinnerWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    alignItems: "center",
    justifyContent: "center",
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
    letterSpacing: -0.2,
  },
  submessage: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
});
