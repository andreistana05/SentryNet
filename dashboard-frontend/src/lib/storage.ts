const TOKEN_KEY = "token";
const ROLE_KEY = "role";
const USERNAME_KEY = "username";
const THEME_KEY = "theme";
const EMAIL_KEY = "email";;

export type AppTheme = "dark" | "light";

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAuth(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(USERNAME_KEY);
  window.localStorage.removeItem(EMAIL_KEY);
}

export function getStoredRole(): string {
  return window.localStorage.getItem(ROLE_KEY) || "Operator";
}

export function setStoredRole(role: string): void {
  window.localStorage.setItem(ROLE_KEY, role);
}

export function getStoredUsername(): string {
  return window.localStorage.getItem(USERNAME_KEY) || "Operator";
}

export function setStoredUsername(username: string): void {
  window.localStorage.setItem(USERNAME_KEY, username);
}

export function getStoredTheme(): AppTheme | null {
  const theme = window.localStorage.getItem(THEME_KEY);
  return theme === "light" || theme === "dark" ? theme : null;
}

export function setStoredTheme(theme: AppTheme): void {
  window.localStorage.setItem(THEME_KEY, theme);
}

export function resolveInitialTheme(): AppTheme {
  const storedTheme = getStoredTheme();

  if (storedTheme) {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getStoredEmail(): string {
  return window.localStorage.getItem(EMAIL_KEY) || "";
}

export function setStoredEmail(email: string): void {
  window.localStorage.setItem(EMAIL_KEY, email);
}

