import { api } from "./api";

export interface CreateClubResponse {
  id: string;
  name: string;
  slug: string;
}

export interface CreateClubInput {
  name: string;
  slug: string;
  tagline?: string;
  city?: string;
  country?: string;
  description?: string;
  rules?: string;
  requiresApproval: boolean;
  membershipRequiresPayment: boolean;
  logoUrl?: string;
  bannerUrl?: string;
  termsAccepted: true;
  termsVersion: number;
}

export interface ClubCreationTerms {
  available: boolean;
  content: string | null;
  version: number;
  publishedAt: string | null;
}

export interface ClubCreationEligibility {
  canCreate: boolean;
  reason: "AVAILABLE" | "CLUB_ALREADY_OWNED";
  existingClub: {
    id: string;
    slug?: string | null;
    name: string;
    status: string;
  } | null;
}

export function getClubCreationEligibility(): Promise<ClubCreationEligibility> {
  return api<ClubCreationEligibility>("/v2/clubs/creation-eligibility");
}

export async function getClubCreationTerms(): Promise<ClubCreationTerms> {
  const settings = await api<{ clubCreationTerms?: ClubCreationTerms }>("/v2/settings/public");
  return settings.clubCreationTerms ?? { available: false, content: null, version: 0, publishedAt: null };
}

export interface CreateLinkedOrganizerInput {
  name: string;
  phoneNumber: string;
  email: string;
  companyName: string;
}

export interface LinkedClubOrganizerResponse {
  club: CreateClubResponse & {
    organizerId: string;
    status: string;
  };
  organizer: {
    id: string;
    name: string | null;
    phoneNumber: string;
    email: string | null;
    companyName: string | null;
    companyLogo: string | null;
    organizerType: string;
    approvalStatus: string;
  };
  created: { club: boolean; organizer: boolean };
  linked: boolean;
}

export async function createClub(input: CreateClubInput): Promise<CreateClubResponse> {
  return api<CreateClubResponse>("/v2/clubs", {
    method: "POST",
    body: JSON.stringify({ ...input, isPublic: true }),
  });
}

/** Canonical paired-account API. Safe to retry: the backend completes an
 * existing one-sided account instead of creating a duplicate. */
export async function createClubOrganizerPair(
  club: CreateClubInput,
  organizer: CreateLinkedOrganizerInput,
): Promise<LinkedClubOrganizerResponse> {
  return api<LinkedClubOrganizerResponse>("/v2/club-organizer-accounts", {
    method: "POST",
    body: JSON.stringify({
      club: { ...club, isPublic: true },
      organizer,
    }),
  });
}

export async function patchClubBranding(
  clubId: string,
  branding: { logoUrl?: string; bannerUrl?: string },
): Promise<void> {
  await api(`/v2/clubs/${clubId}`, {
    method: "PATCH",
    body: JSON.stringify(branding),
  });
}

/** Generic authenticated image uploader — same one the CM branding step uses. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api<{ url: string }>("/v2/feed/posts/upload-image", {
    method: "POST",
    body: form,
  });
  return res.url;
}

export type ClubKycState = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "RESUBMIT";

export interface ClubKyc {
  kycId: string;
  clubId: string;
  state: ClubKycState;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  documents: {
    identityProof: string | null;
    panCard: string | null;
    addressProof: string | null;
    cancelledCheque: string | null;
  };
  bankAccountDetails: {
    accountHolderName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    bankName: string | null;
    branchName?: string | null;
  } | null;
  bankVerification: {
    verified: boolean;
    verifiedName: string | null;
    utr: string | null;
    transactionId: string | null;
    verifiedAt: string | null;
    required?: boolean;
  };
  contactEmail: string | null;
  contactPhone: string | null;
  editable: boolean;
  missing: string[];
  canSubmit: boolean;
}

export const CLUB_KYC_MISSING_LABELS: Record<string, string> = {
  panCard: "PAN card",
  "bankAccountDetails.accountNumber": "Bank account number",
  "bankAccountDetails.ifscCode": "Bank IFSC code",
  bankNotVerified: "Bank verification",
};

export async function getClubKyc(clubId: string): Promise<ClubKyc | null> {
  return api<ClubKyc | null>(`/v2/clubs/${clubId}/kyc`);
}

export interface UpsertClubKycInput {
  identityProof?: File | null;
  panCard?: File | null;
  addressProof?: File | null;
  cancelledCheque?: File | null;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branchName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export async function upsertClubKyc(clubId: string, input: UpsertClubKycInput): Promise<ClubKyc> {
  const form = new FormData();
  if (input.identityProof) form.append("identityProof", input.identityProof);
  if (input.panCard) form.append("panCard", input.panCard);
  if (input.addressProof) form.append("addressProof", input.addressProof);
  if (input.cancelledCheque) form.append("cancelledCheque", input.cancelledCheque);
  if (input.accountNumber || input.ifscCode || input.bankName || input.branchName || input.accountHolderName) {
    form.append(
      "bankAccountDetails",
      JSON.stringify({
        accountHolderName: input.accountHolderName || undefined,
        accountNumber: input.accountNumber || undefined,
        ifscCode: input.ifscCode || undefined,
        bankName: input.bankName || undefined,
        branchName: input.branchName || undefined,
      }),
    );
  }
  if (input.contactEmail) form.append("contactEmail", input.contactEmail);
  if (input.contactPhone) form.append("contactPhone", input.contactPhone);

  return api<ClubKyc>(`/v2/clubs/${clubId}/kyc`, {
    method: "POST",
    body: form,
  });
}

export async function verifyClubBank(
  clubId: string,
  accountNumber: string,
  ifsc: string,
): Promise<{ verified: boolean; reason: string | null; message: string }> {
  return api(`/v2/clubs/${clubId}/kyc/verify-bank`, {
    method: "POST",
    body: JSON.stringify({ accountNumber, ifsc }),
  });
}
