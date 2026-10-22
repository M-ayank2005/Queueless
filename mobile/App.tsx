import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  Poppins_400Regular,
  Poppins_500Medium,
} from "@expo-google-fonts/poppins";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme, THEME_STORAGE_KEY, ThemeMode } from "./src/context/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

// Prevent splash screen from hiding automatically until theme is resolved
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { colors, isDark } = useTheme();

  // Inject or update web styles for clean desktop/web preview
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const styleId = "queueless-web-style";
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `
        html, body, #root {
          height: 100% !important;
          min-height: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background-color: ${colors.bg} !important;
          color: ${colors.text} !important;
          overflow-x: hidden !important;
          transition: background-color 0.15s ease, color 0.15s ease;
        }
        #root {
          display: flex !important;
          flex-direction: column !important;
        }
        input, textarea, button, select {
          font-family: inherit;
          outline: none !important;
        }
      `;
    }
  }, [colors.bg, colors.text]);

  return (
    <View style={[styles.appShell, { backgroundColor: colors.bg }]}>
      <View style={[styles.appContainer, { backgroundColor: colors.bg }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ErrorBoundary>
          <AppNavigator />
        </ErrorBoundary>
      </View>
    </View>
  );
}

export default function App() {
  const [initialTheme, setInitialTheme] = useState<ThemeMode>("light");
  const [appIsReady, setAppIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Poppins_400Regular,
    Poppins_500Medium,
  });

  useEffect(() => {
    async function prepare() {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme === "dark" || storedTheme === "light") {
          setInitialTheme(storedTheme);
        } else {
          setInitialTheme("light");
        }
      } catch (e) {
        console.warn("Error reading stored theme at startup", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady && fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider initialTheme={initialTheme}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    alignItems: "center",
  },
  appContainer: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 500 : undefined,
    minHeight: "100%",
  },
});
