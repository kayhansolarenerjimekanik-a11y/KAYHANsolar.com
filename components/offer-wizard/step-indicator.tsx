import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  STEP_LABELS,
  STEP_ORDER,
  type WizardStepId,
} from "@/types/offer-wizard";

interface Props {
  current: WizardStepId;
}

export function StepIndicator({ current }: Props) {
  const countedSteps = STEP_ORDER.filter(
    (s): s is Exclude<WizardStepId, "success"> => s !== "success",
  );
  const currentIndex = countedSteps.indexOf(
    current as Exclude<WizardStepId, "success">,
  );
  const total = countedSteps.length;

  return (
    <div className="space-y-3">
      {currentIndex >= 0 && (
        <p className="text-xs font-medium tracking-wide text-muted">
          <span className="tabular-nums text-foreground">
            Adım {currentIndex + 1}/{total}
          </span>{" "}
          — {STEP_LABELS[current]}
        </p>
      )}

      <nav aria-label="Adım göstergesi" className="overflow-x-auto">
        <ol className="flex min-w-fit items-center gap-2">
          {countedSteps.map((id, idx) => {
            const isCurrent = idx === currentIndex;
            const isDone = idx < currentIndex;
            return (
              <li key={id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    isDone
                      ? "bg-lime-primary text-black"
                      : isCurrent
                        ? "bg-foreground text-background"
                        : "bg-elevated text-muted",
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.4} /> : idx + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:inline",
                    isCurrent ? "text-foreground" : "text-muted",
                  )}
                >
                  {STEP_LABELS[id]}
                </span>
                {idx < countedSteps.length - 1 && (
                  <span
                    className={cn(
                      "h-px w-6 sm:w-12",
                      isDone ? "bg-lime-primary" : "bg-border",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
