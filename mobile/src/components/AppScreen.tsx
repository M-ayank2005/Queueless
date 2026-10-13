import React, { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { colors } from "../theme/colors";

type Props = PropsWithChildren<{
  scroll?: boolean;
}>;

export default function AppScreen({ children, scroll = true }: Props) {
  const content = scroll ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.innerContainer}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.innerContainer]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.bg,
  },
  safeArea: {
    flex: 1,
    width: "100%",
  },
  keyboardAvoid: {
    flex: 1,
    width: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  innerContainer: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    gap: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 96, // Ensures content is never obscured by bottom tab bar
  },
});
