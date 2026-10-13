import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, View } from "react-native";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from "./src/theme/colors";

if (Platform.OS === "web" && typeof document !== "undefined") {
  const styleId = "queueless-web-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html, body, #root {
        height: 100% !important;
        min-height: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: #040812 !important;
        overflow-x: hidden !important;
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
    document.head.appendChild(style);
  }
}

export default function App() {
  return (
    <View style={styles.appShell}>
      <View style={styles.appContainer}>
        <AuthProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </AuthProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  appContainer: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 500 : undefined,
    minHeight: "100%",
    backgroundColor: colors.bg,
  },
});
