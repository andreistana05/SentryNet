import { useEffect, useState, type PropsWithChildren } from "react";
import { getStoredTheme, resolveInitialTheme, setStoredTheme, type AppTheme } from "../lib/storage";
import { ThemeContext } from "./useTheme";

function applyTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme() ?? resolveInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    setStoredTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
