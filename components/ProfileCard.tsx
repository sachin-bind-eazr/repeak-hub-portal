import { Card } from "./ui";
import type { UserProfile } from "@/lib/profile";

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "");
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 sm:items-start">
      <span className="text-base font-bold text-text-primary">{value}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
        {label}
      </span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
        {label}
      </span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

export function ProfileCard({ profile }: { profile: UserProfile }) {
  const balance =
    profile.wallet?.balance !== undefined ? Number(profile.wallet.balance) : undefined;

  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {profile.profilePhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.profilePhoto}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-lg font-bold text-text-secondary">
            {initials(profile.name)}
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary">
              {profile.name || "Repeak athlete"}
            </h2>
            {(profile.verificationTier === "verified" ||
              profile.verificationTier === "elite_verified") && (
              <span className="inline-flex rounded-rp-pill bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success-fg">
                {profile.verificationTier === "elite_verified" ? "Elite verified" : "Verified"}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {[profile.username && `@${profile.username}`, profile.athleteId]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {profile.bio && (
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{profile.bio}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            <Stat label="Followers" value={profile.followersCount ?? 0} />
            <Stat label="Following" value={profile.followingCount ?? 0} />
            <Stat label="Activities" value={profile.activitiesCount ?? 0} />
            {balance !== undefined && <Stat label="RC balance" value={Math.round(balance)} />}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
            <Detail
              label="Phone"
              value={
                profile.phoneNumber &&
                `${profile.phoneNumber}${profile.phoneVerifiedAt ? " ✓" : ""}`
              }
            />
            <Detail
              label="Email"
              value={
                profile.email && `${profile.email}${profile.emailVerifiedAt ? " ✓" : ""}`
              }
            />
            <Detail
              label="Location"
              value={[profile.city, profile.state].filter(Boolean).join(", ") || null}
            />
            <Detail label="Gender" value={profile.gender} />
            <Detail label="Age" value={profile.age ?? undefined} />
            <Detail
              label="Height / weight"
              value={
                profile.height || profile.weight
                  ? `${profile.height ?? "–"} cm / ${profile.weight ?? "–"} kg`
                  : null
              }
            />
            <Detail label="Exercise level" value={profile.exerciseLevel} />
          </div>
        </div>
      </div>
    </Card>
  );
}
