/**
 * Hub Portal API client. Talks to the shared NestJS v2 backend
 * directly (cross-origin) via NEXT_PUBLIC_API_BASE_URL — same live
 * pattern web-athlete-app uses (backend CORS is fully open, auth is
 * enforced by bearer token, not origin). Backend wraps every response
 * in `{ status, message, data }` (ResponseInterceptor); `api()`
 * unwraps `data`.
 */
import { clearSession, getStoredRefreshToken, getStoredToken, setSession } from "./auth";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Defaults to the live Cloud Run backend rather than localhost:8000 —
// this app's dev workflow is against the manually-deployed backend,
// not a local `npm run start:dev`. Docker builds still override this
// via the NEXT_PUBLIC_API_BASE_URL build arg (see docker/compose.yml).
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://repeak-backend-746271877146.asia-south1.run.app";

type Envelope<T> = { status?: number; message?: string; code?: string; data?: T };

// Guard so a burst of parallel dead-token responses triggers exactly one
// clear-session + redirect, not a storm of navigations.
let redirectingToLogin = false;

// Single-flight refresh — concurrent calls share one POST /v2/auth/refresh-tokens.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** POST /v2/auth/refresh-tokens takes the REFRESH token as the bearer
 *  (RT guard, not the access-token guard) and rotates it. Raw fetch, not
 *  api() — recursing through the dead-token handling below would loop. */
async function performRefresh(): Promise<string | null> {
  const rt = getStoredRefreshToken();
  if (!rt) return null;
  try {
    const res = await fetch(`${API_BASE}/v2/auth/refresh-tokens`, {
      method: "POST",
      headers: { Authorization: `Bearer ${rt}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as {
      data?: { accessToken?: string; refreshToken?: string };
    } | null;
    const newAccessToken = json?.data?.accessToken;
    if (!newAccessToken) return null;
    setSession(newAccessToken, json?.data?.refreshToken ?? rt);
    return newAccessToken;
  } catch {
    return null;
  }
}

/**
 * A revoked/expired/invalid token can surface as a plain 401 with the
 * generic Passport message "Unauthorized" (no/garbage/expired bearer
 * token — confirmed by curling GET /v2/users/me with no Authorization
 * header), or — since ATStrategy.validate()
 * (backend-api/src/v2/auth/strategies/at.strategy.ts) rejects it before
 * the request ever reaches a controller/RolesGuard — as a 403 with
 * message "Token revoked" (Redis jti/user revocation marker) or "Access
 * Denied!" (stale `iat` vs the user's `lastTokenIat`, e.g. right after
 * this same account logs out anywhere).
 *
 * A 401 with a SPECIFIC message — this backend's RolesGuard throws plain
 * 401 (not 403) for a role mismatch, e.g. "User does not have the
 * required role" when a Role.USER hub session calls an
 * ORGANIZER/ADMIN-only route — is a real per-request authorization
 * rejection, not proof the session itself is dead. Treating every 401 as
 * dead (confirmed live: it force-logged-out a session mid-page just from
 * a single unauthorized entity-details fetch) was the actual bug here.
 */
function isTokenDead(status: number, message: string | undefined): boolean {
  if (/token (revoked|expired|invalid)|invalid token|jwt expired|access denied/i.test(message || "")) {
    return true;
  }
  if (status !== 401) return false;
  return !message || /^unauthorized$/i.test(message);
}

async function doFetch<T>(
  path: string,
  init: RequestInit,
  token: string | null,
): Promise<{ res: Response; json: Envelope<T> }> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Network error — check your connection", 0);
  }

  let json: Envelope<T> = {};
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    // non-JSON response — fall through to status handling
  }
  return { res, json };
}

export async function api<T>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, ...init } = opts;
  const originalToken = auth ? getStoredToken() : null;

  let { res, json } = await doFetch<T>(path, init, originalToken);
  let status = json.status ?? res.status;

  if (auth && originalToken && isTokenDead(status, json.message)) {
    // The access token dies weekly — don't force a re-login when a
    // still-valid refresh token is sitting right there.
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      ({ res, json } = await doFetch<T>(path, init, newAccessToken));
      status = json.status ?? res.status;
    }
  }

  if (auth && originalToken && isTokenDead(status, json.message)) {
    if (
      !redirectingToLogin &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      redirectingToLogin = true;
      clearSession();
      window.location.assign("/login");
    }
    throw new ApiError(json.message || "Session expired", 401, json.code);
  }
  if (!res.ok || (json.status && json.status >= 400)) {
    throw new ApiError(json.message || `Request failed (${res.status})`, res.status, json.code);
  }

  // `?? (json as unknown as T)` alone would mistreat a legitimate `data:
  // null` payload (e.g. "no KYC started yet") as an unenveloped response
  // and return the whole envelope instead of null. Only fall back when
  // `data` is truly absent from the payload.
  return ('data' in json ? json.data : (json as unknown as T)) as T;
}
