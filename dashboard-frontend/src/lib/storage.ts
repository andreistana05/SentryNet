const TOKEN_KEY = "token";
const ROLE_KEY = "role";

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAuth(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

export function getStoredRole(): string {
  return window.localStorage.getItem(ROLE_KEY) || "Operator";
}

export function setStoredRole(role: string): void {
  window.localStorage.setItem(ROLE_KEY, role);
}
