"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import {
  APPROVAL_LABEL,
  listWorkspaces,
  repairLinkedAccount,
  acceptOrganizerInvite,
  listOrganizerInvites,
  OrganizerInvite,
  Workspace,
  WorkspaceType,
} from "@/lib/workspaces";
import { HubProduct, mintAndRedirect, redirectToOnboarding } from "@/lib/activation";
import { ApiError } from "@/lib/api";
import { useProfile } from "@/lib/ProfileContext";
import { HubHero } from "@/components/HubHero";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/lib/products";
import { CONSOLE, FONT, TYPE } from "@/lib/hub-tokens";

export default function HomePage() {
  const router = useRouter();
  const profile = useProfile();
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState<HubProduct | null>(null);
  const [invites, setInvites] = useState<OrganizerInvite[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    listWorkspaces()
      .then(setWorkspaces)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load your workspaces."),
      );
    listOrganizerInvites()
      .then((items) => setInvites(items.filter((item) => item.status === "INVITED")))
      .catch(() => setInvites([]));
  }, [router]);

  function workspaceFor(type: WorkspaceType): Workspace | undefined {
    return workspaces?.find((w) => w.type === type);
  }

  async function activate(product: HubProduct) {
    setError(null);
    const existing = workspaceFor(product);

    if (!existing && (product === "CLUB" || product === "ORGANIZER")) {
      const counterpart = workspaceFor(product === "CLUB" ? "ORGANIZER" : "CLUB");
      if (counterpart) {
        setLaunching(product);
        try {
          const repaired = await repairLinkedAccount(
            counterpart.type as "CLUB" | "ORGANIZER",
            counterpart.entityId,
          );
          // The new companion is intentionally a draft and still needs its
          // own onboarding details. Continue inside Hub first, then Club
          // Manager opens the exact setup step that remains.
          const pairedClub = repaired.nextAction.product === "ORGANIZER" ? `&linked_club_id=${encodeURIComponent(repaired.club.id)}` : "";
          window.location.href = `/activate/${repaired.nextAction.product.toLowerCase()}?repair_entity_id=${encodeURIComponent(
            repaired.nextAction.entityId,
          )}${pairedClub}`;
          return;
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not complete the linked account. Contact support if this continues.",
          );
          setLaunching(null);
          return;
        }
      }
    }

    if (!existing) {
      redirectToOnboarding(product);
      return;
    }

    const canAttemptLaunch =
      existing.launchable || existing.approvalState === "PENDING_APPROVAL";
    if (!canAttemptLaunch) return;

    setLaunching(product);
    try {
      await mintAndRedirect(product, existing.entityId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not activate this workspace.");
      setLaunching(null);
    }
  }

  return (
    <div style={{ background: CONSOLE.canvas, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 28px 80px", display: "flex", flexDirection: "column", gap: 36 }}>
        <HubHero firstName={profile?.name?.split(" ")[0] ?? null} products={PRODUCTS} />

        {invites.map((invite) => (
          <section
            key={invite.id}
            style={{ padding: 18, borderRadius: 14, border: `1px solid ${CONSOLE.rule}`, background: CONSOLE.surface }}
          >
            <div style={{ fontFamily: FONT.display, fontWeight: 700, color: CONSOLE.textPrimary }}>
              Organizer staff invitation
            </div>
            <p style={{ margin: "6px 0 14px", fontFamily: FONT.ui, fontSize: 13, color: CONSOLE.textSecondary }}>
              You were invited as {invite.role.replaceAll("_", " ").toLowerCase()}.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await acceptOrganizerInvite(invite.id);
                  setInvites((items) => items.filter((item) => item.id !== invite.id));
                  setWorkspaces(await listWorkspaces());
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : "Could not accept the staff invitation.");
                }
              }}
              style={{ border: 0, borderRadius: 10, padding: "9px 14px", cursor: "pointer", background: CONSOLE.textPrimary, color: CONSOLE.canvas, fontWeight: 700 }}
            >
              Accept invitation
            </button>
          </section>
        ))}

        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <header>
            <div
              style={{
                fontSize: TYPE.eyebrow.size,
                fontWeight: TYPE.eyebrow.weight,
                letterSpacing: TYPE.eyebrow.tracking,
                textTransform: "uppercase",
                color: CONSOLE.textMuted,
                fontFamily: FONT.ui,
              }}
            >
              Your tools
            </div>
            <h2
              style={{
                margin: "4px 0 6px",
                fontSize: 22,
                fontWeight: 700,
                color: CONSOLE.textPrimary,
                letterSpacing: "-0.018em",
                fontFamily: FONT.display,
              }}
            >
              Choose a product
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: CONSOLE.textSecondary, fontFamily: FONT.ui }}>
              Pick a workspace you already manage, or apply to activate a new one.
            </p>
          </header>

          {error && (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--rp-danger-fg)" }}>{error}</p>
          )}

          <div
            className="hub-products-grid"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}
          >
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @media (max-width: 900px) {
                .hub-products-grid { grid-template-columns: 1fr 1fr !important; }
              }
              @media (max-width: 600px) {
                .hub-products-grid { grid-template-columns: 1fr !important; }
              }
            `,
              }}
            />
            {PRODUCTS.map((product) => {
              const existing = workspaceFor(product.type);
              const repairSource =
                !existing && product.type === "CLUB"
                  ? workspaceFor("ORGANIZER")
                  : !existing && product.type === "ORGANIZER"
                    ? workspaceFor("CLUB")
                    : undefined;
              const canAttemptLaunch =
                !existing || existing.launchable || existing.approvalState === "PENDING_APPROVAL";
              const state = launching === product.type
                ? "opening"
                : repairSource
                ? "repair"
                : !existing
                ? "activate"
                : canAttemptLaunch
                ? "open"
                : APPROVAL_LABEL[existing.approvalState];
              return (
                <ProductCard
                  key={product.type}
                  product={product}
                  state={state}
                  onClick={() => activate(product.type as HubProduct)}
                />
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
