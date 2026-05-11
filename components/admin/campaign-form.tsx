"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Campaign, Category } from "@/types";

import type { CampaignActionState } from "@/app/(admin)/kayhan-yonetim/actions/campaigns";

interface CampaignFormProps {
  initial?: Campaign;
  categories: Category[];
  action: (state: CampaignActionState, fd: FormData) => Promise<CampaignActionState>;
  submitLabel: string;
}

const RULE_LABELS: Record<string, string> = {
  percent_off: "Yüzde indirim",
  buy_x_get_y_discount: "N alana N+1. ürün indirimi",
  bundle_discount: "Bundle indirimi",
  free_shipping: "Kargo bedava",
  fixed_amount_off: "Sabit tutar indirim",
};

export function CampaignForm({ initial, categories, action, submitLabel }: CampaignFormProps) {
  const [state, formAction, pending] = useActionState<CampaignActionState, FormData>(action, {});
  const [ruleType, setRuleType] = useState<Campaign["ruleType"]>(initial?.ruleType ?? "percent_off");
  const [ruleConfig, setRuleConfig] = useState<string>(
    JSON.stringify(initial?.ruleConfig ?? {}, null, 2),
  );

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Genel</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Başlık</Label>
            <Input id="title" name="title" required defaultValue={initial?.title ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required defaultValue={initial?.slug ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bannerImageUrl">Banner görseli (URL)</Label>
            <Input id="bannerImageUrl" name="bannerImageUrl" defaultValue={initial?.bannerImageUrl ?? ""} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={initial?.description ?? ""} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Kural</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ruleType">Kural tipi</Label>
            <Select
              id="ruleType"
              name="ruleType"
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as Campaign["ruleType"])}
            >
              {Object.entries(RULE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="applicableTo">Uygulanacağı yer</Label>
            <Select
              id="applicableTo"
              name="applicableTo"
              defaultValue={initial?.applicableTo ?? "all"}
            >
              <option value="all">Tüm site</option>
              <option value="category">Belirli kategori(ler)</option>
              <option value="product">Belirli ürün(ler)</option>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ruleConfig">Konfigürasyon (JSON)</Label>
            <Textarea
              id="ruleConfig"
              name="ruleConfig"
              rows={5}
              className="font-mono text-xs"
              value={ruleConfig}
              onChange={(e) => setRuleConfig(e.target.value)}
            />
            <p className="text-xs text-muted">
              Örnek:{" "}
              <code className="rounded bg-elevated px-1 py-0.5">
                {'{"buyQuantity":4,"getQuantity":1,"discountPercent":70}'}
              </code>{" "}
              veya kargo bedava için boş{" "}
              <code className="rounded bg-elevated px-1 py-0.5">{"{}"}</code>.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="targetIds">
              Hedef ID&apos;ler (virgülle ayır, kategori veya ürün id&apos;leri)
            </Label>
            <Input
              id="targetIds"
              name="targetIds"
              defaultValue={initial?.targetIds?.join(",") ?? ""}
              placeholder="cat-panel,cat-battery"
            />
            <p className="text-xs text-muted">
              Mevcut kategoriler:{" "}
              {categories.map((c) => (
                <code key={c.id} className="mr-1 rounded bg-elevated px-1 py-0.5">
                  {c.id}
                </code>
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Zaman & Görünürlük</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Başlangıç</Label>
            <Input
              id="startDate"
              name="startDate"
              type="datetime-local"
              required
              defaultValue={initial?.startDate?.slice(0, 16) ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endDate">Bitiş (opsiyonel)</Label>
            <Input
              id="endDate"
              name="endDate"
              type="datetime-local"
              defaultValue={initial?.endDate?.slice(0, 16) ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayPriority">Sıralama önceliği</Label>
            <Input
              id="displayPriority"
              name="displayPriority"
              type="number"
              step="1"
              defaultValue={initial?.displayPriority ?? 0}
            />
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-elevated p-3">
            <Switch
              id="isActive"
              name="isActive"
              label="Aktif"
              defaultChecked={initial?.isActive ?? true}
            />
            <Switch
              id="displayOnHomepage"
              name="displayOnHomepage"
              label="Anasayfada göster"
              defaultChecked={initial?.displayOnHomepage ?? false}
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
        <Link href="/kayhan-yonetim/kampanyalar">
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
