"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { mintAndRedirect } from "@/lib/activation";
import { OMCard } from "@/components/om/OMCard";
import { OMField, OMFieldGroup, OMInput, OMTextarea, OMFileInput } from "@/components/om/OMField";
import { OMButton } from "@/components/om/OMButton";
import { OMProgressSteps } from "@/components/om/OMProgress";
import { ProductHeader } from "@/components/om/ProductHeader";
import { Callout } from "@/components/om/Callout";
import { RequirementList, NumberedSteps, SupportCard } from "@/components/om/Aside";
import {
  createClubOrganizerPair,
  getClubKyc,
  getClubCreationTerms,
  upsertClubKyc,
  uploadImage,
} from "@/lib/club-onboarding";

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_NUMBER_PATTERN = /^\d{9,18}$/;

const STEPS = [
  { id: "account", label: "Account pair" },
  { id: "kyc", label: "Business KYC" },
  { id: "review", label: "Review" },
];

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export default function ActivateOrganizerPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [clubId, setClubId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<{ available: boolean; content: string | null; version: number } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Step 1 — Account
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [clubName, setClubName] = useState("");
  const [clubNameEdited, setClubNameEdited] = useState(false);
  const [clubSlug, setClubSlug] = useState("");
  const [clubSlugEdited, setClubSlugEdited] = useState(false);
  const [clubCity, setClubCity] = useState("");
  const [clubCountry, setClubCountry] = useState("");
  const [clubDescription, setClubDescription] = useState("");

  // Step 2 — Business KYC
  const [businessRegistrationCertificate, setBusinessRegistrationCertificate] =
    useState<File | null>(null);
  const [panCard, setPanCard] = useState<File | null>(null);
  const [gstRegistrationCertificate, setGstRegistrationCertificate] = useState<File | null>(null);
  const [shopEstablishmentLicense, setShopEstablishmentLicense] = useState<File | null>(null);
  const [aadhaarCard, setAadhaarCard] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [cancelledCheque, setCancelledCheque] = useState<File | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [websiteOrAppUrl, setWebsiteOrAppUrl] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const user = getStoredUser();
    if (user?.phoneNumber) setPhoneNumber(user.phoneNumber);
    if (user?.email) setEmail(user.email);
  }, [router]);

  useEffect(() => {
    const repairEntityId = new URLSearchParams(window.location.search).get("repair_entity_id");
    if (!repairEntityId) return;
    setOrganizerId(repairEntityId);
    setClubId(new URLSearchParams(window.location.search).get("linked_club_id"));
    setStep(2);
  }, []);

  useEffect(() => {
    getClubCreationTerms()
      .then(setTerms)
      .catch(() => setTerms({ available: false, content: null, version: 0 }));
  }, []);

  useEffect(() => {
    if (!clubNameEdited) setClubName(companyName);
  }, [companyName, clubNameEdited]);

  useEffect(() => {
    if (!clubSlugEdited) setClubSlug(slugify(clubName));
  }, [clubName, clubSlugEdited]);

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!logo) {
      setError("Company logo is required.");
      return;
    }
    if (clubName.trim().length < 3) {
      setError("Add a club name of at least 3 characters.");
      return;
    }
    if (!terms?.available || !termsAccepted) {
      setError("Read and accept the current Repeak Club Terms & Conditions.");
      return;
    }
    setLoading(true);
    try {
      const logoUrl = await uploadImage(logo);
      const pair = await createClubOrganizerPair(
        {
          name: clubName.trim(),
          slug: clubSlug.trim() || slugify(clubName),
          city: clubCity.trim() || undefined,
          country: clubCountry.trim() || undefined,
          description: clubDescription.trim() || undefined,
          logoUrl,
          requiresApproval: false,
          membershipRequiresPayment: false,
          termsAccepted: true,
          termsVersion: terms.version,
        },
        {
          name: name.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim(),
          companyName: companyName.trim(),
        },
      );
      setOrganizerId(pair.organizer.id);
      setClubId(pair.club.id);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not submit your application.",
      );
    } finally {
      setLoading(false);
    }
  }

  function validateBank(): string | null {
    if (!accountNumber || !ifscCode || !bankName) {
      return "Bank account number, IFSC code, and bank name are required for the linked Club.";
    }
    if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
      return "Account number should be 9-18 digits.";
    }
    if (!IFSC_PATTERN.test(ifscCode)) {
      return "IFSC code looks invalid (e.g. HDFC0001234).";
    }
    if (!bankName.trim()) {
      return "Bank name is required if you're adding bank details.";
    }
    return null;
  }

  async function submitKyc(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!businessRegistrationCertificate || !panCard) {
      setError("Business registration certificate and PAN card are required to submit documents.");
      return;
    }
    const bankError = validateBank();
    if (bankError) {
      setError(bankError);
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("businessRegistrationCertificate", businessRegistrationCertificate);
      form.append("panCard", panCard);
      if (gstRegistrationCertificate) form.append("gstRegistrationCertificate", gstRegistrationCertificate);
      if (shopEstablishmentLicense) form.append("shopEstablishmentLicense", shopEstablishmentLicense);
      if (aadhaarCard) form.append("aadhaarCard", aadhaarCard);
      if (addressProof) form.append("addressProof", addressProof);
      if (cancelledCheque) form.append("cancelledCheque", cancelledCheque);
      if (accountNumber) form.append("bankAccountDetails[accountNumber]", accountNumber);
      if (ifscCode) form.append("bankAccountDetails[ifscCode]", ifscCode);
      if (bankName) form.append("bankAccountDetails[bankName]", bankName);
      if (branchName) form.append("bankAccountDetails[branchName]", branchName);
      if (websiteOrAppUrl) form.append("websiteOrAppUrl", websiteOrAppUrl);
      if (businessDescription) form.append("businessDescription", businessDescription);

      await api(`/v2/organizers/${organizerId}/business-kyc`, {
        method: "PATCH",
        headers: {},
        body: form,
      });
      if (clubId) {
        const existingClubKyc = await getClubKyc(clubId);
        if (!existingClubKyc || ["PENDING", "REJECTED", "RESUBMIT"].includes(existingClubKyc.state)) {
          await upsertClubKyc(clubId, {
            identityProof: aadhaarCard || businessRegistrationCertificate,
            panCard,
            addressProof,
            cancelledCheque,
            accountHolderName: companyName.trim() || name.trim(),
            accountNumber,
            ifscCode,
            bankName,
            branchName,
            contactEmail: email.trim(),
            contactPhone: phoneNumber.trim(),
          });
        }
      }
      setStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not submit your documents.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setError(null);
    setLoading(true);
    try {
      await mintAndRedirect("ORGANIZER", organizerId!);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not activate Organizer Manager.");
      setLoading(false);
    }
  }

  const currentStepId = STEPS[step - 1].id;
  const progressSteps = useMemo(
    () => STEPS.map((s, i) => ({ id: s.id, label: s.label, complete: i + 1 < step })),
    [step],
  );

  return (
    <div className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <ProductHeader
          eyebrow="Activate"
          title="Organizer"
          description="Create the linked Organizer and Club workspaces, submit Organizer KYC, then finish the Club profile separately in Club Manager."
          breadcrumbs={[{ label: "Home", href: "/home" }, { label: "Organizer" }]}
          backLink={{ label: "Back", href: "/home" }}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
        <div style={{ marginBottom: 20 }}>
          <OMProgressSteps steps={progressSteps} current={currentStepId} ariaLabel="Onboarding progress" />
        </div>

        {step === 1 && (
          <OMCard
            title="Organizer and club"
            description="One identity owns both workspaces. Existing account details are linked instead of duplicated."
          >
            <form onSubmit={submitAccount} className="flex flex-col gap-1">
              <OMFieldGroup>
                <OMField label="Your name" required>
                  <OMInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </OMField>
                <OMField label="Phone number" required>
                  <OMInput
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </OMField>
                <OMField label="Email" required>
                  <OMInput
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </OMField>
                <OMField label="Company name" required>
                  <OMInput
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Trailhead Sports Pvt. Ltd."
                  />
                </OMField>
                <OMField label="Company logo" required help="PNG or JPG — shown on your event pages.">
                  <OMFileInput accept="image/*" required onChange={setLogo} />
                </OMField>
              </OMFieldGroup>

              <div className="mt-5 border-t border-border pt-5">
                <p className="m-0 text-sm font-semibold text-text-primary">Companion club</p>
                <p className="mb-4 mt-1 text-xs leading-5 text-text-tertiary">
                  Your club is created with the Organizer account and shares its approval decision.
                </p>
                <OMFieldGroup>
                  <OMField label="Club name" required>
                    <OMInput
                      required
                      minLength={3}
                      value={clubName}
                      onChange={(e) => {
                        setClubNameEdited(true);
                        setClubName(e.target.value);
                      }}
                    />
                  </OMField>
                  <OMField label="Club page URL" help="repeak.in/clubs/…">
                    <OMInput
                      value={clubSlug}
                      onChange={(e) => {
                        setClubSlugEdited(true);
                        setClubSlug(e.target.value);
                      }}
                    />
                  </OMField>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <OMField label="City" help="Optional">
                      <OMInput value={clubCity} onChange={(e) => setClubCity(e.target.value)} />
                    </OMField>
                    <OMField label="Country" help="Optional">
                      <OMInput value={clubCountry} onChange={(e) => setClubCountry(e.target.value)} />
                    </OMField>
                  </div>
                  <OMField label="Club description" help="Optional">
                    <OMTextarea rows={3} value={clubDescription} onChange={(e) => setClubDescription(e.target.value)} />
                  </OMField>
                </OMFieldGroup>
              </div>

              {terms?.available && terms.content ? (
                <div className="mt-4 overflow-hidden rounded-rp-sm border border-border">
                  <div className="max-h-44 overflow-y-auto whitespace-pre-wrap p-3 text-xs leading-relaxed text-text-secondary">{terms.content}</div>
                  <label className="flex cursor-pointer items-start gap-2 border-t border-border p-3 text-xs font-semibold text-text-primary">
                    <input className="mt-0.5" type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                    <span>I accept the Repeak Club Terms &amp; Conditions (version {terms.version}).</span>
                  </label>
                </div>
              ) : (
                <div className="mt-4"><Callout tone="danger" description="Club creation is paused until Repeak publishes the Club Terms & Conditions." /></div>
              )}

              {error && <div className="mt-3"><Callout tone="danger" description={error} /></div>}

              <div className="mt-4">
                <OMButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {loading ? "Submitting…" : "Continue"}
                </OMButton>
              </div>
            </form>
          </OMCard>
        )}

        {step === 2 && (
          <OMCard
            title="Business KYC"
            description="Required documents help us verify your business faster. You can also finish this later from Organizer Manager."
          >
            <form onSubmit={submitKyc} className="flex flex-col gap-1">
              <OMFieldGroup>
                <OMField label="Business registration certificate" required>
                  <OMFileInput required onChange={setBusinessRegistrationCertificate} />
                </OMField>
                <OMField label="PAN card" required>
                  <OMFileInput required onChange={setPanCard} />
                </OMField>
                <OMField label="GST registration certificate" help="Optional — if applicable">
                  <OMFileInput onChange={setGstRegistrationCertificate} />
                </OMField>
                <OMField label="Shop establishment license" help="Optional">
                  <OMFileInput onChange={setShopEstablishmentLicense} />
                </OMField>
                <OMField label="Aadhaar card" help="Optional">
                  <OMFileInput onChange={setAadhaarCard} />
                </OMField>
                <OMField label="Address proof" help="Optional">
                  <OMFileInput onChange={setAddressProof} />
                </OMField>
                <OMField label="Cancelled cheque" help="Optional">
                  <OMFileInput onChange={setCancelledCheque} />
                </OMField>
              </OMFieldGroup>

              <div style={{ marginTop: 8 }}>
                <OMCard
                  as="section"
                  elevation="flat"
                  padding="none"
                  className="om-card--inset"
                  title="Bank account"
                  description="Optional — add now or set it up later from Organizer Manager."
                >
                  <OMFieldGroup>
                    <OMField label="Account number">
                      <OMInput
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
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
                    <OMField label="Branch name">
                      <OMInput value={branchName} onChange={(e) => setBranchName(e.target.value)} />
                    </OMField>
                  </OMFieldGroup>
                </OMCard>
              </div>

              <div style={{ marginTop: 8 }}>
                <OMFieldGroup>
                  <OMField label="Website or app URL" help="Optional">
                    <OMInput
                      type="url"
                      placeholder="https://"
                      value={websiteOrAppUrl}
                      onChange={(e) => setWebsiteOrAppUrl(e.target.value)}
                    />
                  </OMField>
                  <OMField label="Business description" help="Optional">
                    <OMTextarea
                      rows={3}
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                    />
                  </OMField>
                </OMFieldGroup>
              </div>

              {error && <div className="mt-3"><Callout tone="danger" description={error} /></div>}

              <div className="mt-4 flex gap-3">
                <OMButton
                  type="button"
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled={loading}
                  onClick={() => setStep(3)}
                >
                  I&apos;ll do this later
                </OMButton>
                <OMButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {loading ? "Submitting…" : "Submit documents"}
                </OMButton>
              </div>
            </form>
          </OMCard>
        )}

        {step === 3 && (
          <OMCard title="You're almost done">
            <p style={{ fontSize: 13, color: "var(--rp-text-tertiary)", lineHeight: 1.6, margin: 0 }}>
              Your Organizer and Club accounts are linked. Repeak can now review
              the Organizer application; the Club remains a draft until you
              complete its public profile and submit it from Club Manager.
            </p>
            {error && <div className="mt-1"><Callout tone="danger" description={error} /></div>}
            <div className="mt-2">
              <OMButton variant="primary" size="lg" fullWidth loading={loading} onClick={finish}>
                {loading ? "Opening…" : "Go to Organizer Manager"}
              </OMButton>
            </div>
          </OMCard>
        )}
        </div>

        <aside className="flex flex-col gap-4">
          <RequirementList
            description="Have these ready before you start — it makes the review faster."
            items={[
              { label: "Full name & phone number", required: true },
              { label: "Company name & logo", required: true },
              { label: "Business registration certificate", required: true },
              { label: "PAN card", required: true },
              { label: "GST registration certificate", required: false, note: "If your business is GST-registered" },
              { label: "Bank account details", required: false, note: "Can be added later from Organizer Manager" },
            ]}
          />
          <NumberedSteps
            steps={[
              { label: "Create both workspaces", description: "Organizer identity, company profile, and companion club." },
              { label: "Submit business KYC", description: "Registration, PAN, and optional supporting documents." },
              { label: "Repeak reviews the Organizer", description: "Typically within one business day." },
              { label: "Finish the Club separately", description: "Complete its required profile and PAN verification in Club Manager." },
            ]}
          />
          <SupportCard description="Questions about KYC or which documents you need? Reach out to Repeak support any time." />
        </aside>
        </div>
      </div>
    </div>
  );
}
