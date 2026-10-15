import React, { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { spacing } from "../theme/theme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  safeTop?: boolean;
  safeBottom?: boolean;
  hasTabBar?: boolean;
  contentContainerStyle?: ViewStyle;
  refreshControl?: React.ReactElement<any>;
  keyboardOffset?: number;
}>;

/**
 * AppScreen
 * Master screen wrapper providing:
 * - Proper Android edge-to-edge status bar & notch inset handling
 * - Android gesture bar & iOS home indicator clearance
 * - Consistent maximum width for tablet/web responsive layouts
 * - Keyboard avoidance
 */
export default function AppScreen({
  children,
  scroll = true,
  safeTop = true,
  safeBottom = true,
  hasTabBar = false,
  contentContainerStyle,
  refreshControl,
  keyboardOffset = 0,
}: Props) {
  const insets = useSafeAreaInsets();

  // On Android edge-to-edge, insets.top correctly accounts for status bar/camera cutouts.
  // Fallback to RNStatusBar.currentHeight ensures status bar is never overlapped.
  const rawTop = insets.top > 0 ? insets.top : Platform.OS === "android" ? (RNStatusBar.currentHeight || 24) : 0;
  const paddingTop = safeTop ? rawTop + spacing.sm : spacing.md;

  // Bottom clearance: screens with bottom tab bar clear the tab bar (~56px + insets.bottom).
  // Single screens (auth, detail) clear only the safe bottom inset/gesture bar.
  const bottomPadding = hasTabBar
    ? Math.max(insets.bottom + 76, 92)
    : safeBottom
    ? Math.max(insets.bottom + spacing.md, spacing.xl)
    : spacing.md;

  const content = scroll ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop, paddingBottom: bottomPadding },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <View style={styles.innerContainer}>{children}</View>
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        styles.innerContainer,
        { paddingTop, paddingBottom: bottomPadding },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        {content}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.bg,
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
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
});

