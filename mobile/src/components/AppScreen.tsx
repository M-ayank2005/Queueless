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
import { useTheme } from "../context/ThemeContext";
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
 * - Dynamic theme background color
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
  const { colors } = useTheme();

  const defaultTop =
    Platform.OS === "ios"
      ? 44
      : Platform.OS === "android"
      ? (RNStatusBar.currentHeight || 28)
      : 24;
  const rawTop = insets.top > 0 ? insets.top : defaultTop;
  const paddingTop = safeTop ? rawTop + spacing.sm : spacing.md;

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
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
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
