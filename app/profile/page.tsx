"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { useProfile } from "@/lib/ProfileContext";
import { ProfileCard } from "@/components/ProfileCard";
import { CONSOLE, FONT } from "@/lib/hub-tokens";

export default function ProfilePage() {
  const router = useRouter();
  const profile = useProfile();

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  return (
    <div style={{ background: CONSOLE.canvas, minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 28px 80px" }}>
        <a
          href="/home"
          style={{ fontSize: 13, fontWeight: 600, color: CONSOLE.textSecondary, fontFamily: FONT.ui }}
        >
          ← Back
        </a>
        <h1
          style={{
            margin: "16px 0 20px",
            fontSize: 24,
            fontWeight: 700,
            color: CONSOLE.textPrimary,
            letterSpacing: "-0.018em",
            fontFamily: FONT.display,
          }}
        >
          Your profile
        </h1>
        {profile ? (
          <ProfileCard profile={profile} />
        ) : (
          <p style={{ fontSize: 14, color: CONSOLE.textTertiary, fontFamily: FONT.ui }}>Loading…</p>
        )}
      </div>
    </div>
  );
}
