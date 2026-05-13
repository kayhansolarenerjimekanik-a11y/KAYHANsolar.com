"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { MediaListEditor } from "@/components/admin/media-list-editor";
import { SpecsEditor } from "@/components/admin/specs-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { Category, Product } from "@/types";

import { deriveBadges } from "@/lib/products/badges";
import { productBadgeLabels } from "@/lib/mock/data";

import type { ProductActionState } from "@/app/(admin)/kayhan-yonetim/actions/products";

interface ProductFormProps {
  initial?: Product;
  categories: Category[];
  action: (state: ProductActionState, fd: FormData) => Promise<ProductActionState>;
  submitLabel: string;
}


export function ProductForm({ initial, categories, action, submitLabel }: ProductFormProps) {
  const [state, formAction, pending] = useActionState<ProductActionState, FormData>(
    action,
    {},
  );

  const [hasFreeShipping, setHasFreeShipping] = useState<boolean>(
    initial?.hasFreeShipping ?? false,
  );
  const [warrantyYears, setWarrantyYears] = useState<string>(
    initial?.warrantyYears != null ? String(initial.warrantyYears) : "",
  );
  const [isFeatured, setIsFeatured] = useState<boolean>(
    initial?.isFeatured ?? false,
  );
  const [isNewArrival, setIsNewArrival] = useState<boolean>(
    initial?.isNewArrival ?? false,
  );
  const [stockQuantity, setStockQuantity] = useState<string>(
    String(initial?.stockQuantity ?? 0),
  );
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(
    String(initial?.lowStockThreshold ?? 3),
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="metaTitle">SEO başlığı (opsiyonel)</Label>
            <Input
              id="metaTitle"
              name="metaTitle"
              defaultValue={initial?.metaTitle ?? ""}
              maxLength={120}
              placeholder="Boş bırakılırsa ürün adı kullanılır"
            />
            {errFor("metaTitle") && (
              <p className="text-xs text-danger">{errFor("metaTitle")}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="metaDescription">SEO açıklaması (opsiyonel)</Label>
            <Textarea
              id="metaDescription"
              name="metaDescription"
              rows={2}
              defaultValue={initial?.metaDescription ?? ""}
              maxLength={320}
              placeholder="Arama sonuçlarında görünecek metin. Boşsa kısa açıklama kullanılır."
            />
            {errFor("metaDescription") && (
              <p className="text-xs text-danger">{errFor("metaDescription")}</p>
            )}
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
              min={0}
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lowStockThreshold">Düşük stok eşiği</Label>
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              min={0}
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
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
            <legend className="px-1 text-xs font-medium text-muted">Etiket Kaynakları</legend>
            <div className="mt-2 space-y-3">
              <Switch
                id="hasFreeShipping"
                name="hasFreeShipping"
                label="Kargo bedava"
                checked={hasFreeShipping}
                onChange={(e) => setHasFreeShipping(e.target.checked)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="warrantyYears">Garanti (yıl)</Label>
                <Input
                  id="warrantyYears"
                  name="warrantyYears"
                  type="number"
                  min={0}
                  max={20}
                  value={warrantyYears}
                  onChange={(e) => setWarrantyYears(e.target.value)}
                  placeholder="Örn. 5 veya 10"
                />
                <p className="text-[10px] text-subtle">5 veya 10 yazılırsa garanti etiketi görünür. Boş bırakırsanız etiket yok.</p>
              </div>
            </div>
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
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            <Switch
              id="isNewArrival"
              name="isNewArrival"
              label="Yeni gelen"
              checked={isNewArrival}
              onChange={(e) => setIsNewArrival(e.target.checked)}
            />
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-elevated p-3 text-xs">
        <span className="font-medium text-muted">Önizleme — kaydedince görünecek etiketler:</span>{" "}
        {(() => {
          const previewBadges = deriveBadges({
            hasFreeShipping,
            isFeatured,
            isNewArrival,
            stockQuantity: Number(stockQuantity) || 0,
            lowStockThreshold: Number(lowStockThreshold) || 3,
            warrantyYears: warrantyYears === "" ? null : Number(warrantyYears),
          });
          if (previewBadges.length === 0) {
            return <span className="italic text-subtle">(etiket yok)</span>;
          }
          return previewBadges.map((b) => productBadgeLabels[b]).join(" · ");
        })()}
      </div>

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
