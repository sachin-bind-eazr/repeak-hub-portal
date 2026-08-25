"use client";

/**
 * Pill-style step list shared by the Activate wizards and the Details
 * page's "onboarding progress" block. Mirrors the visual language of
 * OMProgressSteps / ClubProgressSteps in web-partner-portal (pills,
 * never numbered circles) without importing across apps.
 */

export interface OnboardingStep {
  label: string;
  state: "complete" | "current" | "upcoming";
}

export function OnboardingSteps({ steps }: { steps: OnboardingStep[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-rp-pill px-3 py-1 text-xs font-semibold ${
              step.state === "complete"
                ? "bg-success-bg text-success-fg"
                : step.state === "current"
                  ? "bg-primary text-primary-fg"
                  : "bg-surface-muted text-text-tertiary"
            }`}
          >
            {step.state === "complete" ? "✓" : i + 1} {step.label}
          </span>
          {i < steps.length - 1 && (
            <span className="h-px w-4 bg-border" aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  );
}
