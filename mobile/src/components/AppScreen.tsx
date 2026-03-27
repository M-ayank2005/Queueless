import { LinearGradient } from "expo-linear-gradient";
import React, { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

type Props = PropsWithChildren<{
  scroll?: boolean;
}>;

export default function AppScreen({ children, scroll = true }: Props) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  return (
    <LinearGradient colors={["#040812", "#0A1227", "#050B18"]} style={styles.root}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 16,
  },
  glowTop: {
    position: "absolute",
    top: -70,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(59, 130, 246, 0.18)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -90,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "rgba(37, 99, 235, 0.14)",
  },
});
