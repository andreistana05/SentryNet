import { useTheme } from "../theme/ThemeProvider";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className={`theme-toggle-icon ${isDark ? "sun" : "moon"}`} aria-hidden="true" />
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}

export default ThemeToggle;
