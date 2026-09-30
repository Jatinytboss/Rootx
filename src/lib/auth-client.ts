/** Browser-side session storage for the JWT issued by the server. */
const TOKEN_KEY = "rootx_uptimer_token";
const USER_KEY = "rootx_uptimer_user";

export type SessionUser = { id: string; email: string; name: string };

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function isSignedIn(): boolean {
  const token = getToken();
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const padded = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4))) as {
      exp?: number;
    };
    return Boolean(claims.exp && claims.exp * 1000 > Date.now());
  } catch {
    return false;
  }
}
