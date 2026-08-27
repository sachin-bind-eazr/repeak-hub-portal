"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { mintAndRedirect } from "@/lib/activation";
import {
  createClubOrganizerPair,
  uploadImage,
  getClubKyc,
  upsertClubKyc,
  verifyClubBank,
  CLUB_KYC_MISSING_LABELS,
  getClubCreationTerms,
  getClubCreationEligibility,
  ClubKyc,
} from "@/lib/club-onboarding";
import { usableMediaUrl } from "@/lib/media-url";
import { OMCard } from "@/components/om/OMCard";
import { OMField, OMFieldGroup, OMInput, OMTextarea, OMFileInput } from "@/components/om/OMField";
import { OMButton } from "@/components/om/OMButton";
import { OMProgressSteps } from "@/components/om/OMProgress";
import { ProductHeader } from "@/components/om/ProductHeader";
import { Callout } from "@/components/om/Callout";
import { RequirementList, NumberedSteps, SupportCard } from "@/components/om/Aside";

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/;

const STEPS = [
  { id: "basics", label: "Basics" },
  { id: "branding", label: "Branding" },
  { id: "description", label: "Description" },
  { id: "review", label: "Review" },
  { id: "verify", label: "Verify" },
];
type Step = 1 | 2 | 3 | 4 | 5;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export default function ActivateClubPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [clubId, setClubId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<{ available: boolean; content: string | null; version: number } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // Step 1 — Basics
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [tagline, setTagline] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyNameEdited, setCompanyNameEdited] = useState(false);

  // Step 2 — Branding
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const previewLogoUrl = usableMediaUrl(logoUrl);
  const previewBannerUrl = usableMediaUrl(bannerUrl);

  // Step 3 — Description
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");

  // Step 5 — Verify (KYC)
  const [kyc, setKyc] = useState<ClubKyc | null>(null);
  const [identityProof, setIdentityProof] = useState<File | null>(null);
  const [panCard, setPanCard] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [cancelledCheque, setCancelledCheque] = useState<File | null>(null);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) return;
    const repairEntityId = new URLSearchParams(window.location.search).get("repair_entity_id");
    if (repairEntityId) {
      setClubId(repairEntityId);
      setStep(5);
      setCheckingEligibility(false);
      return;
    }
    Promise.all([getClubCreationEligibility(), getClubCreationTerms()])
      .then(([eligibility, currentTerms]) => {
        if (!eligibility.canCreate) {
          router.replace("/details/club");
          return;
        }
        setTerms(currentTerms);
        setCheckingEligibility(false);
      })
      .catch(() => {
        setTerms({ available: false, content: null, version: 0 });
        setError("We couldn’t check whether this account can create a Club. Return to Workspaces and try again.");
        setCheckingEligibility(false);
      });
  }, [router]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [kycMessage, setKycMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const user = getStoredUser();
    if (user?.phoneNumber) {
      setOwnerPhone(user.phoneNumber);
      setContactPhone(user.phoneNumber);
    }
    if (user?.email) {
      setOwnerEmail(user.email);
      setContactEmail(user.email);
    }
  }, [router]);

  useEffect(() => {
    if (!companyNameEdited) setCompanyName(name);
  }, [name, companyNameEdited]);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  async function handlePick(kind: "logo" | "banner", file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Images must be under 5MB.");
      return;
    }
    setError(null);
    const setUploading = kind === "logo" ? setUploadingLogo : setUploadingBanner;
    const setUrl = kind === "logo" ? setLogoUrl : setBannerUrl;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setUrl(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  function next() {
    setError(null);
    setStep((s) => (Math.min(s + 1, 5) as Step));
  }
  function prev() {
    setError(null);
    setStep((s) => (Math.max(s - 1, 1) as Step));
  }

  async function createAndAdvance() {
    setError(null);
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      setError("Club name must be at least 3 characters.");
      return;
    }
    if (!ownerName.trim() || !ownerPhone.trim() || !ownerEmail.trim()) {
      setError("Add the owner name, verified phone number, and email for the linked Organizer account.");
      return;
    }
    if (!terms?.available || !termsAccepted) {
      setError("Read and accept the current Repeak Club Terms & Conditions.");
      return;
    }
    const trimmedSlug = slug.trim().length >= 3 ? slug.trim() : slugify(trimmedName);
    setLoading(true);
    try {
      const pair = await createClubOrganizerPair(
        {
          name: trimmedName,
          slug: trimmedSlug,
          tagline: tagline.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          description: description.trim() || undefined,
          rules: rules.trim() || undefined,
          requiresApproval,
          membershipRequiresPayment: false,
          logoUrl: logoUrl || undefined,
          bannerUrl: bannerUrl || undefined,
          termsAccepted: true,
          termsVersion: terms.version,
        },
        {
          name: ownerName.trim(),
          phoneNumber: ownerPhone.trim(),
          email: ownerEmail.trim(),
          companyName: companyName.trim() || trimmedName,
        },
      );
      setClubId(pair.club.id);
      setStep(5);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your club.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshKyc(id: string) {
    try {
      setKyc(await getClubKyc(id));
    } catch {
      setKyc(null);
    }
  }

  useEffect(() => {
    if (step === 5 && clubId) refreshKyc(clubId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, clubId]);

  function validateBank(): string | null {
    if (!accountNumber && !ifscCode && !bankName && !accountHolderName) return null;
    if (accountHolderName.trim().length < 2) return "Account holder name is required.";
    if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) return "Account number should be 9-18 digits.";
    if (!IFSC_PATTERN.test(ifscCode)) return "IFSC code looks invalid (e.g. HDFC0001234).";
    if (!bankName.trim()) return "Bank name is required if you're adding bank details.";
    return null;
  }

  async function saveKyc(): Promise<boolean> {
    if (!clubId) return false;
    setKycMessage(null);
    const bankError = validateBank();
    if (bankError) {
      setKycMessage(bankError);
      return false;
    }
    setKycLoading(true);
    try {
      const updated = await upsertClubKyc(clubId, {
        identityProof,
        panCard,
        addressProof,
        cancelledCheque,
        accountHolderName: accountHolderName || undefined,
        accountNumber: accountNumber || undefined,
        ifscCode: ifscCode || undefined,
        bankName: bankName || undefined,
        branchName: branchName || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
      });
      setKyc(updated);
      setKycMessage("Saved.");
      return true;
    } catch (err) {
      setKycMessage(err instanceof ApiError ? err.message : "Could not save KYC details.");
      return false;
    } finally {
      setKycLoading(false);
    }
  }

  async function verifyBank() {
    if (!clubId) return;
    setKycMessage(null);
    setKycLoading(true);
    try {
      const res = await verifyClubBank(clubId, accountNumber, ifscCode);
      setKycMessage(res.message);
      await refreshKyc(clubId);
    } catch (err) {
      setKycMessage(err instanceof ApiError ? err.message : "Could not verify bank account.");
    } finally {
      setKycLoading(false);
    }
  }

  async function saveAndContinue() {
    if (await saveKyc()) await finish();
  }

  async function finish() {
    setError(null);
    setLoading(true);
    try {
      await mintAndRedirect("CLUB", clubId!);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not activate Club Manager.");
      setLoading(false);
    }
  }

  const currentStepId = STEPS[step - 1].id;
  const progressSteps = useMemo(
    () => STEPS.map((s, i) => ({ id: s.id, label: s.label, complete: i + 1 < step })),
    [step],
  );

  if (checkingEligibility) {
    return (
      <div className="min-h-screen bg-canvas px-6 py-20 text-center text-sm text-muted">
        Checking your Club workspace…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <ProductHeader
          eyebrow="Activate"
          title="Club"
          description="Create the workspace, add verification details, then finish the public profile in Club Manager before sending it to Repeak for approval."
          breadcrumbs={[{ label: "Home", href: "/home" }, { label: "Club" }]}
          backLink={{ label: "Back", href: "/home" }}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
        <div style={{ marginBottom: 20 }}>
          <OMProgressSteps steps={progressSteps} current={currentStepId} ariaLabel="Onboarding progress" />
        </div>

        {step === 1 && (
          <OMCard title="Basics" description="The essentials — you can refine everything else from Club Manager later.">
            <div className="flex flex-col gap-1">
              <OMFieldGroup>
                <OMField label="Club name" required>
                  <OMInput
                    required
                    minLength={3}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Bangalore Runners"
                  />
                </OMField>
                <OMField label="Club page URL" help="repeak.in/clubs/…">
                  <OMInput
                    value={slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setSlug(e.target.value);
                    }}
                  />
                </OMField>
                <OMField label="Tagline" help="Optional">
                  <OMInput value={tagline} onChange={(e) => setTagline(e.target.value)} />
                </OMField>
                <div className="grid grid-cols-2 gap-4">
                  <OMField label="City" help="Optional">
                    <OMInput value={city} onChange={(e) => setCity(e.target.value)} />
                  </OMField>
                  <OMField label="Country" help="Optional">
                    <OMInput value={country} onChange={(e) => setCountry(e.target.value)} />
                  </OMField>
                </div>
              </OMFieldGroup>

              <div className="mt-5 border-t border-border pt-5">
                <p className="m-0 text-sm font-semibold text-text-primary">
                  Linked Organizer account
                </p>
                <p className="mb-4 mt-1 text-xs leading-5 text-text-tertiary">
                  Both workspaces share one identity, but each keeps its own setup and approval state. Existing Organizer details are reused instead of duplicated.
                </p>
                <OMFieldGroup>
                  <OMField label="Owner name" required>
                    <OMInput required value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                  </OMField>
                  <OMField label="Verified phone" required>
                    <OMInput required value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
                  </OMField>
                  <OMField label="Email" required>
                    <OMInput type="email" required value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                  </OMField>
                  <OMField label="Organization name" required>
                    <OMInput
                      required
                      value={companyName}
                      onChange={(e) => {
                        setCompanyNameEdited(true);
                        setCompanyName(e.target.value);
                      }}
                    />
                  </OMField>
                </OMFieldGroup>
              </div>

              <div className="mt-3 flex flex-col gap-2.5">
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                  />
                  Private — require admin approval to join
                </label>
                <Callout
                  tone="info"
                  title="Paid memberships unlock later"
                  description="Start free. Monetization becomes available after 25 active members and six months, or when Repeak Admin grants an override."
                />
              </div>

              {error && <div className="mt-3"><Callout tone="danger" description={error} /></div>}

              <div className="mt-4">
                <OMButton variant="primary" size="lg" fullWidth onClick={next}>
                  Continue
                </OMButton>
              </div>
            </div>
          </OMCard>
        )}

        {step === 2 && (
          <OMCard title="Branding" description="Optional — you can add or change these any time from Club Manager.">
            <div className="flex flex-col gap-1">
              <OMFieldGroup>
                <OMField label="Logo" help="Optional — 5MB max">
                  <OMFileInput accept="image/*" onChange={(f) => handlePick("logo", f)} />
                  {uploadingLogo && <p className="mt-1 text-xs text-text-tertiary">Uploading…</p>}
                  {previewLogoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewLogoUrl} alt="" className="mt-2 h-12 w-12 rounded-rp-sm object-cover" />
                  )}
                </OMField>
                <OMField label="Banner" help="Optional — 5MB max">
                  <OMFileInput accept="image/*" onChange={(f) => handlePick("banner", f)} />
                  {uploadingBanner && <p className="mt-1 text-xs text-text-tertiary">Uploading…</p>}
                  {previewBannerUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewBannerUrl} alt="" className="mt-2 h-20 w-full rounded-rp-sm object-cover" />
                  )}
                </OMField>
              </OMFieldGroup>

              {error && <div className="mt-3"><Callout tone="danger" description={error} /></div>}

              {terms?.available && terms.content ? (
                <div className="mt-4 overflow-hidden rounded-rp-sm border border-border">
                  <div className="max-h-44 overflow-y-auto whitespace-pre-wrap p-3 text-xs leading-relaxed text-text-secondary">
                    {terms.content}
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 border-t border-border p-3 text-xs font-semibold text-text-primary">
                    <input className="mt-0.5" type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                    <span>I accept the Repeak Club Terms &amp; Conditions (version {terms.version}).</span>
                  </label>
                </div>
              ) : (
                <div className="mt-4"><Callout tone="danger" description="Club creation is paused until Repeak publishes the Club Terms & Conditions." /></div>
              )}

              <div className="mt-4 flex gap-3">
                <OMButton variant="secondary" size="lg" fullWidth onClick={prev}>
                  Back
                </OMButton>
                <OMButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={next}
                  disabled={uploadingLogo || uploadingBanner}
                >
                  Continue
                </OMButton>
              </div>
            </div>
          </OMCard>
        )}

        {step === 3 && (
          <OMCard title="Description" description="Optional — help members understand what your club is about.">
            <div className="flex flex-col gap-1">
              <OMFieldGroup>
                <OMField label="About" help="Optional">
                  <OMTextarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </OMField>
                <OMField label="Rules / code of conduct" help="Optional">
                  <OMTextarea rows={3} value={rules} onChange={(e) => setRules(e.target.value)} />
                </OMField>
              </OMFieldGroup>

              {error && <div className="mt-3"><Callout tone="danger" description={error} /></div>}

              <div className="mt-4 flex gap-3">
                <OMButton variant="secondary" size="lg" fullWidth onClick={prev}>
                  Back
                </OMButton>
                <OMButton variant="primary" size="lg" fullWidth onClick={next}>
                  Continue
                </OMButton>
              </div>
            </div>
          </OMCard>
        )}

        {step === 4 && (
          <OMCard title="Review" description="Check the details before your club is created.">
            <div className="flex flex-col gap-1">
              <div className="flex flex-col divide-y divide-border rounded-rp-sm border border-border">
                {[
                  ["Name", name],
                  ["URL", slug],
                  ["Tagline", tagline],
                  ["City", city],
                  ["Country", country],
                  ["Approval required", requiresApproval ? "Yes" : "No"],
                  ["Membership", "Free while the Club builds eligibility"],
                  ["Organizer owner", ownerName],
                  ["Organizer contact", ownerEmail],
                  ["Organization", companyName],
                ]
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-text-tertiary">{label}</span>
                      <span className="font-semibold text-text-primary">{value}</span>
                    </div>
                  ))}
              </div>

              {error && <div className="mt-3"><Callout tone="danger" description={error} /></div>}

              <div className="mt-4 flex gap-3">
                <OMButton variant="secondary" size="lg" fullWidth onClick={prev} disabled={loading}>
                  Back
                </OMButton>
                <OMButton variant="primary" size="lg" fullWidth loading={loading} onClick={createAndAdvance}>
                  {loading ? "Creating…" : "Create club"}
                </OMButton>
              </div>
            </div>
          </OMCard>
        )}

        {step === 5 && (
          <OMCard
            title="Prepare verification"
            description="Save documents and bank details now, or finish the full PAN verification later in Club Manager. This does not submit the Club for approval."
          >
            <div className="flex flex-col gap-1">
              {kyc && kyc.missing.length > 0 && (
                <div className="mb-1">
                  <Callout
                    tone="warning"
                    title="Still needed"
                    description={kyc.missing.map((m) => CLUB_KYC_MISSING_LABELS[m] || m).join(", ")}
                  />
                </div>
              )}

              <OMFieldGroup>
                <OMField label="Identity proof" help="Optional">
                  <OMFileInput accept="image/*,.pdf" onChange={setIdentityProof} />
                </OMField>
                <OMField label="PAN card" required>
                  <OMFileInput accept="image/*,.pdf" onChange={setPanCard} />
                </OMField>
                <OMField label="Address proof" help="Optional">
                  <OMFileInput accept="image/*,.pdf" onChange={setAddressProof} />
                </OMField>
                <OMField label="Cancelled cheque" help="Optional">
                  <OMFileInput accept="image/*,.pdf" onChange={setCancelledCheque} />
                </OMField>
              </OMFieldGroup>

              <div style={{ marginTop: 8 }}>
                <OMCard
                  as="section"
                  elevation="flat"
                  padding="none"
                  className="om-card--inset"
                  title="Bank account"
                >
                  <OMFieldGroup>
                    <OMField label="Account holder name">
                      <OMInput value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
                    </OMField>
                    <OMField label="Account number">
                      <OMInput value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                    </OMField>
                    <OMField label="IFSC code">
                      <OMInput
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        placeholder="HDFC0001234"
                      />
                    </OMField>
                    <OMField label="Bank name">
                      <OMInput value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    </OMField>
                    <OMField label="Branch name" help="Optional">
                      <OMInput value={branchName} onChange={(e) => setBranchName(e.target.value)} />
                    </OMField>
                  </OMFieldGroup>
                </OMCard>
              </div>

              <div style={{ marginTop: 8 }}>
                <OMFieldGroup>
                  <OMField label="Contact email" help="Optional">
                    <OMInput type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                  </OMField>
                  <OMField label="Contact phone" help="Optional">
                    <OMInput value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  </OMField>
                </OMFieldGroup>
              </div>

              {kycMessage && (
                <p className="mt-3 text-xs font-semibold text-text-secondary">{kycMessage}</p>
              )}
              {error && <div className="mt-3"><Callout tone="danger" description={error} /></div>}

              <div className="mt-4 flex gap-3">
                <OMButton variant="secondary" size="lg" fullWidth loading={kycLoading} onClick={saveKyc}>
                  {kycLoading ? "Saving…" : "Save"}
                </OMButton>
                <OMButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled={kycLoading || !accountNumber || !ifscCode}
                  onClick={verifyBank}
                >
                  Verify bank
                </OMButton>
              </div>
              <div className="mt-3 flex gap-3">
                <OMButton variant="secondary" size="lg" fullWidth disabled={loading} onClick={finish}>
                  I&apos;ll do this later
                </OMButton>
                <OMButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  disabled={kycLoading}
                  onClick={saveAndContinue}
                >
                  {loading ? "Opening…" : "Save and open Club Manager"}
                </OMButton>
              </div>
            </div>
          </OMCard>
        )}
        </div>

        <aside className="flex flex-col gap-4">
          {step <= 3 && (
            <NumberedSteps
              title="Setting up your club"
              steps={[
                { label: "Basics", description: "Name, page URL, location, and membership type." },
                { label: "Branding", description: "Logo and banner — optional, can add later." },
                { label: "Description", description: "About and rules — optional, can add later." },
                { label: "Review", description: "Confirm details, then your club is created." },
                { label: "Verify", description: "KYC and bank account, to receive settlements." },
              ]}
            />
          )}
          {step === 4 && (
            <RequirementList
              title="For verification"
              description="You'll need these on the next step to receive settlements."
              items={[
                { label: "PAN card", required: true },
                { label: "Identity proof", required: false },
                { label: "Address proof", required: false },
                { label: "Bank account & cancelled cheque", required: false, note: "Can be added later from Club Manager" },
              ]}
            />
          )}
          {step === 5 && (
            <NumberedSteps
              title="What happens next"
              steps={[
                { label: "Finish Club setup", description: "Add the required sport, About copy, location, and logo in Club Manager." },
                { label: "Submit for Club approval", description: "Only a complete profile enters the Repeak review queue." },
                { label: "Complete KYC", description: "Verification unlocks settlements and payouts after approval." },
              ]}
            />
          )}
          <SupportCard description="Questions about club verification or settlements? Reach out to Repeak support any time." />
        </aside>
        </div>
      </div>
    </div>
  );
}
