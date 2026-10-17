import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeColors, lightColors, darkColors } from "../theme/colors";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isLoading: boolean;
}

export const THEME_STORAGE_KEY = "ql_theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ 
  children,
  initialTheme = "light"
}: { 
  children: React.ReactNode;
  initialTheme?: ThemeMode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If initialTheme wasn't preloaded, check AsyncStorage
    async function loadStoredTheme() {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
          setThemeState(stored);
        }
      } catch (e) {
        console.warn("Failed to load stored theme preference", e);
      }
    }
    loadStoredTheme();
  }, []);

  const setTheme = useCallback(async (newMode: ThemeMode) => {
    setThemeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.warn("Failed to persist theme preference", e);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = theme === "dark" ? "light" : "dark";
    await setTheme(next);
  }, [theme, setTheme]);

  const activeColors = theme === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        colors: activeColors,
        setTheme,
        toggleTheme,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback to light theme if outside provider
    return {
      theme: "light" as ThemeMode,
      isDark: false,
      colors: lightColors,
      setTheme: async () => {},
      toggleTheme: async () => {},
      isLoading: false,
    };
  }
  return context;
}
