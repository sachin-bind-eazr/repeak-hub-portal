"use client";

import { Check } from "lucide-react";
import { OMIcon } from "./OMIcon";

export type OMProgressStep = {
  id: string;
  label: string;
  complete?: boolean;
};

export function OMProgressSteps({
  steps,
  current,
  ariaLabel = "Progress",
  testId,
}: {
  steps: OMProgressStep[];
  current?: string;
  ariaLabel?: string;
  testId?: string;
}) {
  return (
    <ol aria-label={ariaLabel} data-testid={testId} className="om-progress-steps">
      {steps.map((step, i) => {
        const isCurrent = step.id === current;
        const cls = [
          "om-progress-step",
          step.complete && !isCurrent ? "om-progress-step--complete" : null,
          isCurrent ? "om-progress-step--current" : null,
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <li key={step.id} className={cls} aria-current={isCurrent ? "step" : undefined}>
            {step.complete && !isCurrent ? (
              <OMIcon icon={Check} size={16} />
            ) : (
              <span className="om-progress-step__index">{i + 1}</span>
            )}
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
