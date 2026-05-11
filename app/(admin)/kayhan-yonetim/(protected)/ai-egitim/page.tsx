import { Wand2 } from "lucide-react";

import { PagePlaceholder } from "@/components/shared/page-placeholder";

export default function AdminAITrainingPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <Wand2 className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Eğitim</h1>
          <p className="mt-1 text-sm text-muted">
            Müşteri asistanı için bilgi tabanı yönetimi.
          </p>
        </div>
      </header>
      <PagePlaceholder
        title="Yapay Zekâ Bilgi Tabanı"
        description="Gemini destekli müşteri asistanına PDF, doküman ve URL eklemek, embedding'leri yeniden oluşturmak ve test sandbox'ı Faz 5'te aktive edilecek."
        phase="Faz 5 — AI Asistan + Analitik"
      />
    </div>
  );
}
