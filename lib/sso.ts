import { setSession, type HubUser } from "./auth";

export const HUB_SSO_FRAGMENT_KEY = "repeak_sso";

type SsoPayload = {
  token?: string;
  user?: string;
  refreshToken?: string | null;
};

/**
 * Persist a portal-to-Hub handoff synchronously during the first render.
 * This runs before the root route decides whether to redirect to /login.
 */
export function persistPortalSsoFromHash(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  if (!hash) return false;

  const params = new URLSearchParams(hash.slice(1));
  const encoded = params.get(HUB_SSO_FRAGMENT_KEY);
  if (!encoded) return false;

  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json) as SsoPayload;
    if (!payload.token) return false;

    let user: HubUser | undefined;
    if (payload.user) {
      user = JSON.parse(payload.user) as HubUser;
    }
    setSession(payload.token, payload.refreshToken, user);
    return true;
  } catch {
    return false;
  }
}

export function stripPortalSsoFromUrl(): void {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  if (!hash) return;
  const params = new URLSearchParams(hash.slice(1));
  if (!params.has(HUB_SSO_FRAGMENT_KEY)) return;
  params.delete(HUB_SSO_FRAGMENT_KEY);
  const remaining = params.toString();
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${remaining ? `#${remaining}` : ""}`,
  );
}
