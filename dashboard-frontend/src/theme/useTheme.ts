import { createContext, useContext } from "react";
import type { AppTheme } from "../lib/storage";

interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
