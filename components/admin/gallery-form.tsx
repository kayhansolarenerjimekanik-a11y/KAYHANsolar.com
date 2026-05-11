"use client";

import { Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  createGalleryAction,
  type GalleryActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type MediaDraft = {
  id?: string;
  type: "image" | "video";
  url: string;
  caption?: string;
};

export function GalleryCreateForm() {
  const [state, action, pending] = useActionState<GalleryActionState, FormData>(
    createGalleryAction,
    {},
  );
  const [media, setMedia] = useState<MediaDraft[]>([
    { type: "image", url: "" },
  ]);

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Proje Bilgileri</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Başlık</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required placeholder="diyarbakir-cati-10kw" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Lokasyon</Label>
            <Input id="location" name="location" placeholder="Diyarbakır, Türkiye" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="installationDate">Kurulum tarihi</Label>
            <Input id="installationDate" name="installationDate" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="systemPowerKw">Sistem gücü (kW)</Label>
            <Input id="systemPowerKw" name="systemPowerKw" type="number" step="0.1" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Switch
              id="isFeatured"
              name="isFeatured"
              label="Anasayfada öne çıkar"
              defaultChecked={false}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Medya</h2>
        <input type="hidden" name="media" value={JSON.stringify(media)} />
        <div className="mt-4 space-y-3">
          {media.map((m, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-border bg-elevated p-3 sm:grid-cols-[120px_1fr_1fr_auto]"
            >
              <Select
                value={m.type}
                onChange={(e) =>
                  setMedia((arr) =>
                    arr.map((x, j) =>
                      j === i ? { ...x, type: e.target.value as MediaDraft["type"] } : x,
                    ),
                  )
                }
              >
                <option value="image">Görsel</option>
                <option value="video">Video</option>
              </Select>
              <Input
                placeholder="URL"
                value={m.url}
                onChange={(e) =>
                  setMedia((arr) =>
                    arr.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Açıklama (ops.)"
                value={m.caption ?? ""}
                onChange={(e) =>
                  setMedia((arr) =>
                    arr.map((x, j) =>
                      j === i ? { ...x, caption: e.target.value } : x,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Kaldır"
                onClick={() =>
                  setMedia((arr) => arr.filter((_, j) => j !== i))
                }
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMedia((arr) => [...arr, { type: "image", url: "" }])}
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            Medya Ekle
          </Button>
        </div>
      </section>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/kayhan-yonetim/galeri">
          <Button type="button" variant="outline">İptal</Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : "Projeyi Kaydet"}
        </Button>
      </div>
    </form>
  );
}
