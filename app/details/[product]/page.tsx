"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { APPROVAL_LABEL, listWorkspaces, repairLinkedAccount, Workspace } from "@/lib/workspaces";
import { HubProduct, mintAndRedirect, redirectToOnboarding } from "@/lib/activation";
import { ApiError } from "@/lib/api";
import { productForSlug } from "@/lib/products";
import { getEntityDetails, EntityDetails } from "@/lib/entity-details";
import { getClubKyc, CLUB_KYC_MISSING_LABELS, ClubKyc } from "@/lib/club-onboarding";
import { iconForWorkspaceType } from "@/components/hub-icons";
import { CONSOLE, FONT, TYPE } from "@/lib/hub-tokens";
import { OnboardingSteps, OnboardingStep } from "@/components/OnboardingSteps";
import { CheckCircle2, LifeBuoy } from "lucide-react";
import { getOfficialPartner, OfficialPartnerProjection } from "@/lib/official-partner";
import { usableMediaUrl } from "@/lib/media-url";

const surfaceCard: React.CSSProperties = {
  background: CONSOLE.surface,
  border: `1px solid ${CONSOLE.rule}`,
  borderRadius: 16,
  boxShadow: CONSOLE.shadowSoft,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: TYPE.eyebrow.size,
  fontWeight: TYPE.eyebrow.weight,
  letterSpacing: TYPE.eyebrow.tracking,
  textTransform: "uppercase",
  color: CONSOLE.textMuted,
  fontFamily: FONT.ui,
};

