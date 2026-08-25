import { api, ApiError } from "./api";
import type { WorkspaceType } from "./workspaces";

/** Real business-entity details for a workspace, shown on /details/[product]
 *  alongside the generic workspace envelope (role/status/joined). Each
 *  fetch is best-effort — a 403/404 here (e.g. a Brand workspace whose
 *  entityId doesn't resolve to an active sponsor account) just means we
 *  fall back to workspace-only info, not a page-breaking error. */
export interface EntityDetails {
  name?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  state?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  website?: string | null;
  approvalStatus?: string | null;
  memberCount?: number | null;
  extra?: Record<string, string>;
  /** Raw signals for deriving onboarding-progress steps — not directly rendered. */
  gstVerified?: boolean;
  bankVerificationState?: string | null;
}

interface OrganizerEntity {
  name?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
  city?: string | null;
  state?: string | null;
  approvalStatus?: string | null;
  gstVerified?: boolean;
  bankVerificationState?: string | null;
  headline?: string | null;
}

interface BrandEntity {
  name?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  categories?: string[];
  kycStage?: string | null;
  brandTier?: string | null;
  industry?: string | null;
}

interface ClubEntity {
  name?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  memberCount?: number | null;
  sports?: string[];
  tagline?: string | null;
  verified?: boolean;
  status?: string | null;
}

async function getOrganizerDetails(id: string): Promise<EntityDetails> {
  const org = await api<OrganizerEntity>(`/v2/organizers/${id}`);
  return {
    name: org.companyName || org.name,
    city: org.city,
    state: org.state,
    email: org.email,
    phoneNumber: org.phoneNumber,
    approvalStatus: org.approvalStatus,
    logoUrl: org.companyLogo,
    description: org.headline,
    gstVerified: org.gstVerified,
    bankVerificationState: org.bankVerificationState,
    extra: {
      ...(org.gstVerified !== undefined && { "GST verified": org.gstVerified ? "Yes" : "No" }),
      ...(org.bankVerificationState && { "Bank verification": org.bankVerificationState }),
    },
  };
}

async function getBrandDetails(id: string): Promise<EntityDetails> {
  const brand = await api<BrandEntity>(`/v2/sponsor/brands/${id}`);
  return {
    name: brand.name,
    description: brand.description,
    logoUrl: brand.logoUrl,
    email: brand.contactEmail,
    website: brand.websiteUrl,
    extra: {
      ...(brand.industry && { Industry: brand.industry }),
      ...(brand.brandTier && { Tier: brand.brandTier }),
      ...(brand.kycStage && { "KYC stage": brand.kycStage }),
      ...(brand.categories?.length && { Categories: brand.categories.join(", ") }),
    },
  };
}

async function getClubDetails(id: string): Promise<EntityDetails> {
  const club = await api<ClubEntity>(`/v2/clubs/${id}`);
  return {
    name: club.name,
    description: club.tagline || club.description,
    logoUrl: club.logoUrl,
    city: club.city,
    memberCount: club.memberCount,
    extra: {
      ...(club.sports?.length && { Sports: club.sports.join(", ") }),
      ...(club.verified !== undefined && { Verified: club.verified ? "Yes" : "No" }),
    },
  };
}

/** Best-effort — resolves to null (never rejects) when the hub session
 *  isn't authorized for this particular entity, so the caller can fall
 *  back to workspace-only info instead of breaking the page. */
export async function getEntityDetails(
  type: WorkspaceType,
  entityId: string,
): Promise<EntityDetails | null> {
  try {
    switch (type) {
      case "ORGANIZER":
        return await getOrganizerDetails(entityId);
      case "BRAND":
        return await getBrandDetails(entityId);
      case "CLUB":
      case "COMMUNITY":
        return await getClubDetails(entityId);
      default:
        return null;
    }
  } catch (err) {
    if (err instanceof ApiError) return null;
    return null;
  }
}
