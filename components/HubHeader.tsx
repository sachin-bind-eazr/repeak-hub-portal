"use client";

/**
 * Frosted-glass top bar, ported from web-partner-portal's
 * `components/partner-hub/HubShell.tsx` top-bar treatment — same
 * translucent blur, wordmark, and profile-menu pattern the OM/BM/CM
 * `/hub` pages use, trimmed down (no workspace switcher or ⌘K palette
 * — this app has no "active workspace" concept, it's a login +
 * picker only). The dropdown itself is a compact menu (identity blurb
 * + "Profile" + "Log out") — the full profile details live on their
 * own `/profile` page, not inline here or on the home page.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getStoredUser, isAuthenticated, HubUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { useProfile } from "@/lib/ProfileContext";
import { CONSOLE, FONT, LOGO } from "@/lib/hub-tokens";
import { UserIcon } from "./hub-icons";

const HIDDEN_ON = new Set(["/", "/login"]);

function initials(name: string): string {
  return name[0]?.toUpperCase() ?? "?";
}

export function HubHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const [user, setUser] = useState<HubUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setUser(isAuthenticated() ? getStoredUser() : null);
    setMenuOpen(false);
  }, [pathname]);

  if (HIDDEN_ON.has(pathname) || !user) return null;

  const displayName = profile?.name || user.email || user.phoneNumber || "Account";

  async function logout() {
    setLoggingOut(true);
    // Best-effort — this also revokes every other session on the account
    // server-side (see lib/api.ts's isTokenDead note), so it's fine if the
    // request fails; the local session is cleared either way.
    await api("/v2/auth/logout", { method: "POST" }).catch(() => {});
    clearSession();
    router.replace("/login");
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: CONSOLE.topbarBg,
        borderBottom: `1px solid ${CONSOLE.topbarBorder}`,
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          height: 56,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a href="/home" style={{ display: "inline-flex" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO.color} alt="Repeak" width={92} height={20} />
        </a>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: 4,
              paddingRight: 10,
              borderRadius: 999,
              border: `1px solid ${CONSOLE.rule}`,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {profile?.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profilePhoto}
                alt=""
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #006F7A, #00B4A6)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FONT.ui,
                }}
              >
                {initials(displayName)}
              </span>
            )}
            <span style={{ fontSize: 12, fontWeight: 600, color: CONSOLE.textSecondary, fontFamily: FONT.ui }}>
              {displayName}
            </span>
          </button>

          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 240,
                  zIndex: 30,
                  background: CONSOLE.glassBg,
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: `1px solid ${CONSOLE.glassBorder}`,
                  borderRadius: 16,
                  boxShadow: CONSOLE.shadowCard,
                  padding: 8,
                }}
              >
                <div style={{ padding: "8px 10px 10px", borderBottom: `1px solid ${CONSOLE.rule}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: CONSOLE.textPrimary, fontFamily: FONT.ui }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 12, color: CONSOLE.textTertiary, fontFamily: FONT.ui }}>
                    {user.email || user.phoneNumber}
                  </div>
                </div>

                <a
                  href="/profile"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 6,
                    padding: "8px 10px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    color: CONSOLE.textPrimary,
                    textDecoration: "none",
                    fontFamily: FONT.ui,
                  }}
                >
                  <UserIcon size={16} color={CONSOLE.textSecondary} />
                  Profile
                </a>

                <button
                  type="button"
                  onClick={logout}
                  disabled={loggingOut}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 600,
                    color: CONSOLE.textSecondary,
                    cursor: "pointer",
                    fontFamily: FONT.ui,
                  }}
                >
                  {loggingOut ? "Signing out…" : "Log out"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
