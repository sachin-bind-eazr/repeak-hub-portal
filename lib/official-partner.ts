import { api } from "./api";

export interface OfficialPartnerProjection {
  isOfficialPartner: boolean;
  subjectType?: "ORGANIZER" | "CLUB";
  subjectId?: string;
  partnershipTitle?: string;
  partnerLogo3dUrl?: string | null;
  benefits?: Record<string, boolean>;
  validUntil?: string | null;
}

export function getOfficialPartner(
  subjectType: "ORGANIZER" | "CLUB",
  subjectId: string,
): Promise<OfficialPartnerProjection> {
  return api<OfficialPartnerProjection>(
    `/v2/official-partners/${subjectType}/${subjectId}`,
    { auth: false },
  );
}
