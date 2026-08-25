import { api } from "./api";

/**
 * Subset of GET /v2/users/me — the same "who am I" endpoint
 * web-athlete-app's useMe() calls. Full entity has far more (privacy
 * toggles, quiet hours, console prefs, etc.) that belong to a settings
 * screen, not a read-only profile card here.
 */
export interface UserProfile {
  id: string;
  name?: string | null;
  username?: string | null;
  athleteId?: string | null;
  profilePhoto?: string | null;
  bio?: string | null;
  phoneNumber?: string | null;
  phoneVerifiedAt?: string | null;
  email?: string | null;
  emailVerifiedAt?: string | null;
  city?: string | null;
  state?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  exerciseLevel?: string | null;
  verificationTier?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  activitiesCount?: number | null;
  // Decimal columns come back from Postgres as strings (e.g. "0.00").
  wallet?: { balance?: string | number; totalCoinsEarned?: string | number } | null;
}

export async function getMyProfile(): Promise<UserProfile> {
  return api<UserProfile>("/v2/users/me");
}
