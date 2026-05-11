import { Wand2 } from "lucide-react";

import { AIKnowledgeList } from "@/components/admin/ai-knowledge-list";
import { AIKnowledgeUploader } from "@/components/admin/ai-knowledge-uploader";

export default function AdminAITrainingPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <Wand2 className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Eğitim</h1>
          <p className="mt-1 text-sm text-muted">
            Müşteri asistanının kullandığı bilgi tabanı. Yüklediğiniz her metin
            otomatik olarak parçalara bölünüp embedding&apos;leri oluşturulur.
          </p>
        </div>
      </header>

      <AIKnowledgeUploader />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Mevcut İçerikler</h2>
        <AIKnowledgeList />
      </section>
    </div>
  );
}