function formatDate(value?: string): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0" }}>
      <span style={{ fontSize: 13, color: CONSOLE.textTertiary, fontFamily: FONT.ui }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: CONSOLE.textPrimary, fontFamily: FONT.ui, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

export default function ProductDetailsPage() {
  const params = useParams<{ product: string }>();
  const router = useRouter();
  const product = productForSlug(params.product);

  const [workspace, setWorkspace] = useState<Workspace | null | undefined>(undefined);
  const [allWorkspaces, setAllWorkspaces] = useState<Workspace[]>([]);
  const [entity, setEntity] = useState<EntityDetails | null>(null);
  const [clubKyc, setClubKyc] = useState<ClubKyc | null>(null);
  const [officialPartner, setOfficialPartner] = useState<OfficialPartnerProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const entityLogoUrl = usableMediaUrl(entity?.logoUrl);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    if (!product) return;
    listWorkspaces()
      .then((all) => {
        setAllWorkspaces(all);
        const found = all.find((w) => w.type === product.type) ?? null;
        setWorkspace(found);
        // Best-effort — a 403/404 here just means no extra "about" section.
        if (found) {
          getEntityDetails(product.type, found.entityId).then(setEntity);
          if (product.type === "CLUB") {
            getClubKyc(found.entityId).then(setClubKyc).catch(() => setClubKyc(null));
          }
          if (product.type === "CLUB" || product.type === "ORGANIZER") {
            getOfficialPartner(product.type, found.entityId)
              .then(setOfficialPartner)
              .catch(() => setOfficialPartner(null));
          }
        }
      })
      .catch((err) => {
        setWorkspace(null);
        setError(err instanceof ApiError ? err.message : "Could not load this workspace.");
      });
  }, [router, product]);

  const onboardingSteps: OnboardingStep[] | null = (() => {
    if (!workspace || !product) return null;
    if (product.type === "ORGANIZER") {
      const kycDone = !!entity?.gstVerified || (entity?.bankVerificationState && entity.bankVerificationState !== "UNVERIFIED");
      const approved = workspace.approvalState === "ACTIVE";
      return [
        { label: "Account created", state: "complete" },
        { label: "Business KYC", state: approved || kycDone ? "complete" : "current" },
        { label: "Approved", state: approved ? "complete" : "upcoming" },
      ];
    }
    if (product.type === "CLUB") {
      const approved = workspace.approvalState === "ACTIVE";
      const setupPending = workspace.approvalState === "KYC_PENDING";
      const kycApproved = clubKyc?.state === "APPROVED";
      const kycSubmitted = clubKyc?.state === "UNDER_REVIEW" || kycApproved;
      return [
        { label: "Club created", state: "complete" },
        {
          label: "Public profile setup",
          state: setupPending ? "current" : "complete",
        },
        {
          label: "KYC verification",
          state: kycSubmitted
            ? "complete"
            : setupPending
              ? "upcoming"
              : clubKyc
                ? "current"
                : "upcoming",
        },
        {
          label: "Club approval",
          state: approved
            ? "complete"
            : workspace.approvalState === "PENDING_APPROVAL"
              ? "current"
              : "upcoming",
        },
      ];
    }
    return null;
  })();

  if (!product) {
    return (
      <div style={{ background: CONSOLE.canvas, minHeight: "100vh" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 28px" }}>
          <p style={{ fontSize: 14, color: CONSOLE.textSecondary, fontFamily: FONT.ui }}>Unknown product.</p>
          <a href="/home" style={{ fontSize: 13, fontWeight: 600, color: CONSOLE.textSecondary, fontFamily: FONT.ui }}>
            ← Back
          </a>
        </div>
      </div>
    );
  }

  const Icon = iconForWorkspaceType(product.type);
  const canAttemptLaunch = !workspace || workspace.launchable || workspace.approvalState === "PENDING_APPROVAL";

  async function openOrActivate() {
    setError(null);
    if (!workspace) {
      const counterpartType = product!.type === "CLUB" ? "ORGANIZER" : product!.type === "ORGANIZER" ? "CLUB" : null;
      const counterpart = counterpartType
        ? allWorkspaces.find((item) => item.type === counterpartType)
        : undefined;
      if (counterpart) {
        setLaunching(true);
        try {
          const repaired = await repairLinkedAccount(
            counterpart.type as "CLUB" | "ORGANIZER",
            counterpart.entityId,
          );
          const pairedClub = repaired.nextAction.product === "ORGANIZER" ? `&linked_club_id=${encodeURIComponent(repaired.club.id)}` : "";
          window.location.href = `/activate/${repaired.nextAction.product.toLowerCase()}?repair_entity_id=${encodeURIComponent(
            repaired.nextAction.entityId,
          )}${pairedClub}`;
          return;
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Could not complete the linked account.");
          setLaunching(false);
          return;
        }
      }
      redirectToOnboarding(product!.type as HubProduct);
      return;
    }
    if (!canAttemptLaunch) return;
    setLaunching(true);
    try {
      await mintAndRedirect(product!.type as HubProduct, workspace.entityId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not activate this workspace.");
      setLaunching(false);
    }
  }

  const ctaLabel = launching ? "Opening…" : workspace ? "Open " + product.name : "Activate " + product.name;

  return (
    <div style={{ background: CONSOLE.canvas, minHeight: "100vh" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 28px 80px" }}>
        <a href="/home" style={{ fontSize: 13, fontWeight: 600, color: CONSOLE.textSecondary, fontFamily: FONT.ui }}>
          ← Back
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "20px 0 24px" }}>
          <div
            aria-hidden="true"
            style={{
              width: 56,
              height: 56,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${product.accent}15`,
              color: product.accent,
              borderRadius: 14,
              border: `1px solid ${product.accent}28`,
              flexShrink: 0,
            }}
          >
            <Icon size={30} color={product.accent} strokeWidth={1.7} />
          </div>
          <div>
            <div
              style={{
                fontSize: TYPE.eyebrow.size,
                fontWeight: TYPE.eyebrow.weight,
                letterSpacing: TYPE.eyebrow.tracking,
                textTransform: "uppercase",
                color: product.accent,
                fontFamily: FONT.ui,
              }}
            >
              {product.category}
            </div>
            <h1
              style={{
                margin: "4px 0 0",
                fontSize: 26,
                fontWeight: 700,
                color: CONSOLE.textPrimary,
                letterSpacing: "-0.02em",
                fontFamily: FONT.display,
              }}
            >
              {product.name}
            </h1>
            {officialPartner?.isOfficialPartner && (
              <div
                style={{
                  marginTop: 7,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 9px",
                  borderRadius: 999,
                  background: `${product.accent}16`,
                  color: product.accent,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FONT.ui,
                }}
              >
                {officialPartner.benefits?.verifiedPartnerBadgeEnabled ? (
                  <CheckCircle2 size={14} />
                ) : null}
                {officialPartner.partnershipTitle || "Official Repeak Partner"}
              </div>
            )}
          </div>
        </div>

        <p style={{ margin: "0 0 24px", fontSize: 14.5, color: CONSOLE.textSecondary, lineHeight: 1.6, fontFamily: FONT.ui, maxWidth: 720 }}>
          {product.description}
        </p>

        {error && (
          <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--rp-danger-fg)" }}>{error}</p>
        )}

        <div className="hub-details-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 20, alignItems: "start" }}>
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @media (max-width: 860px) {
                .hub-details-grid { grid-template-columns: 1fr !important; }
              }
            `,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <div style={{ ...surfaceCard, padding: "6px 20px" }}>
              <Row label="Portal address" value={product.host} />
              {workspace === undefined ? (
                <Row label="Status" value="Loading…" />
              ) : workspace ? (
                <>
                  <Row label="Workspace name" value={workspace.displayName} />
                  <Row label="Your role" value={workspace.role} />
                  <Row label="Approval status" value={APPROVAL_LABEL[workspace.approvalState]} />
                  <Row label="Joined" value={formatDate(workspace.joinedAt)} />
                  <Row label="Workspace ID" value={workspace.entityId} />
                </>
              ) : (
                <Row label="Status" value="Not activated yet" />
              )}
            </div>

            {officialPartner?.isOfficialPartner && (
              <div style={{ ...surfaceCard, padding: "18px 20px" }}>
                <div style={eyebrowStyle}>Official partnership</div>
                <h2 style={{ margin: "6px 0 8px", fontSize: 18, color: CONSOLE.textPrimary, fontFamily: FONT.display }}>
                  {officialPartner.partnershipTitle || "Official Repeak Partner"}
                </h2>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: CONSOLE.textSecondary, fontFamily: FONT.ui }}>
                  Benefits are controlled by Repeak and apply only while this partnership is active.
                </p>
                <Row label="Valid until" value={formatDate(officialPartner.validUntil ?? undefined) ?? "No expiry"} />
                <Row
                  label="Active benefits"
                  value={String(Object.values(officialPartner.benefits ?? {}).filter((value) => value === true).length)}
                />
              </div>
            )}

            {entity ? (
              <div style={{ ...surfaceCard, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {entityLogoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entityLogoUrl}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }}
                    />
                  )}
                  <div>
                    <div style={eyebrowStyle}>About {product.name}</div>
                    {entity.name && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: CONSOLE.textPrimary, fontFamily: FONT.display }}>
                        {entity.name}
                      </div>
                    )}
                  </div>
                </div>

                {entity.description && (
                  <p style={{ margin: 0, fontSize: 13.5, color: CONSOLE.textSecondary, lineHeight: 1.55, fontFamily: FONT.ui }}>
                    {entity.description}
                  </p>
                )}

                <div>
                  <Row label="Location" value={[entity.city, entity.state].filter(Boolean).join(", ") || null} />
                  <Row label="Contact email" value={entity.email} />
                  <Row label="Phone" value={entity.phoneNumber} />
                  <Row label="Website" value={entity.website} />
                  <Row label="Members" value={entity.memberCount != null ? String(entity.memberCount) : null} />
                  <Row label="Approval status" value={entity.approvalStatus} />
                  {Object.entries(entity.extra ?? {}).map(([label, value]) => (
                    <Row key={label} label={label} value={value} />
                  ))}
                </div>
              </div>
            ) : workspace ? (
              <div style={{ ...surfaceCard, padding: "18px 20px" }}>
                <div style={eyebrowStyle}>About {product.name}</div>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: CONSOLE.textTertiary, fontFamily: FONT.ui, lineHeight: 1.55 }}>
                  Profile details aren&apos;t available here yet — open {product.name} to see the full picture.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={openOrActivate}
              disabled={workspace === undefined || (!!workspace && !canAttemptLaunch) || launching}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 22px",
                borderRadius: 999,
                border: "none",
                background: product.accent,
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 700,
                fontFamily: FONT.ui,
                cursor: "pointer",
                opacity: workspace && !canAttemptLaunch ? 0.5 : 1,
                alignSelf: "flex-start",
              }}
            >
              {ctaLabel}
            </button>
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {onboardingSteps && workspace && workspace.approvalState !== "ACTIVE" && (
              <div style={{ ...surfaceCard, padding: "18px 20px" }}>
                <div style={{ ...eyebrowStyle, marginBottom: 12 }}>Onboarding progress</div>
                <OnboardingSteps steps={onboardingSteps} />
                {product.type === "CLUB" && clubKyc && clubKyc.missing.length > 0 && (
                  <p style={{ margin: "12px 0 0", fontSize: 12.5, color: CONSOLE.textTertiary, fontFamily: FONT.ui }}>
                    Still needed: {clubKyc.missing.map((m) => CLUB_KYC_MISSING_LABELS[m] || m).join(", ")}
                  </p>
                )}
              </div>
            )}

            {product.capabilities && product.capabilities.length > 0 && (
              <div style={{ ...surfaceCard, padding: "18px 20px" }}>
                <div style={{ ...eyebrowStyle, marginBottom: 12 }}>What&apos;s inside</div>
                <ul style={{ display: "flex", flexDirection: "column", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
                  {product.capabilities.map((cap) => (
                    <li key={cap} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <CheckCircle2
                        size={16}
                        strokeWidth={1.75}
                        color={product.accent}
                        style={{ flexShrink: 0, marginTop: 1 }}
                        aria-hidden
                      />
                      <span style={{ fontSize: 13, color: CONSOLE.textSecondary, fontFamily: FONT.ui, lineHeight: 1.5 }}>
                        {cap}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ ...surfaceCard, padding: "16px 18px", boxShadow: "none" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <LifeBuoy size={20} strokeWidth={1.75} color={CONSOLE.textTertiary} aria-hidden style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: CONSOLE.textPrimary, fontFamily: FONT.ui }}>
                    Need help?
                  </div>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: CONSOLE.textTertiary, fontFamily: FONT.ui, lineHeight: 1.55 }}>
                    Questions about status, approval, or what to do next? Reach out to Repeak support any time.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
