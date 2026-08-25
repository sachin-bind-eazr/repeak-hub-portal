import { api } from "./api";
import { WorkspaceType } from "./workspaces";

export type HubProduct = Exclude<WorkspaceType, "COMMUNITY">;

// Defaults to the live production portals rather than localhost —
// same reasoning as lib/api.ts's API_BASE default: this app's dev
// workflow runs host-side against the deployed backend, not local
// docker instances. Docker builds still override these via the
// NEXT_PUBLIC_{OM,BM,CM}_BASE_URL build args (see docker/compose.yml).
const DEST_BASE_URL: Record<HubProduct, string> = {
  ORGANIZER: process.env.NEXT_PUBLIC_OM_BASE_URL || "https://partner.repeak.in",
  BRAND: process.env.NEXT_PUBLIC_BM_BASE_URL || "https://brand.repeak.in",
  CLUB: process.env.NEXT_PUBLIC_CM_BASE_URL || "https://club.repeak.in",
};

/** Host to display (e.g. "partner.repeak.in" in prod, "localhost:4004"
 *  in dev) — same base URL mintAndRedirect uses. */
export function destHost(product: HubProduct): string {
  try {
    return new URL(DEST_BASE_URL[product]).host;
  } catch {
    return "Repeak";
  }
}

/** Full destination URL (scheme + host) — shown on the /details page. */
export function destUrl(product: HubProduct): string {
  return DEST_BASE_URL[product];
}

/**
 * Mints a short-lived activation token for `product`/`entityId` and
 * navigates the browser to the destination portal's `/activate`
 * receiver. Not the old fragment+full-session-blob SSO pattern — this
 * carries only the single-purpose activation JWT; the destination
 * portal exchanges it server-side for its own real session.
 */
export async function mintAndRedirect(
  product: HubProduct,
  entityId: string,
): Promise<void> {
  const { activationToken } = await api<{
    activationToken: string;
    expiresIn: number;
  }>("/v2/hub/activation-token", {
    method: "POST",
    body: JSON.stringify({ product, entityId }),
  });
  const url = `${DEST_BASE_URL[product]}/activate?activation_token=${encodeURIComponent(
    activationToken,
  )}`;
  window.location.href = url;
}

/**
 * No workspace for this product yet — hand off to the destination
 * portal's own onboarding flow instead of the Hub's local
 * `/activate/<product>` apply form.
 *
 * This is a plain cross-origin navigation, NOT `mintAndRedirect`:
 * there's no `entityId` to mint an activation token against until the
 * entity exists, so the destination portal owns entity creation and
 * runs its own auth on arrival.
 */
export function redirectToOnboarding(product: HubProduct): void {
  window.location.href = `${DEST_BASE_URL[product]}/onboarding`;
}
