"use client";

import { Upload } from "lucide-react";
import { useActionState } from "react";

import {
  uploadKnowledgeAction,
  type AIKnowledgeActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/ai-knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AIKnowledgeUploader() {
  const [state, action, pending] = useActionState<AIKnowledgeActionState, FormData>(
    uploadKnowledgeAction,
    {},
  );

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header>
        <h2 className="text-sm font-semibold tracking-tight">Yeni İçerik Ekle</h2>
        <p className="mt-1 text-xs text-muted">
          Metin otomatik olarak parçalara bölünür, embedding&apos;leri oluşturulur ve
          AI&apos;ın referans verebilmesi için kaydedilir.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="title">Başlık</Label>
        <Input id="title" name="title" required maxLength={200} placeholder="Örn: Garanti Şartları" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">İçerik</Label>
        <Textarea
          id="body"
          name="body"
          rows={10}
          required
          minLength={20}
          maxLength={50000}
          placeholder="Bilgi tabanına eklenecek metin..."
        />
      </div>

      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.successMessage && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {state.successMessage}
        </p>
      )}

      <Button type="submit" disabled={pending} variant="primary">
        <Upload className="h-4 w-4" strokeWidth={2.4} />
        {pending ? "Embed ediliyor..." : "Yükle ve Embed Et"}
      </Button>
    </form>
  );
}
