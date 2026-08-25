"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isAuthenticated } from "./auth";
import { getMyProfile, UserProfile } from "./profile";

const ProfileContext = createContext<UserProfile | null>(null);

/** Single shared fetch of GET /v2/users/me — both HubHeader (profile
 *  dropdown) and the home page (hero greeting) read from here instead
 *  of each firing their own request. Best-effort: failing silently
 *  leaves `profile` null, which callers already treat as "not shown
 *  yet" rather than an error state. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      setProfile(null);
      return;
    }
    getMyProfile()
      .then(setProfile)
      .catch(() => {});
  }, [pathname]);

  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile(): UserProfile | null {
  return useContext(ProfileContext);
}
