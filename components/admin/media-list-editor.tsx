"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

import type { ProductMedia } from "@/types";

interface MediaListEditorProps {
  name: string;
  initial: ProductMedia[];
}

export function MediaListEditor({ name, initial }: MediaListEditorProps) {
  const [items, setItems] = useState<ProductMedia[]>(initial);

  const add = () =>
    setItems((x) => [
      ...x,
      { id: `tmp-${Date.now()}`, type: "image", url: "", altText: "" },
    ]);

  const remove = (idx: number) =>
    setItems((x) => x.filter((_, i) => i !== idx));

  const update = (idx: number, patch: Partial<ProductMedia>) =>
    setItems((x) => x.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      {items.map((m, i) => (
        <div
          key={m.id ?? i}
          className="grid gap-2 rounded-xl border border-border bg-elevated p-3 sm:grid-cols-[120px_1fr_1fr_auto]"
        >
          <Select value={m.type} onChange={(e) => update(i, { type: e.target.value as ProductMedia["type"] })}>
            <option value="image">Görsel</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
          </Select>
          <Input
            placeholder="URL"
            value={m.url}
            onChange={(e) => update(i, { url: e.target.value })}
          />
          <Input
            placeholder="Alt metin (opsiyonel)"
            value={m.altText ?? ""}
            onChange={(e) => update(i, { altText: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Kaldır"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" strokeWidth={2.2} />
        Medya Ekle
      </Button>
      <Label className="mt-2 block">
        Görsel/video/PDF URL&apos;i yapıştırın. Disk&apos;ten yükleme yakında.
      </Label>
    </div>
  );
}
