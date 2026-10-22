import React, { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/theme';

interface AppScreenProps extends PropsWithChildren {
  scroll?: boolean;
  safeTop?: boolean;
  safeBottom?: boolean;
  hasTabBar?: boolean;
  backgroundColor?: string;
  contentContainerStyle?: ViewStyle;
  refreshControl?: React.ReactElement<any>;
  keyboardOffset?: number;
  noPadding?: boolean;
}

export default function AppScreen({
  children,
  scroll = true,
  safeTop = true,
  safeBottom = true,
  hasTabBar = false,
  backgroundColor,
  contentContainerStyle,
  refreshControl,
  keyboardOffset = 0,
  noPadding = false,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const defaultTop =
    Platform.OS === 'ios'
      ? 44
      : Platform.OS === 'android'
      ? Math.max(RNStatusBar.currentHeight || 0, 36)
      : 24;
  const rawTop = insets.top > 0 ? insets.top : defaultTop;
  const paddingTop = safeTop ? rawTop + 12 : 0;

  // Bottom tab bar height = 64 + safe-area bottom inset; ensure content clears it with 36px breathing space
  const bottomPadding = hasTabBar
    ? Math.max(insets.bottom + 64 + 36, 120)
    : safeBottom
    ? Math.max(insets.bottom + 16, 24)
    : 16;

  const screenBg = backgroundColor || colors.bg;

  const content = scroll ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        !noPadding && styles.sidePadding,
        contentContainerStyle,
        { paddingTop, paddingBottom: bottomPadding },
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
        !noPadding && styles.sidePadding,
        contentContainerStyle,
        { paddingTop, paddingBottom: bottomPadding },
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: screenBg }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={screenBg}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
    width: '100%',
  },
  keyboardAvoid: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    flex: 1,
  },
  sidePadding: {
    paddingHorizontal: 16, // Design spec side padding: 16
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
