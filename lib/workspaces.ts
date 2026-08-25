import { api } from "./api";

export type WorkspaceType = "ORGANIZER" | "BRAND" | "CLUB" | "COMMUNITY";

export interface Workspace {
  id: string;
  type: WorkspaceType;
  displayName: string;
  entityId: string;
  role: string;
  capabilities: string[];
  status: "ACTIVE" | "PENDING" | "REVOKED";
  approvalState:
    | "ACTIVE"
    | "PENDING_APPROVAL"
    | "KYC_PENDING"
    | "SUSPENDED"
    | "REJECTED"
    | "INACTIVE";
  launchable: boolean;
  joinedAt: string;
}

// Mirrors the backend gate. DRAFT Clubs project as KYC_PENDING and remain
// launchable so Club Manager can finish setup; PENDING_APPROVAL is mintable
// so the destination can render the review state. Suspended/rejected/inactive
// workspaces stay blocked.
export const APPROVAL_LABEL: Record<Workspace["approvalState"], string> = {
  ACTIVE: "Active",
  PENDING_APPROVAL: "Application pending",
  KYC_PENDING: "Finish setup",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
  INACTIVE: "Inactive",
};

export async function listWorkspaces(): Promise<Workspace[]> {
  const { workspaces } = await api<{ workspaces: Workspace[]; total: number }>(
    "/v2/users/me/workspaces",
  );
  return workspaces;
}

export type PairRepairSourceType = "CLUB" | "ORGANIZER";

export interface PairRepairResponse {
  linked: boolean;
  repaired: boolean;
  created: { club: boolean; organizer: boolean };
  club: { id: string; name: string; status: string };
  organizer: { id: string; name: string | null; approvalStatus: string };
  nextAction: {
    product: "CLUB" | "ORGANIZER";
    entityId: string;
    route: string;
  };
}

export async function repairLinkedAccount(
  sourceType: PairRepairSourceType,
  sourceId: string,
): Promise<PairRepairResponse> {
  return api<PairRepairResponse>("/v2/club-organizer-accounts/repair", {
    method: "POST",
    body: JSON.stringify({ sourceType, sourceId }),
  });
}

export interface OrganizerInvite {
  id: string;
  organizerId: string;
  inviteEmail: string;
  role: string;
  status: "INVITED" | "ACTIVE" | "REVOKED";
}

export function listOrganizerInvites(): Promise<OrganizerInvite[]> {
  return api<OrganizerInvite[]>("/v2/me/organizer-memberships");
}

export function acceptOrganizerInvite(id: string): Promise<OrganizerInvite> {
  return api<OrganizerInvite>(`/v2/me/organizer-memberships/${id}/accept`, {
    method: "POST",
  });
}
