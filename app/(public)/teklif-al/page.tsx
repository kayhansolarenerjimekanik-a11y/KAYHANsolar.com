import type { Metadata } from "next";

import { WizardShell } from "@/components/offer-wizard/wizard-shell";

export const metadata: Metadata = {
  title: "Ücretsiz Teklif",
  description:
    "Çatı, arazi veya işletme için güneş enerjisi sistemi keşfi. 2 dakikada tamamlanan teklif formu.",
};

export default function TeklifAlPage() {
  return <WizardShell />;
}
