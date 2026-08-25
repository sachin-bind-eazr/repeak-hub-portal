"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { mintAndRedirect } from "@/lib/activation";
import { OMCard } from "@/components/om/OMCard";
import { OMField, OMFieldGroup, OMInput, OMTextarea } from "@/components/om/OMField";
import { OMButton } from "@/components/om/OMButton";
import { OMProgressSteps } from "@/components/om/OMProgress";
import { ProductHeader } from "@/components/om/ProductHeader";
import { Callout } from "@/components/om/Callout";
import { RequirementList, NumberedSteps, SupportCard } from "@/components/om/Aside";

interface ApplyBrandResponse {
  brand: { id: string; name: string };
  account: { accountId: string; accessLevel: string; status: string };
}

const STEPS = [
  { id: "details", label: "Brand details" },
  { id: "submitted", label: "Submitted" },
];

export default function ActivateBrandPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [categories, setCategories] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<ApplyBrandResponse>("/v2/sponsor/brands/apply", {
        method: "POST",
        body: JSON.stringify({
          name,
          contactEmail: contactEmail || undefined,
          websiteUrl: websiteUrl || undefined,
          categories: categories
            ? categories.split(",").map((c) => c.trim()).filter(Boolean)
            : undefined,
          description: description || undefined,
        }),
      });
      setBrandId(res.brand.id);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not submit your application.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setError(null);
    setLoading(true);
    try {
      await mintAndRedirect("BRAND", brandId!);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not activate Brand Manager.");
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
          title="Brand"
          description="Submit your brand for review. You'll get Brand Manager access — profile setup, KYC, and audience tools — once an admin approves."
          breadcrumbs={[{ label: "Home", href: "/home" }, { label: "Brand" }]}
          backLink={{ label: "Back", href: "/home" }}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
        <div style={{ marginBottom: 20 }}>
          <OMProgressSteps steps={progressSteps} current={currentStepId} ariaLabel="Application progress" />
        </div>

        {step === 1 && (
          <OMCard
            title="Brand details"
            description="Tell us about the brand — this is what reviewers and, once approved, your audience will see."
          >
            <form onSubmit={submit} className="flex flex-col gap-1">
              <OMFieldGroup>
                <OMField label="Brand name" required>
                  <OMInput
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Trailhead Apparel"
                  />
                </OMField>
                <OMField label="Contact email" help="Optional — defaults to your account email">
                  <OMInput
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </OMField>
                <OMField label="Website" help="Optional">
                  <OMInput
                    type="url"
                    placeholder="https://"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </OMField>
                <OMField label="Categories" help="Comma-separated, e.g. Running, Apparel">
                  <OMInput value={categories} onChange={(e) => setCategories(e.target.value)} />
                </OMField>
                <OMField label="Description" help="Optional — a couple of sentences about the brand">
                  <OMTextarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </OMField>
              </OMFieldGroup>

              {error && <div className="mt-3"><Callout tone="danger" description={error} /></div>}

              <div className="mt-4">
                <OMButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                  {loading ? "Submitting…" : "Submit application"}
                </OMButton>
              </div>
            </form>
          </OMCard>
        )}

        {step === 2 && (
          <OMCard title="Application submitted">
            <p style={{ fontSize: 13, color: "var(--rp-text-tertiary)", lineHeight: 1.6, margin: 0 }}>
              You&apos;ll get full Brand Manager access — including profile
              setup, KYC, and audience tools — once an admin approves your
              brand. You can check status any time from the Hub.
            </p>
            {error && <div className="mt-1"><Callout tone="danger" description={error} /></div>}
            <div className="mt-2">
              <OMButton variant="primary" size="lg" fullWidth loading={loading} onClick={finish}>
                {loading ? "Opening…" : "Continue to Brand Manager"}
              </OMButton>
            </div>
          </OMCard>
        )}
        </div>

        <aside className="flex flex-col gap-4">
          <RequirementList
            description="Have these ready before you start — it makes review faster."
            items={[
              { label: "Brand name", required: true },
              { label: "Contact email", required: false, note: "Defaults to your account email" },
              { label: "Website", required: false },
              { label: "Categories", required: false, note: "e.g. Running, Apparel" },
            ]}
          />
          <NumberedSteps
            steps={[
              { label: "Submit brand details", description: "Name, contact, website, and categories." },
              { label: "Repeak reviews", description: "Typically within one business day." },
              { label: "Brand Manager unlocks", description: "Profile setup, KYC, campaigns, and audience tools." },
            ]}
          />
          <SupportCard description="Questions about sponsorship or brand review? Reach out to Repeak support any time." />
        </aside>
        </div>
      </div>
    </div>
  );
}
