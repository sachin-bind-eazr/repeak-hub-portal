/**
 * Session token storage for the Hub Portal.
 *
 * This app owns its own session — separate localStorage keys from
 * every other Repeak web app (athlete app, partner portal). The Hub
 * only ever holds a Role.USER session for itself; the actual
 * product-scoped session (Organizer/Brand/Club) is established on
 * the destination portal via the activation-token exchange, not here.
 */
const TOKEN_KEY = "repeak.hub.accessToken";
const REFRESH_TOKEN_KEY = "repeak.hub.refreshToken";
const USER_KEY = "repeak.hub.user";

export interface HubUser {
  id: string;
  phoneNumber?: string;
  email?: string;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): HubUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as HubUser) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getStoredToken() != null;
}

export function setSession(
  accessToken: string,
  refreshToken?: string | null,
  user?: HubUser,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
