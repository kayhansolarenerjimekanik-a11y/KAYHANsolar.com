"use client";

import { Container } from "@/components/ui/container";
import { StepConfirm } from "./step-confirm";
import { StepIndicator } from "./step-indicator";
import { StepLocation } from "./step-location";
import { StepPersonal } from "./step-personal";
import { StepSuccess } from "./step-success";
import { StepSystem } from "./step-system";
import { StepWelcome } from "./step-welcome";
import { useWizardState } from "./use-wizard-state";

interface Props {
  whatsappNumber: string | null;
}

export function WizardShell({ whatsappNumber }: Props) {
  const wizard = useWizardState();

  if (!wizard.hydrated) {
    return (
      <Container className="py-14">
        <div className="h-6 w-32 animate-pulse rounded-md bg-elevated" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-elevated" />
      </Container>
    );
  }

  return (
    <Container className="py-10 lg:py-14">
      {wizard.step !== "success" && (
        <div className="mb-8">
          <StepIndicator current={wizard.step} />
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        {wizard.step === "welcome" && <StepWelcome onNext={wizard.goNext} />}
        {wizard.step === "personal" && (
          <StepPersonal
            data={wizard.data}
            patch={wizard.patch}
            onNext={wizard.goNext}
            onPrev={wizard.goPrev}
          />
        )}
        {wizard.step === "location" && (
          <StepLocation
            data={wizard.data}
            patch={wizard.patch}
            onNext={wizard.goNext}
            onPrev={wizard.goPrev}
          />
        )}
        {wizard.step === "system" && (
          <StepSystem
            data={wizard.data}
            patch={wizard.patch}
            onNext={wizard.goNext}
            onPrev={wizard.goPrev}
          />
        )}
        {wizard.step === "confirm" && (
          <StepConfirm
            data={wizard.data}
            patch={wizard.patch}
            onPrev={wizard.goPrev}
            onSuccess={() => wizard.setStep("success")}
          />
        )}
        {wizard.step === "success" && (
          <StepSuccess
            onReset={wizard.reset}
            whatsappNumber={whatsappNumber}
            customerName={wizard.data.fullName}
          />
        )}
      </div>
    </Container>
  );
}
