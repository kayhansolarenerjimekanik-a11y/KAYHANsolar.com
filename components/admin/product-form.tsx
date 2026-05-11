"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { MediaListEditor } from "@/components/admin/media-list-editor";
import { SpecsEditor } from "@/components/admin/specs-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { Category, Product, ProductBadge } from "@/types";

import type { ProductActionState } from "@/app/(admin)/kayhan-yonetim/actions/products";

interface ProductFormProps {
  initial?: Product;
  categories: Category[];
  action: (state: ProductActionState, fd: FormData) => Promise<ProductActionState>;
  submitLabel: string;
}

const ALL_BADGES: { value: ProductBadge; label: string }[] = [
  { value: "kargo_bedava", label: "Kargo Bedava" },
  { value: "yeni", label: "Yeni" },
  { value: "tercih_edilen", label: "Tercih Edilen" },
  { value: "5_yil_garanti", label: "5 Yıl Garanti" },
  { value: "10_yil_garanti", label: "10 Yıl Garanti" },
  { value: "stokta_son", label: "Stokta Son" },
];

export function ProductForm({ initial, categories, action, submitLabel }: ProductFormProps) {
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(
    action,
    {},
  );

  const errFor = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Temel Bilgiler</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">Ürün adı</Label>
            <Input id="name" name="name" defaultValue={initial?.name} required />
            {errFor("name") && <p className="text-xs text-danger">{errFor("name")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" name="slug" defaultValue={initial?.slug} placeholder="ornegin-jinko-550w" required />
            {errFor("slug") && <p className="text-xs text-danger">{errFor("slug")}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Marka</Label>
            <Input id="brand" name="brand" defaultValue={initial?.brand ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="shortDescription">Kısa açıklama</Label>
            <Input
              id="shortDescription"
              name="shortDescription"
              defaultValue={initial?.shortDescription}
              maxLength={160}
              required
            />
            {errFor("shortDescription") && (
              <p className="text-xs text-danger">{errFor("shortDescription")}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="longDescription">Detaylı açıklama</Label>
            <Textarea
              id="longDescription"
              name="longDescription"
              rows={5}
              defaultValue={initial?.longDescription ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoryId">Kategori</Label>
            <Select id="categoryId" name="categoryId" defaultValue={initial?.categoryId ?? ""} required>
              <option value="">Seçin</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errFor("categoryId") && (
              <p className="text-xs text-danger">{errFor("categoryId")}</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Fiyatlandırma & Stok</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="supplierUrl">Tedarikçi URL</Label>
            <Input id="supplierUrl" name="supplierUrl" defaultValue={initial?.supplierUrl ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="supplierPrice">Tedarikçi fiyatı</Label>
            <Input
              id="supplierPrice"
              name="supplierPrice"
              type="number"
              step="0.01"
              defaultValue={initial?.supplierPrice ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="markupPercentage">Kar marjı (%)</Label>
            <Input
              id="markupPercentage"
              name="markupPercentage"
              type="number"
              step="1"
              defaultValue={initial?.markupPercentage ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currentPrice">Satış fiyatı (₺)</Label>
            <Input
              id="currentPrice"
              name="currentPrice"
              type="number"
              step="0.01"
              defaultValue={initial?.currentPrice ?? ""}
              required
            />
            {errFor("currentPrice") && (
              <p className="text-xs text-danger">{errFor("currentPrice")}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compareAtPrice">Eski fiyat (üstü çizili)</Label>
            <Input
              id="compareAtPrice"
              name="compareAtPrice"
              type="number"
              step="0.01"
              defaultValue={initial?.compareAtPrice ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stockQuantity">Stok adedi</Label>
            <Input
              id="stockQuantity"
              name="stockQuantity"
              type="number"
              step="1"
              defaultValue={initial?.stockQuantity ?? 0}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lowStockThreshold">Düşük stok eşiği</Label>
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              step="1"
              defaultValue={initial?.lowStockThreshold ?? 3}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Medya</h2>
        <p className="mt-1 text-xs text-muted">En az 1 görsel ekleyin.</p>
        <div className="mt-4">
          <MediaListEditor name="media" initial={initial?.media ?? []} />
          {errFor("media") && <p className="mt-2 text-xs text-danger">{errFor("media")}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Teknik Özellikler</h2>
        <div className="mt-4">
          <SpecsEditor name="technicalSpecs" initial={initial?.technicalSpecs ?? {}} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Etiketler & Görünürlük</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <fieldset className="rounded-xl border border-border bg-elevated p-3">
            <legend className="px-1 text-xs font-medium text-muted">Etiketler</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {ALL_BADGES.map((b) => (
                <label key={b.value} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="badges_options"
                    value={b.value}
                    defaultChecked={initial?.badges?.includes(b.value)}
                    className="h-4 w-4 accent-lime-primary"
                  />
                  {b.label}
                </label>
              ))}
            </div>
            <input
              type="hidden"
              name="badges"
              defaultValue={JSON.stringify(initial?.badges ?? [])}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(){
                  const form = document.currentScript.closest('form');
                  if (!form) return;
                  const hidden = form.querySelector('input[name="badges"]');
                  const boxes = form.querySelectorAll('input[name="badges_options"]');
                  const sync = () => { hidden.value = JSON.stringify(Array.from(boxes).filter(b=>b.checked).map(b=>b.value)); };
                  boxes.forEach(b => b.addEventListener('change', sync));
                })();`,
              }}
            />
          </fieldset>

          <div className="space-y-3 rounded-xl border border-border bg-elevated p-3">
            <Switch
              id="isActive"
              name="isActive"
              label="Aktif (yayında)"
              defaultChecked={initial?.isActive ?? true}
            />
            <Switch
              id="isFeatured"
              name="isFeatured"
              label="Anasayfada öne çıkar"
              defaultChecked={initial?.isFeatured ?? false}
            />
            <Switch
              id="isNewArrival"
              name="isNewArrival"
              label="Yeni gelen"
              defaultChecked={initial?.isNewArrival ?? false}
            />
          </div>
        </div>
      </section>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/kayhan-yonetim/urunler">
          <Button type="button" variant="outline">İptal</Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
