import type { Metadata } from "next";

import { WizardShell } from "@/components/offer-wizard/wizard-shell";
import { repo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Ücretsiz Teklif",
  description:
    "Çatı, arazi veya işletme için güneş enerjisi sistemi keşfi. 2 dakikada tamamlanan teklif formu.",
};

export default async function TeklifAlPage() {
  const settings = await repo.getSettings();
  const whatsappNumber = settings.whatsappNumber?.trim() ? settings.whatsappNumber : null;
  return <WizardShell whatsappNumber={whatsappNumber} />;
}
