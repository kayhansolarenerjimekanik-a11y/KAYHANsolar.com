export type WizardStepId =
  | "welcome"
  | "personal"
  | "location"
  | "system"
  | "confirm"
  | "success";

export interface WizardAppliance {
  name: string;
  powerW?: number;
  voltage?: number;
}

export interface WizardMediaRef {
  type: "image" | "video" | "document";
  url: string;
}

export interface WizardState {
  // step 2 — personal
  fullName: string;
  city: string;
  district: string;
  phone: string;
  email: string;

  // step 3 — location
  installationLocation: "roof" | "land" | "other";
  installationAddress: string;
  media: WizardMediaRef[];

  // step 4 — system
  appliances: WizardAppliance[];
  detailedDescription: string;

  // step 5 — consent
  kvkkAccepted: boolean;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  fullName: "",
  city: "",
  district: "",
  phone: "",
  email: "",
  installationLocation: "roof",
  installationAddress: "",
  media: [],
  appliances: [],
  detailedDescription: "",
  kvkkAccepted: false,
};

export const STEP_ORDER: WizardStepId[] = [
  "welcome",
  "personal",
  "location",
  "system",
  "confirm",
  "success",
];

export const STEP_LABELS: Record<WizardStepId, string> = {
  welcome: "Başlangıç",
  personal: "Bilgiler",
  location: "Kurulum Yeri",
  system: "İhtiyaç",
  confirm: "Onay",
  success: "Tamam",
};
