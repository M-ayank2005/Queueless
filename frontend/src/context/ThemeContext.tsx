"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = "ql_theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with light by default as required
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Synchronize on initial mount with pre-paint DOM class or storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        setThemeState(stored);
        applyThemeToDocument(stored);
      } else {
        // Fallback to checking document class applied by inline script
        const isDocDark = document.documentElement.classList.contains("dark");
        const resolved: Theme = isDocDark ? "dark" : "light";
        setThemeState(resolved);
        applyThemeToDocument(resolved);
      }
    } catch {
      // Storage unavailable or disabled
      applyThemeToDocument("light");
    } finally {
      setMounted(true);
    }
  }, []);

  const applyThemeToDocument = useCallback((targetTheme: Theme) => {
    const root = document.documentElement;
    if (targetTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      applyThemeToDocument(newTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        // Persist non-sensitive cookie for cross-request consistency
        document.cookie = `${THEME_STORAGE_KEY}=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;
      } catch (err) {
        console.warn("Could not persist theme preference:", err);
      }
    },
    [applyThemeToDocument]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
