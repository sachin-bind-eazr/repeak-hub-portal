"use client";

/**
 * Split-screen login, matching web-partner-portal's `/om-login` design
 * language exactly (dark branded aside + light form panel, boxed OTP
 * inputs, pill buttons) — ported by hand since there's no shared
 * package between the two Next.js apps (see `components/om/*` and
 * `lib/hub-tokens.ts` docblocks for the same note). Colors/radii come
 * from the `--rp-*` vars in `app/repeak-theme.css`, a byte-for-byte
 * copy of the partner portal's theme file, so the two stay visually
 * identical without duplicating raw hex values here.
 *
 * Deliberately narrower than OM's version: phone + OTP only (Hub has
 * no email login, no TOTP 2FA, no KYC-review status screens), and the
 * "Built for" panel lists Hub's three activatable products instead of
 * OM's four personas.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { LOGO } from "@/lib/hub-tokens";

type Step = "phone" | "otp";

interface VerifyOtpResponse {
  id: string;
  phoneNumber: string;
  email: string | null;
  accessToken: string;
  refreshToken: string;
}

const BUILT_FOR = [
  { label: "Organizer", sub: "Events, ticketing, hybrid race" },
  { label: "Brand", sub: "Sponsorships, campaigns, goodies" },
  { label: "Club", sub: "Members, tiers, channels" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const fullPhone = `+91${phone}`;
  const phoneValid = /^\d{10}$/.test(phone);

  const requestOtp = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await api("/v2/auth/send-otp", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send OTP.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [fullPhone]);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid) {
      setError("Enter a 10-digit mobile number.");
      return;
    }
    if (await requestOtp()) {
      setOtpDigits(["", "", "", ""]);
      setStep("otp");
      setResendCooldown(30);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    if (await requestOtp()) setResendCooldown(30);
  }

  const verifyCode = useCallback(
    async (code: string) => {
      setError(null);
      setLoading(true);
      try {
        const res = await api<VerifyOtpResponse>("/v2/auth/verify-otp", {
          method: "POST",
          auth: false,
          body: JSON.stringify({ phoneNumber: fullPhone, role: "user", otp: code }),
        });
        setSession(res.accessToken, res.refreshToken, {
          id: res.id,
          phoneNumber: res.phoneNumber,
          email: res.email ?? undefined,
        });
        router.replace("/home");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Invalid OTP.");
      } finally {
        setLoading(false);
      }
    },
    [fullPhone, router],
  );

  function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otpDigits.join("");
    if (code.length === 4) void verifyCode(code);
  }

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      // Paste of the full code into one box.
      if (value.length > 1) {
        const digits = value.replace(/\D/g, "").slice(0, 4).split("");
        const next = [...otpDigits];
        digits.forEach((d, i) => {
          if (index + i < 4) next[index + i] = d;
        });
        setOtpDigits(next);
        const focusIdx = Math.min(index + digits.length, 3);
        otpRefs.current[focusIdx]?.focus();
        const code = next.join("");
        if (code.length === 4) void verifyCode(code);
        return;
      }
      const digit = value.replace(/\D/g, "");
      const next = [...otpDigits];
      next[index] = digit;
      setOtpDigits(next);
      if (digit && index < 3) otpRefs.current[index + 1]?.focus();
      const code = next.join("");
      if (code.length === 4) void verifyCode(code);
    },
    [otpDigits, verifyCode],
  );

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
        const next = [...otpDigits];
        next[index - 1] = "";
        setOtpDigits(next);
        otpRefs.current[index - 1]?.focus();
      }
    },
    [otpDigits],
  );

  return (
    <div
      className="hub-login-grid"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        backgroundColor: "var(--rp-canvas)",
        fontFamily: "var(--font-manrope), 'Manrope', system-ui, sans-serif",
        color: "var(--rp-text-primary)",
      }}
    >
      {/* ── Dark branded aside ── */}
      <aside
        className="hub-login-aside"
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 52px 44px",
          backgroundColor: "#0A0A0F",
          color: "#fff",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -60,
            right: -60,
            width: 440,
            height: 340,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 70% 80%, rgba(180,60,10,0.55) 0%, rgba(120,30,0,0.28) 45%, transparent 75%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO.color}
            alt="Repeak"
            style={{ height: 22, width: "auto" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)", display: "inline-block" }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Hub
          </span>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--rp-primary)",
                flexShrink: 0,
                boxShadow: "0 0 6px var(--rp-primary)",
              }}
            />
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              One login, every workspace
            </span>
          </div>

          <h1
            style={{
              margin: "0 0 18px",
              fontSize: "clamp(32px, 3.2vw, 48px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              color: "#fff",
            }}
          >
            One login.
            <br />
            <span style={{ color: "var(--rp-primary)" }}>Every product.</span>
          </h1>

          <p
            style={{
              margin: "0 0 40px",
              fontSize: 15,
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.65,
              maxWidth: 400,
            }}
          >
            Sign in once to launch your Organizer, Brand, or Club workspace —
            or activate a new one straight from here.
          </p>

          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.3)",
                marginBottom: 16,
              }}
            >
              Built for
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 32px" }}>
              {BUILT_FOR.map(({ label, sub }) => (
                <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <span
                    style={{
                      marginTop: 5,
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--rp-primary)",
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2, lineHeight: 1.4 }}>
                      {sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p
          style={{
            position: "relative",
            zIndex: 1,
            margin: 0,
            fontSize: 11.5,
            color: "rgba(255,255,255,0.25)",
            lineHeight: 1.5,
          }}
        >
          Already have a workspace? Signing in here links to all of them.
        </p>
      </aside>

      {/* ── Form panel ── */}
      <main
        className="hub-login-main"
        style={{
          padding: "48px 56px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "var(--rp-canvas)",
        }}
      >
        <div className="hub-login-mobile-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO.color} alt="Repeak" style={{ height: 26, width: "auto" }} />
        </div>

        <div style={{ width: "100%", maxWidth: 420 }}>
          {step === "phone" ? (
            <form onSubmit={sendOtp} data-testid="hub-login-phone-form">
              <h2 style={headingStyle}>Sign in to Repeak Hub</h2>
              <p style={subheadStyle}>
                Enter your phone number. We&rsquo;ll send a verification code.
              </p>

              <label style={labelStyle} htmlFor="hub-phone-input">
                Phone number
              </label>
              <div className="hub-phone-row" style={phoneRowStyle}>
                <span style={phoneChipStyle}>🇮🇳 +91</span>
                <input
                  id="hub-phone-input"
                  data-testid="hub-login-phone-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  style={phoneInputStyle}
                  autoFocus
                />
              </div>

              {error && (
                <p style={errorStyle} data-testid="hub-login-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="hub-login-send-otp"
                style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1, cursor: loading ? "wait" : "pointer", marginTop: 18 }}
              >
                {loading ? "Sending code…" : "Send verification code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} data-testid="hub-login-otp-form">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                  setOtpDigits(["", "", "", ""]);
                }}
                style={backLinkStyle}
              >
                ← Use a different number
              </button>
              <h2 style={{ ...headingStyle, fontSize: 24 }}>Enter your verification code</h2>
              <p style={subheadStyle}>
                We sent a code to <strong style={{ color: "var(--rp-text-primary)" }}>{fullPhone}</strong>. Enter it
                below to sign in.
              </p>

              <label style={labelStyle}>Verification code</label>
              <div data-testid="hub-login-otp-input" style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={4}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    style={otpBoxStyle(digit)}
                  />
                ))}
              </div>

              {error && (
                <p style={errorStyle} data-testid="hub-login-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="hub-login-verify"
                style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1, cursor: loading ? "wait" : "pointer", marginTop: 18 }}
              >
                {loading ? "Verifying…" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                data-testid="hub-login-resend"
                style={{
                  ...secondaryButtonStyle,
                  marginTop: 10,
                  opacity: resendCooldown > 0 ? 0.55 : 1,
                  cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
              </button>
            </form>
          )}
        </div>
      </main>

      <style jsx>{`
        .hub-login-mobile-logo {
          display: none;
        }
        .hub-login-main input[type="tel"]:focus,
        .hub-login-main input[type="text"]:focus {
          border-color: var(--rp-primary) !important;
          box-shadow: 0 0 0 3px var(--rp-brand-mist) !important;
        }
        .hub-phone-row:focus-within {
          border-color: var(--rp-primary) !important;
          box-shadow: 0 0 0 3px var(--rp-brand-mist) !important;
        }
        .hub-login-main button[type="submit"]:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 4px 16px var(--rp-brand-glow), 0 1px 4px var(--rp-brand-halo) !important;
        }
        .hub-login-main button[type="button"]:hover:not(:disabled) {
          opacity: 0.85;
        }
        @media (max-width: 820px) {
          .hub-login-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .hub-login-aside {
            display: none !important;
          }
          .hub-login-main {
            padding: 36px 24px 40px !important;
            justify-content: center !important;
            min-height: 100vh !important;
          }
          .hub-login-mobile-logo {
            display: flex;
            align-items: center;
            width: 100%;
            max-width: 420px;
            margin-bottom: 32px;
          }
        }
        @media (max-width: 480px) {
          .hub-login-main {
            padding: 28px 18px 36px !important;
          }
        }
      `}</style>
    </div>
  );
}

const headingStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: "-0.025em",
  margin: "0 0 10px",
  lineHeight: 1.2,
  color: "var(--rp-text-primary)",
};

const subheadStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--rp-text-tertiary)",
  margin: "0 0 22px",
  lineHeight: 1.65,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#9A9890",
  display: "block",
  marginBottom: 7,
};

const phoneRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  borderRadius: "var(--rp-radius-md)",
  border: "1.5px solid var(--rp-border-strong)",
  backgroundColor: "var(--rp-surface)",
  overflow: "hidden",
  transition: "border-color 150ms ease, box-shadow 150ms ease",
};

const phoneChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "0 16px 0 14px",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--rp-text-secondary)",
  borderRight: "1.5px solid var(--rp-border)",
  backgroundColor: "var(--rp-surface-muted)",
  whiteSpace: "nowrap",
  flexShrink: 0,
  letterSpacing: "0.01em",
};

const phoneInputStyle: React.CSSProperties = {
  flex: 1,
  height: 48,
  padding: "0 16px",
  border: "none",
  outline: "none",
  fontSize: 15,
  color: "var(--rp-text-primary)",
  backgroundColor: "transparent",
  letterSpacing: "0.02em",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 20px",
  borderRadius: "var(--rp-radius-pill)",
  border: "none",
  background: "var(--rp-brand-gradient)",
  color: "var(--rp-primary-fg)",
  fontSize: 14.5,
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.01em",
  boxShadow: "0 2px 8px var(--rp-brand-glow), 0 1px 2px var(--rp-brand-halo)",
  transition: "opacity 150ms ease, box-shadow 150ms ease",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  padding: "0 18px",
  borderRadius: "var(--rp-radius-pill)",
  border: "1.5px solid var(--rp-border)",
  backgroundColor: "var(--rp-surface)",
  color: "var(--rp-text-primary)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  transition: "border-color 150ms ease, background 150ms ease",
};

const errorStyle: React.CSSProperties = {
  margin: "12px 0 0",
  padding: "11px 14px",
  borderRadius: "var(--rp-radius-md)",
  backgroundColor: "rgba(196, 41, 57, 0.05)",
  border: "1px solid rgba(196, 41, 57, 0.16)",
  color: "#B02030",
  fontSize: 13,
  lineHeight: 1.55,
};

const backLinkStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--rp-text-tertiary)",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  marginBottom: 12,
};

function otpBoxStyle(digit: string): React.CSSProperties {
  return {
    width: 56,
    height: 56,
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    borderRadius: "var(--rp-radius-md)",
    border: `1.5px solid ${digit ? "var(--rp-primary)" : "var(--rp-border-strong)"}`,
    color: "var(--rp-text-primary)",
    outline: "none",
    backgroundColor: "var(--rp-surface)",
    caretColor: "var(--rp-primary)",
    boxShadow: digit ? "0 0 0 3px var(--rp-brand-mist)" : "none",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
  };
}
