"use client";

import { useEffect, useState } from "react";

import {
  INITIAL_WIZARD_STATE,
  STEP_ORDER,
  type WizardState,
  type WizardStepId,
} from "@/types/offer-wizard";

const STORAGE_KEY = "kayhan-offer-wizard";

interface PersistedState {
  step: WizardStepId;
  data: WizardState;
}

export function useWizardState() {
  const [step, setStepInternal] = useState<WizardStepId>("welcome");
  const [data, setData] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed.step && STEP_ORDER.includes(parsed.step)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStepInternal(parsed.step);
        }
        if (parsed.data) {
          setData({ ...INITIAL_WIZARD_STATE, ...parsed.data });
        }
      }
    } catch {
      // ignore — fresh start
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, data } satisfies PersistedState),
      );
    } catch {
      // quota or private mode — drop silently
    }
  }, [step, data, hydrated]);

  function setStep(next: WizardStepId) {
    setStepInternal(next);
  }

  function patch(partial: Partial<WizardState>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function reset() {
    setData(INITIAL_WIZARD_STATE);
    setStepInternal("welcome");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function goNext() {
    const i = STEP_ORDER.indexOf(step);
    if (i >= 0 && i < STEP_ORDER.length - 1) {
      setStepInternal(STEP_ORDER[i + 1]);
    }
  }

  function goPrev() {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStepInternal(STEP_ORDER[i - 1]);
  }

  return {
    step,
    data,
    hydrated,
    setStep,
    patch,
    reset,
    goNext,
    goPrev,
  };
}
