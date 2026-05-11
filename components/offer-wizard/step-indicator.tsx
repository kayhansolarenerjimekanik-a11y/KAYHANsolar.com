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
  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <nav aria-label="Adım göstergesi" className="overflow-x-auto">
      <ol className="flex min-w-fit items-center gap-2">
        {STEP_ORDER.map((id, idx) => {
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
              {idx < STEP_ORDER.length - 1 && (
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
  );
}
