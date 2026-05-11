# Faz 4 — Gelişmiş Özellikler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship customer-facing depth — multi-step teklif formu, galeri detay sayfaları, site arama, kampanya kurallarının sepette gerçek uygulanması, stok bildirimi altyapısı (Web Push + email kaydı), SEO temel taşları (sitemap, robots, JSON-LD), ve env-driven Cloudflare Turnstile placeholder.

**Architecture:**
- **Wizard form** state with React Hook Form + localStorage persistence, per-step Zod validation, demo media URL pattern (real upload comes with Supabase Storage)
- **Pure campaign rule engine** (`lib/campaigns/`) — deterministic functions take cart + campaigns → return cart with discount lines. Same engine runs server- and client-side
- **Stock notification repository** — same demo/supabase swappable pattern; Web Push subscription stored as JSON; demo dispatch is a toast, real dispatch uses Resend + `web-push` later
- **Search** lives entirely on the client over the repo'd catalog snapshot; SSR keeps SEO benefits via real product pages
- **SEO file conventions** — `app/sitemap.ts` and `app/robots.ts` (Next.js built-in)
- **Env-driven services** (Turnstile, Web Push VAPID) — components/utilities check env vars; missing keys means "demo passthrough"

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React Hook Form + Zod, Tailwind v4, Web Push API (browser), Sonner toasts. **No new heavy deps** — uses what's already installed.

**Master plan reference:** §6.5 (Teklif Al), §6.6 (Galeri), §6.4 (Kampanyalar), §9 (Stok bildirimi), §12 (Güvenlik / KVKK), §15.x (Faz 4 takvimi).

---

## Sub-Phase Breakdown

Execute in order. Each sub-phase is a deployable checkpoint.

| Sub-phase | Tasks | Outcome |
|---|---|---|
| **4A — Multi-step Teklif Formu** | 1–8 | `/teklif-al` 6-adımlı wizard çalışıyor, repo'ya kaydediyor, admin bildirimi tetikliyor |
| **4B — Galeri Detay + Arama + SEO** | 9–14 | `/galeri/[slug]`, Cmd+K arama dialog, sitemap.xml, robots.txt, Product JSON-LD |
| **4C — Sepet Kampanyaları + Stok Bildirimi** | 15–20 | Sepet kampanya kurallarını uyguluyor, "gelince haber ver" gerçek subscription kaydediyor, admin görüyor |
| **4D — Güvenlik + Verify** | 21–23 | Turnstile placeholder, rate limit, E2E verification |

---

## File Structure

### New files

```
lib/validations/
  offer-wizard.ts            Per-step + final Zod schemas for the wizard

lib/campaigns/
  types.ts                   AppliedDiscount, CartLineWithCampaign
  rules.ts                   Pure functions for each rule type
  index.ts                   applyCampaigns(cart, campaigns) public API

lib/stock-notifications/
  types.ts                   StockSubscription type
  index.ts                   subscribe(), dispatchForProduct() helpers

lib/search/
  index.ts                   searchCatalog(q) — products + categories + gallery

lib/turnstile/
  index.ts                   isEnabled() + verifyToken() server util

lib/web-push/
  client.ts                  urlBase64ToUint8Array + registerServiceWorker + subscribePush
  vapid.ts                   getPublicKey() helper (env-driven)

lib/rate-limit/
  index.ts                   In-memory limiter (LRU by IP), interface-ready for Redis

types/
  offer-wizard.ts            Wizard state shape + Step enum

app/(public)/teklif-al/
  page.tsx                   Replaces placeholder; renders WizardShell

app/(public)/galeri/[slug]/
  page.tsx                   Gallery post detail with image carousel

app/(public)/api/stock-notifications/
  route.ts                   POST: subscribe to product stock alerts

app/sitemap.ts               Next.js sitemap convention
app/robots.ts                Next.js robots.txt convention

app/(admin)/kayhan-yonetim/(protected)/stok-bildirimleri/
  page.tsx                   Admin view of stock subscribers

components/offer-wizard/
  use-wizard-state.ts        localStorage-persisted wizard state hook
  step-indicator.tsx         Progress bar / step dots
  step-welcome.tsx           Step 1 — slogans, hero
  step-personal.tsx          Step 2 — name, city, district, phone, email
  step-location.tsx          Step 3 — installation location + demo media URL list
  step-system.tsx            Step 4 — appliance list + detailed description (2000 char)
  step-confirm.tsx           Step 5 — review + KVKK checkbox
  step-success.tsx           Step 6 — checkmark + back-to-home
  appliance-list-editor.tsx  Dynamic appliance row editor
  wizard-shell.tsx           Orchestrator (uses use-wizard-state)

components/search/
  search-trigger.tsx         Header search button (replaces inert one)
  search-dialog.tsx          Cmd+K modal with grouped results

components/shop/
  notify-when-available.tsx  Modal subscribed via product page
  cart-discount-line.tsx     Shows applied campaign in sepet summary

components/seo/
  product-jsonld.tsx         Server component emitting <script type="application/ld+json">

components/security/
  turnstile.tsx              Renders Turnstile widget when env key set, else null

components/admin/
  stock-subscriber-row.tsx   Row component for admin subscribers list

public/sw.js                 Demo service worker — registers + receives push, no business logic
public/icons/badge.png       Notification badge image (optional; placeholder)

app/(public)/teklif-al/actions/
  submit.ts                  submitOfferAction (server)
```

### Modified files

```
.env.local                       Add NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (all empty in demo)
.env.local.example               Same — documented

lib/data/types.ts                Add StockSubscription
lib/data/repository.ts           Add subscription methods
lib/data/demo-store.ts           Seed subscription array
lib/data/demo-repository.ts      Implement subscription methods + trigger dispatch on stock save

app/(public)/sepet/page.tsx      Pass campaigns to CartView
components/shop/cart-view.tsx    Apply campaigns; show discount lines
components/shop/add-to-cart.tsx  Wire up NotifyWhenAvailable for out-of-stock products
app/(public)/urun/[slug]/page.tsx   Add ProductJsonLd + improved metadata + OG image
app/(public)/galeri/page.tsx     Link cards to /galeri/[slug] (currently no link)

components/layout/header.tsx     Replace plain search button with SearchTrigger
app/(admin)/kayhan-yonetim/actions/products.ts   Call dispatchForProduct when stock goes from 0 to >0
components/admin/sidebar.tsx     Add "Stok Bildirimleri" menu entry (Faz 4)
```

---

## Conventions Used in This Plan

- **No automated tests** — master plan §3.9. Each task ends with manual verification or build/lint check.
- **Commit cadence** — one commit per task. Commit message prefixes: `feat(wizard)`, `feat(campaigns)`, `feat(notify)`, `feat(search)`, `feat(seo)`, `feat(security)`.
- **All UI text in Turkish.** Code identifiers in English.
- **Demo-mode flags** — every external service has a graceful "no-op" path when env keys are missing. Real integrations are one-flag away.
- **Cyber lime semantic tokens only** — never hardcode colors.

---

# Sub-Phase 4A — Multi-step Teklif Formu

Outcome: `/teklif-al` no longer shows a placeholder. Visitors complete a 6-step wizard (Welcome → Personal → Location → System → Confirm → Success). On submit, an Offer is created in the repo (notification fires for admin). State persists in localStorage so refreshes don't lose progress.

---

### Task 1: Wizard types + state hook

**Files:**
- Create: `types/offer-wizard.ts`
- Create: `components/offer-wizard/use-wizard-state.ts`

- [ ] **Step 1: Write `types/offer-wizard.ts`**

```typescript
export type WizardStepId =
  | "welcome"
  | "personal"
  | "location"
  | "system"
  | "confirm"
  | "success";

export interface WizardAppliance {
  name: string;
  powerW?: number;
  voltage?: number;
}

export interface WizardMediaRef {
  type: "image" | "video" | "document";
  url: string;
}

export interface WizardState {
  // step 2 — personal
  fullName: string;
  city: string;
  district: string;
  phone: string;
  email: string;

  // step 3 — location
  installationLocation: "roof" | "land" | "other";
  installationAddress: string;
  media: WizardMediaRef[];

  // step 4 — system
  appliances: WizardAppliance[];
  detailedDescription: string;

  // step 5 — consent
  kvkkAccepted: boolean;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  fullName: "",
  city: "",
  district: "",
  phone: "",
  email: "",
  installationLocation: "roof",
  installationAddress: "",
  media: [],
  appliances: [],
  detailedDescription: "",
  kvkkAccepted: false,
};

export const STEP_ORDER: WizardStepId[] = [
  "welcome",
  "personal",
  "location",
  "system",
  "confirm",
  "success",
];

export const STEP_LABELS: Record<WizardStepId, string> = {
  welcome: "Başlangıç",
  personal: "Bilgiler",
  location: "Kurulum Yeri",
  system: "İhtiyaç",
  confirm: "Onay",
  success: "Tamam",
};
```

- [ ] **Step 2: Write `components/offer-wizard/use-wizard-state.ts`**

```typescript
"use client";

import { useEffect, useState } from "react";

import {
  INITIAL_WIZARD_STATE,
  STEP_ORDER,
  type WizardState,
  type WizardStepId,
} from "@/types/offer-wizard";

const STORAGE_KEY = "kayhan-offer-wizard";

interface PersistedState {
  step: WizardStepId;
  data: WizardState;
}

export function useWizardState() {
  const [step, setStepInternal] = useState<WizardStepId>("welcome");
  const [data, setData] = useState<WizardState>(INITIAL_WIZARD_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed.step && STEP_ORDER.includes(parsed.step)) {
          setStepInternal(parsed.step);
        }
        if (parsed.data) {
          setData({ ...INITIAL_WIZARD_STATE, ...parsed.data });
        }
      }
    } catch {
      // ignore — fresh start
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, data } satisfies PersistedState),
      );
    } catch {
      // quota or private mode — drop silently
    }
  }, [step, data, hydrated]);

  function setStep(next: WizardStepId) {
    setStepInternal(next);
  }

  function patch(partial: Partial<WizardState>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function reset() {
    setData(INITIAL_WIZARD_STATE);
    setStepInternal("welcome");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function goNext() {
    const i = STEP_ORDER.indexOf(step);
    if (i >= 0 && i < STEP_ORDER.length - 1) {
      setStepInternal(STEP_ORDER[i + 1]);
    }
  }

  function goPrev() {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) setStepInternal(STEP_ORDER[i - 1]);
  }

  return {
    step,
    data,
    hydrated,
    setStep,
    patch,
    reset,
    goNext,
    goPrev,
  };
}
```

- [ ] **Step 3: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add types/offer-wizard.ts components/offer-wizard/use-wizard-state.ts
git commit -m "feat(wizard): wizard state types and localStorage hook"
```

---

### Task 2: Per-step validation schemas

**Files:**
- Create: `lib/validations/offer-wizard.ts`

- [ ] **Step 1: Write the schemas**

```typescript
import { z } from "zod";

export const personalSchema = z.object({
  fullName: z.string().min(3, "Ad soyad zorunlu").max(120),
  city: z.string().min(2, "İl seçin"),
  district: z.string().min(2, "İlçe yazın").max(80),
  phone: z
    .string()
    .regex(/^[0-9+\s()-]{10,20}$/, "Geçerli bir telefon numarası girin"),
  email: z.string().email("Geçerli e-posta girin").optional().or(z.literal("")),
});

export const locationSchema = z.object({
  installationLocation: z.enum(["roof", "land", "other"]),
  installationAddress: z.string().min(5, "Kurulum adresini açıklayın").max(500),
  media: z
    .array(
      z.object({
        type: z.enum(["image", "video", "document"]),
        url: z.string().url("Geçerli URL girin"),
      }),
    )
    .max(7, "En fazla 7 medya"),
});

export const systemSchema = z.object({
  appliances: z
    .array(
      z.object({
        name: z.string().min(2, "Cihaz adı"),
        powerW: z.coerce.number().nonnegative().optional(),
        voltage: z.coerce.number().nonnegative().optional(),
      }),
    )
    .default([]),
  detailedDescription: z
    .string()
    .min(20, "En az 20 karakterlik bir açıklama yazın")
    .max(2000, "En fazla 2000 karakter"),
});

export const confirmSchema = z.object({
  kvkkAccepted: z
    .literal(true, { message: "KVKK aydınlatma metnini onaylayın" }),
});

export const finalSubmitSchema = personalSchema
  .and(locationSchema)
  .and(systemSchema)
  .and(confirmSchema);

export type PersonalInput = z.infer<typeof personalSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type SystemInput = z.infer<typeof systemSchema>;
```

- [ ] **Step 2: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/validations/offer-wizard.ts
git commit -m "feat(wizard): per-step zod validation schemas"
```

---

### Task 3: Submit offer server action

**Files:**
- Create: `app/(public)/teklif-al/actions/submit.ts`

- [ ] **Step 1: Write the action**

```typescript
"use server";

import { revalidatePath } from "next/cache";

import { repo } from "@/lib/data";
import { finalSubmitSchema } from "@/lib/validations/offer-wizard";
import type { WizardState } from "@/types/offer-wizard";

export interface SubmitOfferResult {
  ok: boolean;
  error?: string;
  offerId?: string;
}

export async function submitOfferAction(
  data: WizardState,
): Promise<SubmitOfferResult> {
  const parsed = finalSubmitSchema.safeParse({
    fullName: data.fullName,
    city: data.city,
    district: data.district,
    phone: data.phone,
    email: data.email || undefined,
    installationLocation: data.installationLocation,
    installationAddress: data.installationAddress,
    media: data.media,
    appliances: data.appliances,
    detailedDescription: data.detailedDescription,
    kvkkAccepted: data.kvkkAccepted,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Form geçersiz",
    };
  }

  const offer = await repo.createOffer({
    fullName: parsed.data.fullName,
    city: parsed.data.city,
    district: parsed.data.district,
    installationLocation: parsed.data.installationLocation,
    installationAddress: parsed.data.installationAddress,
    appliances: parsed.data.appliances,
    detailedDescription: parsed.data.detailedDescription,
    phone: parsed.data.phone,
    email: parsed.data.email ?? undefined,
  });

  revalidatePath("/kayhan-yonetim");
  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim/bildirimler");

  return { ok: true, offerId: offer.id };
}
```

- [ ] **Step 2: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add "app/(public)/teklif-al/actions/submit.ts"
git commit -m "feat(wizard): submitOfferAction with repo persistence"
```

---

### Task 4: Appliance editor + steps 1-3 (welcome, personal, location)

**Files:**
- Create: `components/offer-wizard/appliance-list-editor.tsx`
- Create: `components/offer-wizard/step-welcome.tsx`
- Create: `components/offer-wizard/step-personal.tsx`
- Create: `components/offer-wizard/step-location.tsx`

- [ ] **Step 1: Write `components/offer-wizard/appliance-list-editor.tsx`**

```typescript
"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WizardAppliance } from "@/types/offer-wizard";

interface Props {
  items: WizardAppliance[];
  onChange: (items: WizardAppliance[]) => void;
}

export function ApplianceListEditor({ items, onChange }: Props) {
  const add = () =>
    onChange([...items, { name: "", powerW: undefined, voltage: undefined }]);
  const remove = (idx: number) =>
    onChange(items.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<WizardAppliance>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-elevated p-4 text-sm text-muted">
          Henüz cihaz eklemediniz. Eklemek isterseniz aşağıdan ekleyebilirsiniz.
          Bilmediğiniz değerleri boş bırakabilirsiniz; ekibimiz hesaplamayı
          tamamlar.
        </p>
      )}

      {items.map((it, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_140px_140px_auto]"
        >
          <Input
            placeholder="Cihaz (örn. Buzdolabı)"
            value={it.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Güç (W)"
            value={it.powerW ?? ""}
            onChange={(e) =>
              update(i, {
                powerW: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Voltaj (V)"
            value={it.voltage ?? ""}
            onChange={(e) =>
              update(i, {
                voltage: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cihazı kaldır"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" strokeWidth={2.2} />
        Cihaz Ekle
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/offer-wizard/step-welcome.tsx`**

```typescript
"use client";

import { ArrowRight, Calculator, ShieldCheck, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  onNext: () => void;
}

const HIGHLIGHTS = [
  {
    icon: Calculator,
    title: "Detaylı hesaplama",
    text: "Cihazlarınıza göre panel sayısı, inverter ve batarya hesabı.",
  },
  {
    icon: Wrench,
    title: "Anahtar teslim kurulum",
    text: "Saha keşfinden devreye almaya kadar tek elden.",
  },
  {
    icon: ShieldCheck,
    title: "Şeffaf fiyatlandırma",
    text: "Tedarikçi bağlantılı fiyatlar, sürpriz yok.",
  },
];

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-primary" />
          Ücretsiz teklif — 2 dakika
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Bize Söyleyin, Biz Hesaplayalım
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted">
          Kullandığınız cihazları ve kurulum yerinizi paylaşın; sistem
          büyüklüğünü, ürünleri ve kabataslak fiyatı sizin yerinize
          hesaplayalım. Adımları istediğiniz zaman duraklatabilirsiniz —
          bilgileriniz cihazınızda kayıtlı kalır.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <h2 className="mt-4 text-sm font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>
          Başla
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/offer-wizard/step-personal.tsx`**

```typescript
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { turkishCities } from "@/lib/mock/data";
import { personalSchema } from "@/lib/validations/offer-wizard";
import type { WizardState } from "@/types/offer-wizard";

interface Props {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepPersonal({ data, patch, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function tryNext() {
    const result = personalSchema.safeParse({
      fullName: data.fullName,
      city: data.city,
      district: data.district,
      phone: data.phone,
      email: data.email || undefined,
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        next[issue.path.join(".")] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onNext();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Kişisel Bilgiler
        </h2>
        <p className="mt-1 text-sm text-muted">
          Size dönüş yapabilmemiz için iletişim bilgilerinizi paylaşın.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="fullName">Ad Soyad</Label>
          <Input
            id="fullName"
            value={data.fullName}
            onChange={(e) => patch({ fullName: e.target.value })}
            placeholder="Adınız Soyadınız"
            autoComplete="name"
          />
          {errors.fullName && (
            <p className="text-xs text-danger">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">İl</Label>
          <Select
            id="city"
            value={data.city}
            onChange={(e) => patch({ city: e.target.value })}
          >
            <option value="">Seçin</option>
            {turkishCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {errors.city && <p className="text-xs text-danger">{errors.city}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="district">İlçe</Label>
          <Input
            id="district"
            value={data.district}
            onChange={(e) => patch({ district: e.target.value })}
            placeholder="İlçeniz"
          />
          {errors.district && (
            <p className="text-xs text-danger">{errors.district}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            placeholder="+90 555 555 55 55"
            autoComplete="tel"
          />
          {errors.phone && <p className="text-xs text-danger">{errors.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-posta (opsiyonel)</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="ornek@eposta.com"
            autoComplete="email"
          />
          {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          Geri
        </Button>
        <Button onClick={tryNext}>
          Devam
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `components/offer-wizard/step-location.tsx`**

```typescript
"use client";

import { ArrowLeft, ArrowRight, Info, Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { locationSchema } from "@/lib/validations/offer-wizard";
import type { WizardMediaRef, WizardState } from "@/types/offer-wizard";

interface Props {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function StepLocation({ data, patch, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addMedia() {
    patch({
      media: [...data.media, { type: "image", url: "" }],
    });
  }

  function removeMedia(i: number) {
    patch({ media: data.media.filter((_, idx) => idx !== i) });
  }

  function updateMedia(i: number, mPatch: Partial<WizardMediaRef>) {
    patch({
      media: data.media.map((m, idx) =>
        idx === i ? { ...m, ...mPatch } : m,
      ),
    });
  }

  function tryNext() {
    const result = locationSchema.safeParse({
      installationLocation: data.installationLocation,
      installationAddress: data.installationAddress,
      media: data.media.filter((m) => m.url.trim()),
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        next[issue.path.join(".")] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    patch({ media: data.media.filter((m) => m.url.trim()) });
    onNext();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Kurulum Yeri</h2>
        <p className="mt-1 text-sm text-muted">
          Sistemin nereye kurulacağını ve mümkünse mevcut alanın görüntülerini
          bizimle paylaşın.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="installationLocation">Kurulum türü</Label>
          <Select
            id="installationLocation"
            value={data.installationLocation}
            onChange={(e) =>
              patch({
                installationLocation: e.target
                  .value as WizardState["installationLocation"],
              })
            }
          >
            <option value="roof">Çatı</option>
            <option value="land">Arazi</option>
            <option value="other">Diğer</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="installationAddress">
            Adres / kurulum detayları
          </Label>
          <Textarea
            id="installationAddress"
            rows={3}
            value={data.installationAddress}
            onChange={(e) => patch({ installationAddress: e.target.value })}
            placeholder="Örn: Müstakil ev çatısı, güneye bakıyor, 80 m2..."
          />
          {errors.installationAddress && (
            <p className="text-xs text-danger">{errors.installationAddress}</p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Görsel / video (opsiyonel)
            </h3>
            <p className="mt-1 flex items-start gap-2 text-xs text-muted">
              <Info
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime-dark dark:text-lime-primary"
                strokeWidth={2.4}
              />
              <span>
                Demo modda dosya yükleme yakında aktif olacak — şimdilik
                Google Drive, Dropbox veya WhatsApp&apos;tan paylaşım linki
                yapıştırın. Maksimum 7 medya ekleyebilirsiniz.
              </span>
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {data.media.map((m, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-border bg-elevated p-3 sm:grid-cols-[140px_1fr_auto]"
            >
              <Select
                value={m.type}
                onChange={(e) =>
                  updateMedia(i, {
                    type: e.target.value as WizardMediaRef["type"],
                  })
                }
              >
                <option value="image">Görsel</option>
                <option value="video">Video</option>
                <option value="document">Belge</option>
              </Select>
              <Input
                value={m.url}
                onChange={(e) => updateMedia(i, { url: e.target.value })}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Medyayı kaldır"
                onClick={() => removeMedia(i)}
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </Button>
            </div>
          ))}

          {data.media.length < 7 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMedia}
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              Medya Ekle
            </Button>
          )}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          Geri
        </Button>
        <Button onClick={tryNext}>
          Devam
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add components/offer-wizard
git commit -m "feat(wizard): appliance editor + welcome/personal/location steps"
```

---

### Task 5: Steps 4-6 (system, confirm, success) + step indicator

**Files:**
- Create: `components/offer-wizard/step-system.tsx`
- Create: `components/offer-wizard/step-confirm.tsx`
- Create: `components/offer-wizard/step-success.tsx`
- Create: `components/offer-wizard/step-indicator.tsx`

- [ ] **Step 1: Write `components/offer-wizard/step-system.tsx`**

```typescript
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import { ApplianceListEditor } from "@/components/offer-wizard/appliance-list-editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { systemSchema } from "@/lib/validations/offer-wizard";
import type { WizardState } from "@/types/offer-wizard";

interface Props {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const MAX_DESC = 2000;

export function StepSystem({ data, patch, onNext, onPrev }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const remaining = MAX_DESC - data.detailedDescription.length;

  function tryNext() {
    const result = systemSchema.safeParse({
      appliances: data.appliances.filter((a) => a.name.trim()),
      detailedDescription: data.detailedDescription,
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        next[issue.path.join(".")] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    patch({ appliances: data.appliances.filter((a) => a.name.trim()) });
    onNext();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Sistem İhtiyacı
        </h2>
        <p className="mt-1 text-sm text-muted">
          Çalıştırmak istediğiniz cihazları ve genel beklentilerinizi yazın.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-sm font-semibold tracking-tight">
          Çalıştırılacak Cihazlar
        </h3>
        <p className="mt-1 text-xs text-muted">
          Güç ve voltajı bilmiyorsanız boş bırakabilirsiniz; ekibimiz
          hesaplamayı tamamlar.
        </p>
        <div className="mt-4">
          <ApplianceListEditor
            items={data.appliances}
            onChange={(appliances) => patch({ appliances })}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <Label htmlFor="detailedDescription">Detaylı Açıklama</Label>
          <span
            className={`text-[10px] font-medium tabular-nums ${
              remaining < 0 ? "text-danger" : "text-subtle"
            }`}
          >
            {data.detailedDescription.length}/{MAX_DESC}
          </span>
        </div>
        <Textarea
          id="detailedDescription"
          rows={7}
          maxLength={MAX_DESC}
          value={data.detailedDescription}
          onChange={(e) => patch({ detailedDescription: e.target.value })}
          placeholder="Aylık ortalama tüketim, kullanım saatleri, batarya yedek ihtiyacı, şebeke durumu vb..."
          className="mt-2"
        />
        {errors.detailedDescription && (
          <p className="mt-1 text-xs text-danger">
            {errors.detailedDescription}
          </p>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          Geri
        </Button>
        <Button onClick={tryNext}>
          Devam
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `components/offer-wizard/step-confirm.tsx`**

```typescript
"use client";

import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { submitOfferAction } from "@/app/(public)/teklif-al/actions/submit";
import { Button } from "@/components/ui/button";
import type { WizardState } from "@/types/offer-wizard";

interface Props {
  data: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onPrev: () => void;
  onSuccess: () => void;
}

export function StepConfirm({ data, patch, onPrev, onSuccess }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!data.kvkkAccepted) {
      setError("KVKK aydınlatma metnini onaylayın");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitOfferAction(data);
      if (!result.ok) {
        setError(result.error ?? "Gönderim başarısız");
        toast.error("Gönderilemedi", { description: result.error });
        return;
      }
      toast.success("Teklifiniz alındı");
      onSuccess();
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Bilgilerinizi Onaylayın
        </h2>
        <p className="mt-1 text-sm text-muted">
          Aşağıdaki özeti kontrol edin; KVKK metnini onaylayıp gönderebilirsiniz.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-subtle">Ad Soyad</dt>
            <dd className="font-medium">{data.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Telefon</dt>
            <dd className="font-medium">{data.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">E-posta</dt>
            <dd className="font-medium">{data.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">İl / İlçe</dt>
            <dd className="font-medium">
              {data.city} / {data.district}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-subtle">Kurulum yeri</dt>
            <dd className="font-medium">
              {data.installationLocation === "roof"
                ? "Çatı"
                : data.installationLocation === "land"
                  ? "Arazi"
                  : "Diğer"}{" "}
              · {data.installationAddress}
            </dd>
          </div>
          {data.media.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-subtle">Medya</dt>
              <dd className="text-xs text-muted">
                {data.media.length} adet bağlantı eklendi
              </dd>
            </div>
          )}
          {data.appliances.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-subtle">Cihazlar</dt>
              <dd className="font-medium">
                {data.appliances
                  .map((a) =>
                    a.powerW ? `${a.name} (${a.powerW}W)` : a.name,
                  )
                  .join(", ")}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-xs text-subtle">Açıklama</dt>
            <dd className="whitespace-pre-wrap text-foreground">
              {data.detailedDescription}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={data.kvkkAccepted}
            onChange={(e) => patch({ kvkkAccepted: e.target.checked })}
            className="mt-1 h-4 w-4 cursor-pointer accent-lime-primary"
          />
          <span className="text-sm leading-relaxed text-foreground">
            <Link
              href="/kvkk"
              target="_blank"
              className="underline hover:text-lime-dark dark:hover:text-lime-primary"
            >
              KVKK aydınlatma metnini
            </Link>{" "}
            okudum ve kişisel verilerimin teklif değerlendirmesi amacıyla
            işlenmesini kabul ediyorum.
          </span>
        </label>
      </section>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          Geri
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          <Send className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Gönderiliyor..." : "Teklifi Gönder"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/offer-wizard/step-success.tsx`**

```typescript
"use client";

import { CheckCircle2, Home, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface Props {
  onReset: () => void;
}

export function StepSuccess({ onReset }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-lime-primary/20 text-lime-dark dark:text-lime-primary">
        <CheckCircle2 className="h-10 w-10" strokeWidth={2.2} />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Teklifiniz Alındı
        </h2>
        <p className="max-w-md text-sm text-muted">
          Bilgileriniz ekibimize iletildi. 24 saat içinde size telefon veya
          e-posta ile dönüş yapacağız.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
        <Link href="/">
          <Button size="lg" variant="primary">
            <Home className="h-4 w-4" strokeWidth={2.4} />
            Anasayfaya Dön
          </Button>
        </Link>
        <Link href="/iletisim">
          <Button size="lg" variant="outline">
            <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
            Bizimle İletişime Geç
          </Button>
        </Link>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="text-xs text-subtle underline hover:text-muted"
      >
        Yeni bir teklif daha gönder
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write `components/offer-wizard/step-indicator.tsx`**

```typescript
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  STEP_LABELS,
  STEP_ORDER,
  type WizardStepId,
} from "@/types/offer-wizard";

interface Props {
  current: WizardStepId;
}

export function StepIndicator({ current }: Props) {
  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <nav aria-label="Adım göstergesi" className="overflow-x-auto">
      <ol className="flex min-w-fit items-center gap-2">
        {STEP_ORDER.map((id, idx) => {
          const isCurrent = idx === currentIndex;
          const isDone = idx < currentIndex;
          return (
            <li key={id} className="flex items-center gap-2">
              <div
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                  isDone
                    ? "bg-lime-primary text-black"
                    : isCurrent
                      ? "bg-foreground text-background"
                      : "bg-elevated text-muted",
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.4} /> : idx + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  isCurrent ? "text-foreground" : "text-muted",
                )}
              >
                {STEP_LABELS[id]}
              </span>
              {idx < STEP_ORDER.length - 1 && (
                <span
                  className={cn(
                    "h-px w-6 sm:w-12",
                    isDone ? "bg-lime-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 5: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add components/offer-wizard
git commit -m "feat(wizard): system/confirm/success steps + step indicator"
```

---

### Task 6: Wizard shell + replace /teklif-al page

**Files:**
- Create: `components/offer-wizard/wizard-shell.tsx`
- Modify: `app/(public)/teklif-al/page.tsx`

- [ ] **Step 1: Write `components/offer-wizard/wizard-shell.tsx`**

```typescript
"use client";

import { Container } from "@/components/ui/container";
import { StepConfirm } from "./step-confirm";
import { StepIndicator } from "./step-indicator";
import { StepLocation } from "./step-location";
import { StepPersonal } from "./step-personal";
import { StepSuccess } from "./step-success";
import { StepSystem } from "./step-system";
import { StepWelcome } from "./step-welcome";
import { useWizardState } from "./use-wizard-state";

export function WizardShell() {
  const wizard = useWizardState();

  if (!wizard.hydrated) {
    return (
      <Container className="py-14">
        <div className="h-6 w-32 animate-pulse rounded-md bg-elevated" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-elevated" />
      </Container>
    );
  }

  return (
    <Container className="py-10 lg:py-14">
      {wizard.step !== "success" && (
        <div className="mb-8">
          <StepIndicator current={wizard.step} />
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        {wizard.step === "welcome" && <StepWelcome onNext={wizard.goNext} />}
        {wizard.step === "personal" && (
          <StepPersonal
            data={wizard.data}
            patch={wizard.patch}
            onNext={wizard.goNext}
            onPrev={wizard.goPrev}
          />
        )}
        {wizard.step === "location" && (
          <StepLocation
            data={wizard.data}
            patch={wizard.patch}
            onNext={wizard.goNext}
            onPrev={wizard.goPrev}
          />
        )}
        {wizard.step === "system" && (
          <StepSystem
            data={wizard.data}
            patch={wizard.patch}
            onNext={wizard.goNext}
            onPrev={wizard.goPrev}
          />
        )}
        {wizard.step === "confirm" && (
          <StepConfirm
            data={wizard.data}
            patch={wizard.patch}
            onPrev={wizard.goPrev}
            onSuccess={() => wizard.setStep("success")}
          />
        )}
        {wizard.step === "success" && <StepSuccess onReset={wizard.reset} />}
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Replace `app/(public)/teklif-al/page.tsx`**

```typescript
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
```

- [ ] **Step 3: Build + manual smoke + commit**

Run: `pnpm build`
Expected: ✓ Compiled, `/teklif-al` in route list.

Run: `pnpm dev`
- Navigate to `/teklif-al` → welcome step renders with 3 highlight cards
- Click "Başla" → personal step shows; try clicking "Devam" with empty fields → validation errors appear in TR
- Fill fields, advance through all 5 steps
- On confirm step: check KVKK box, click "Teklifi Gönder"
- Should redirect to success step
- Sign in to admin (`/kayhan-yonetim/giris`) — new offer should appear in Teklifler list with `Yeni` status
- Notification bell badge should increase

Stop the dev server.

```bash
git add components/offer-wizard/wizard-shell.tsx "app/(public)/teklif-al/page.tsx"
git commit -m "feat(wizard): wire 6-step wizard at /teklif-al"
```

---

**✓ End of Sub-Phase 4A.** Customers can submit offers end-to-end; admin sees them with notifications. localStorage persistence means partially-filled forms survive refreshes.

---

# Sub-Phase 4B — Galeri Detay + Arama + SEO

Outcome: Visitors can click a gallery card to see the project detail page; Cmd+K opens a site-wide search that matches products, categories, and gallery posts; search engines see proper sitemap + robots + JSON-LD; Open Graph cards render with fallback images.

---

### Task 9: Gallery detail page

**Files:**
- Create: `app/(public)/galeri/[slug]/page.tsx`
- Modify: `app/(public)/galeri/page.tsx` (add link to detail page on cards)

- [ ] **Step 1: Write `app/(public)/galeri/[slug]/page.tsx`**

```typescript
import { ArrowLeft, CalendarDays, MapPin, Zap } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { repo } from "@/lib/data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await repo.listGalleryPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await repo.getGalleryPostBySlug(slug);
  if (!post) return { title: "Proje bulunamadı" };
  return {
    title: post.title,
    description:
      post.description ?? `${post.location ?? "Türkiye"} — ${post.title}`,
    openGraph: {
      title: post.title,
      description: post.description,
      images: post.media[0]?.url ? [{ url: post.media[0].url }] : undefined,
    },
  };
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function GalleryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await repo.getGalleryPostBySlug(slug);
  if (!post) notFound();

  return (
    <Container className="py-10 lg:py-14">
      <Link
        href="/galeri"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
        Galeriye dön
      </Link>

      <header className="mt-4 max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          {post.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" strokeWidth={2.2} />
              {post.location}
            </span>
          )}
          {post.installationDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" strokeWidth={2.2} />
              {formatDate(post.installationDate)}
            </span>
          )}
          {post.systemPowerKw !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-lime-primary/15 px-2 py-0.5 text-xs font-semibold text-lime-dark dark:text-lime-primary">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.4} />
              {post.systemPowerKw} kW
            </span>
          )}
        </div>
        {post.description && (
          <p className="text-base leading-relaxed text-muted">
            {post.description}
          </p>
        )}
      </header>

      {post.media.length > 0 && (
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {post.media.map((m) => (
            <div
              key={m.id}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-elevated"
            >
              {m.type === "image" ? (
                <Image
                  src={m.url}
                  alt={m.altText ?? post.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <video
                  src={m.url}
                  controls
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          ))}
        </section>
      )}

      <section className="mt-16 rounded-3xl border border-border bg-surface p-8 sm:p-12">
        <div className="grid items-center gap-6 sm:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Benzer bir sistem ister misiniz?
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Saha ölçümü ve teklif tamamen ücretsiz. Cihaz listenizi
              paylaşmanız yeterli, gerisini biz hesaplayalım.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <Link href="/teklif-al">
              <Button size="lg" variant="primary">
                Teklif Al
              </Button>
            </Link>
            <Link href="/iletisim">
              <Button size="lg" variant="outline">
                İletişim
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Container>
  );
}
```

- [ ] **Step 2: Modify `app/(public)/galeri/page.tsx`**

Read the file first. Then wrap each `<article>` card in a `<Link href={`/galeri/${post.slug}`}>` so cards navigate to detail. The Link replaces the outer `<article>` element (or sit as a child wrapper).

Final card structure should be:

```typescript
import Link from "next/link";
// ... existing imports

// Inside the map:
<Link
  key={post.id}
  href={`/galeri/${post.slug}`}
  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-1 hover:border-lime-primary hover:shadow-xl hover:shadow-lime-primary/10"
>
  {/* existing card content — image div + content div */}
</Link>
```

Replace the existing `<article key={post.id} className="...">` opening + matching `</article>` close with the `<Link>` versions above. Keep everything inside identical.

- [ ] **Step 3: Build + verify**

Run: `pnpm build`
Expected: ✓ Compiled. Route list now includes `/galeri/[slug]` as SSG with seeded slugs.

- [ ] **Step 4: Commit**

```bash
git add "app/(public)/galeri"
git commit -m "feat(seo): gallery detail page at /galeri/[slug]"
```

---

### Task 10: Catalog search utility

**Files:**
- Create: `lib/search/index.ts`

- [ ] **Step 1: Write the file**

```typescript
import "server-only";

import { repo } from "@/lib/data";
import type { Category, GalleryPost, Product } from "@/types";

export interface ProductHit {
  kind: "product";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
}

export interface CategoryHit {
  kind: "category";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface GalleryHit {
  kind: "gallery";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
}

export type SearchHit = ProductHit | CategoryHit | GalleryHit;

export interface SearchResults {
  query: string;
  products: ProductHit[];
  categories: CategoryHit[];
  gallery: GalleryHit[];
  totalCount: number;
}

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

function matchesProduct(p: Product, terms: string[]): boolean {
  if (!p.isActive) return false;
  const haystack = normalize(
    [p.name, p.shortDescription, p.brand, ...(p.badges ?? [])]
      .filter(Boolean)
      .join(" "),
  );
  return terms.every((t) => haystack.includes(t));
}

function matchesCategory(c: Category, terms: string[]): boolean {
  const haystack = normalize(`${c.name} ${c.description ?? ""} ${c.slug}`);
  return terms.every((t) => haystack.includes(t));
}

function matchesGallery(g: GalleryPost, terms: string[]): boolean {
  const haystack = normalize(
    `${g.title} ${g.description ?? ""} ${g.location ?? ""}`,
  );
  return terms.every((t) => haystack.includes(t));
}

export async function searchCatalog(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) {
    return { query: q, products: [], categories: [], gallery: [], totalCount: 0 };
  }
  const terms = normalize(q)
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (terms.length === 0) {
    return { query: q, products: [], categories: [], gallery: [], totalCount: 0 };
  }

  const [allProducts, allCategories, allGallery] = await Promise.all([
    repo.listProducts(),
    repo.listCategories(),
    repo.listGalleryPosts(),
  ]);

  const products = allProducts
    .filter((p) => matchesProduct(p, terms))
    .slice(0, 8)
    .map<ProductHit>((p) => ({
      kind: "product",
      id: p.id,
      title: p.name,
      subtitle: p.brand,
      href: `/urun/${p.slug}`,
      imageUrl: p.media[0]?.url,
    }));

  const categories = allCategories
    .filter((c) => matchesCategory(c, terms))
    .slice(0, 5)
    .map<CategoryHit>((c) => ({
      kind: "category",
      id: c.id,
      title: c.name,
      subtitle: c.description,
      href: `/magaza?kategori=${c.slug}`,
    }));

  const gallery = allGallery
    .filter((g) => matchesGallery(g, terms))
    .slice(0, 5)
    .map<GalleryHit>((g) => ({
      kind: "gallery",
      id: g.id,
      title: g.title,
      subtitle: g.location,
      href: `/galeri/${g.slug}`,
      imageUrl: g.media[0]?.url,
    }));

  return {
    query: q,
    products,
    categories,
    gallery,
    totalCount: products.length + categories.length + gallery.length,
  };
}
```

- [ ] **Step 2: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/search
git commit -m "feat(search): catalog search utility with TR normalization"
```

---

### Task 11: Search dialog + header integration

**Files:**
- Create: `components/search/search-dialog.tsx`
- Create: `components/search/search-trigger.tsx`
- Create: `app/(public)/api/search/route.ts`
- Modify: `components/layout/header.tsx` (replace existing inert search button)

- [ ] **Step 1: Write `app/(public)/api/search/route.ts`**

```typescript
import { NextResponse } from "next/server";

import { searchCatalog } from "@/lib/search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const results = await searchCatalog(q);
  return NextResponse.json(results);
}
```

- [ ] **Step 2: Write `components/search/search-dialog.tsx`**

```typescript
"use client";

import { Loader2, Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SearchHit, SearchResults } from "@/lib/search";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY: SearchResults = {
  query: "",
  products: [],
  categories: [],
  gallery: [],
  totalCount: 0,
};

const DEBOUNCE_MS = 220;

export function SearchDialog({ open, onClose }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open + reset state
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQ("");
      setResults(EMPTY);
      setActiveIdx(0);
    }
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as SearchResults;
        setResults(data);
        setActiveIdx(0);
      } catch {
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, open]);

  const flatHits: SearchHit[] = [
    ...results.products,
    ...results.categories,
    ...results.gallery,
  ];

  const navigate = useCallback(
    (hit: SearchHit) => {
      router.push(hit.href);
      onClose();
    },
    [router, onClose],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (flatHits.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(flatHits.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = flatHits[activeIdx];
        if (hit) navigate(hit);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flatHits, activeIdx, navigate, onClose]);

  if (!open) return null;

  let cursor = 0;
  const renderGroup = (title: string, hits: SearchHit[]) => {
    if (hits.length === 0) return null;
    const node = (
      <section key={title}>
        <h3 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-subtle">
          {title}
        </h3>
        <ul>
          {hits.map((hit) => {
            const idx = cursor++;
            const isActive = idx === activeIdx;
            return (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => navigate(hit)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-lime-primary/15 text-foreground"
                      : "text-foreground hover:bg-elevated"
                  }`}
                >
                  {"imageUrl" in hit && hit.imageUrl ? (
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-elevated">
                      <Image
                        src={hit.imageUrl}
                        alt={hit.title}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-elevated" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {hit.title}
                    </span>
                    {hit.subtitle && (
                      <span className="block truncate text-xs text-muted">
                        {hit.subtitle}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    {hit.kind === "product"
                      ? "Ürün"
                      : hit.kind === "category"
                        ? "Kategori"
                        : "Galeri"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
    return node;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[10vh]">
      <button
        type="button"
        aria-label="Aramayı kapat"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted" strokeWidth={2.2} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ürün, kategori veya proje ara..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted" strokeWidth={2.2} />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Aramaya başlamak için en az 2 karakter yazın.
            </p>
          ) : results.totalCount === 0 && !loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              &quot;{q}&quot; için sonuç bulunamadı.
            </p>
          ) : (
            <div className="py-1">
              {renderGroup("Ürünler", results.products)}
              {renderGroup("Kategoriler", results.categories)}
              {renderGroup("Galeri", results.gallery)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-elevated px-4 py-2 text-[10px] text-subtle">
          <span>
            <kbd className="rounded bg-surface px-1 py-0.5 font-mono">↑↓</kbd>{" "}
            gez ·{" "}
            <kbd className="rounded bg-surface px-1 py-0.5 font-mono">Enter</kbd>{" "}
            seç ·{" "}
            <kbd className="rounded bg-surface px-1 py-0.5 font-mono">Esc</kbd>{" "}
            kapat
          </span>
          <span className="hidden sm:inline">{results.totalCount} sonuç</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `components/search/search-trigger.tsx`**

```typescript
"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { SearchDialog } from "./search-dialog";

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Site içi arama (Ctrl+K)"
        className="hidden h-9 w-9 place-items-center rounded-full border border-border text-muted hover:text-foreground md:grid"
      >
        <Search className="h-4 w-4" strokeWidth={2.2} />
      </button>
      <SearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 4: Modify `components/layout/header.tsx`**

Read the file first. Find this block:

```typescript
          <button
            type="button"
            aria-label="Ara"
            className="hidden h-9 w-9 place-items-center rounded-full border border-border text-muted hover:text-foreground md:grid"
          >
            <Search className="h-4 w-4" strokeWidth={2.2} />
          </button>
```

Replace with:

```typescript
          <SearchTrigger />
```

Also remove the `Search` import from `lucide-react` (only used by the replaced block — verify it's not used elsewhere in the file; if it isn't, drop it).

Add the import:

```typescript
import { SearchTrigger } from "@/components/search/search-trigger";
```

- [ ] **Step 5: Build + smoke + commit**

Run: `pnpm build`
Expected: ✓ Compiled.

Run: `pnpm dev`
- Click search icon in header (desktop) → dialog opens
- Type "panel" → results appear (products + categories)
- Press ↓ to navigate, Enter to select
- Press Ctrl+K from any page → dialog opens
- Click outside or Esc → closes

```bash
git add components/search "app/(public)/api/search" components/layout/header.tsx
git commit -m "feat(search): site-wide Cmd+K search dialog"
```

---

### Task 12: Improved metadata + OG fallback image

**Files:**
- Create: `app/opengraph-image.tsx`
- Modify: `app/layout.tsx` (extend metadata.openGraph with default image)

- [ ] **Step 1: Write `app/opengraph-image.tsx`**

This generates a fallback OG image using Next.js's built-in `ImageResponse` (no external dep). It runs at build time per route.

```typescript
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "KAYHAN Solar & Enerji";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0a0f0a 0%, #131a13 50%, #0a0f0a 100%)",
          padding: 64,
          color: "#f0f4f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#c7ff00",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            K
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>
            <span>KAYHAN</span>
            <span style={{ color: "#7a8a7a", marginLeft: 12 }}>Solar</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.1 }}>
            Güneşin Gücü,
          </div>
          <div
            style={{ fontSize: 64, fontWeight: 600, color: "#c7ff00", lineHeight: 1.1 }}
          >
            Senin Kontrolünde
          </div>
          <div style={{ fontSize: 26, color: "#b8c5b8", marginTop: 12 }}>
            Anahtar teslim güneş enerjisi sistemleri
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 2: Modify `app/layout.tsx` to reference the fallback in openGraph.images**

Read the file. Find the `openGraph` section in metadata and add an `images` array referencing the auto-generated OG (Next.js handles `app/opengraph-image.tsx` automatically — but adding an explicit `images: [...]` entry helps any sub-page that doesn't override).

Replace:

```typescript
  openGraph: { type: "website", locale: "tr_TR", siteName: "KAYHAN Solar & Enerji" },
```

with:

```typescript
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "KAYHAN Solar & Enerji",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "KAYHAN Solar & Enerji",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
```

- [ ] **Step 3: Build + commit**

Run: `pnpm build`
Expected: ✓ Compiled. Build log includes `/opengraph-image` as a generated image.

Visit `http://localhost:3000/opengraph-image` to verify the PNG renders.

```bash
git add app/opengraph-image.tsx app/layout.tsx
git commit -m "feat(seo): generated OG fallback image and Twitter card"
```

---

### Task 13: sitemap.ts + robots.ts

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`

- [ ] **Step 1: Write `app/sitemap.ts`**

```typescript
import type { MetadataRoute } from "next";

import { repo } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  "",
  "/magaza",
  "/teklif-al",
  "/galeri",
  "/hakkimizda",
  "/sss",
  "/iletisim",
].map((path) => ({
  url: `${SITE_URL}${path}`,
  lastModified: new Date(),
  changeFrequency: "weekly",
  priority: path === "" ? 1.0 : 0.7,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, gallery] = await Promise.all([
    repo.listProducts(),
    repo.listGalleryPosts(),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.isActive)
    .map((p) => ({
      url: `${SITE_URL}/urun/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const galleryRoutes: MetadataRoute.Sitemap = gallery.map((g) => ({
    url: `${SITE_URL}/galeri/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...STATIC_ROUTES, ...productRoutes, ...galleryRoutes];
}
```

- [ ] **Step 2: Write `app/robots.ts`**

```typescript
import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/kayhan-yonetim", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
```

- [ ] **Step 3: Build + verify**

Run: `pnpm build`
Expected: ✓ Compiled. Routes list includes `/sitemap.xml` and `/robots.txt`.

Run: `pnpm dev` then `curl http://localhost:3000/robots.txt` and `curl http://localhost:3000/sitemap.xml` — both must return valid content.

- [ ] **Step 4: Commit**

```bash
git add app/sitemap.ts app/robots.ts
git commit -m "feat(seo): sitemap.xml and robots.txt"
```

---

### Task 14: Product JSON-LD structured data

**Files:**
- Create: `components/seo/product-jsonld.tsx`
- Modify: `app/(public)/urun/[slug]/page.tsx` (embed JSON-LD)

- [ ] **Step 1: Write `components/seo/product-jsonld.tsx`**

```typescript
import type { Product } from "@/types";

interface Props {
  product: Product;
  url: string;
}

export function ProductJsonLd({ product, url }: Props) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.id,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    image: product.media
      .filter((m) => m.type === "image")
      .map((m) => m.url),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "TRY",
      price: product.currentPrice,
      availability:
        product.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
```

- [ ] **Step 2: Modify `app/(public)/urun/[slug]/page.tsx`**

Read the file. Add the import at the top with other imports:

```typescript
import { ProductJsonLd } from "@/components/seo/product-jsonld";
```

In the page render, right after the opening `<Container className="py-8 lg:py-14">`, add:

```typescript
      <ProductJsonLd
        product={product}
        url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com"}/urun/${product.slug}`}
      />
```

Also extend the `generateMetadata` function to include `openGraph.images` with the product's first image:

Read the function and replace it with:

```typescript
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await repo.getProductBySlug(slug);
  if (!product) return { title: "Ürün bulunamadı" };
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.media[0]?.url
        ? [{ url: product.media[0].url, alt: product.name }]
        : undefined,
    },
  };
}
```

- [ ] **Step 3: Build + verify**

Run: `pnpm build`
Run: `pnpm dev`
- View page source of `/urun/jinko-550w-monokristal-panel` (browser View Source)
- Verify there's a `<script type="application/ld+json">{...}</script>` tag containing valid JSON with `@type:"Product"`

- [ ] **Step 4: Commit**

```bash
git add components/seo "app/(public)/urun/[slug]/page.tsx"
git commit -m "feat(seo): Product JSON-LD and OG image on product pages"
```

---

**✓ End of Sub-Phase 4B.** Gallery detail, search, sitemap, robots, OG fallback, and product structured data are live.

---

# Sub-Phase 4C — Sepet Kampanyaları + Stok Bildirimi

Outcome: Cart applies all 5 campaign rule types (with line-item discount display + free-shipping handling). Out-of-stock products show a "gelince haber ver" form that records subscriptions; admin can see subscribers and is notified to dispatch when stock returns.

---

### Task 15: Campaign rule engine

**Files:**
- Create: `lib/campaigns/types.ts`
- Create: `lib/campaigns/rules.ts`
- Create: `lib/campaigns/index.ts`

- [ ] **Step 1: Write `lib/campaigns/types.ts`**

```typescript
export interface AppliedCampaign {
  campaignId: string;
  title: string;
  ruleType: string;
  discountAmount: number; // positive TRY off the subtotal
  freeShipping: boolean;
}

export interface CartCalculationInput {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  productCategoryById: Record<string, string>; // productId -> categoryId
  baseShippingCost: number;
  freeShippingThreshold: number;
}

export interface CartCalculation {
  subtotal: number;
  totalDiscount: number;
  appliedCampaigns: AppliedCampaign[];
  shippingCost: number;
  total: number;
}
```

- [ ] **Step 2: Write `lib/campaigns/rules.ts`**

```typescript
import type { Campaign } from "@/types";

import type { AppliedCampaign, CartCalculationInput } from "./types";

function matchesCampaign(
  productId: string,
  input: CartCalculationInput,
  campaign: Campaign,
): boolean {
  if (campaign.applicableTo === "all") return true;
  if (campaign.applicableTo === "product") {
    return campaign.targetIds.includes(productId);
  }
  if (campaign.applicableTo === "category") {
    const categoryId = input.productCategoryById[productId];
    return categoryId ? campaign.targetIds.includes(categoryId) : false;
  }
  return false;
}

function readNumber(
  config: Record<string, unknown>,
  key: string,
  fallback = 0,
): number {
  const v = config[key];
  return typeof v === "number" ? v : fallback;
}

interface RuleApplication {
  discountAmount: number;
  freeShipping: boolean;
}

export function applyPercentOff(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const pct = readNumber(campaign.ruleConfig, "discountPercent");
  if (pct <= 0) return { discountAmount: 0, freeShipping: false };
  let discount = 0;
  for (const item of input.items) {
    if (!matchesCampaign(item.productId, input, campaign)) continue;
    discount += item.price * item.quantity * (pct / 100);
  }
  return { discountAmount: Math.round(discount), freeShipping: false };
}

export function applyBuyXGetY(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const buyQty = readNumber(campaign.ruleConfig, "buyQuantity");
  const getQty = readNumber(campaign.ruleConfig, "getQuantity", 1);
  const pct = readNumber(campaign.ruleConfig, "discountPercent");
  if (buyQty <= 0 || getQty <= 0 || pct <= 0) {
    return { discountAmount: 0, freeShipping: false };
  }
  // Expand each matching unit into a list of unit prices, sort ascending.
  const matchingUnitPrices: number[] = [];
  for (const item of input.items) {
    if (!matchesCampaign(item.productId, input, campaign)) continue;
    for (let i = 0; i < item.quantity; i++) {
      matchingUnitPrices.push(item.price);
    }
  }
  if (matchingUnitPrices.length < buyQty + getQty) {
    return { discountAmount: 0, freeShipping: false };
  }
  matchingUnitPrices.sort((a, b) => a - b);
  const groupSize = buyQty + getQty;
  const groupCount = Math.floor(matchingUnitPrices.length / groupSize);
  let discount = 0;
  for (let g = 0; g < groupCount; g++) {
    // The cheapest getQty units in this group get the discount
    for (let j = 0; j < getQty; j++) {
      const idx = g * groupSize + j;
      discount += matchingUnitPrices[idx] * (pct / 100);
    }
  }
  return { discountAmount: Math.round(discount), freeShipping: false };
}

export function applyBundleDiscount(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const requiredIds = (campaign.ruleConfig.requiredProductIds as string[] | undefined) ?? [];
  const discountAmount = readNumber(campaign.ruleConfig, "discountAmount");
  if (requiredIds.length === 0 || discountAmount <= 0) {
    return { discountAmount: 0, freeShipping: false };
  }
  const inCart = new Set(input.items.map((i) => i.productId));
  const allPresent = requiredIds.every((id) => inCart.has(id));
  return allPresent
    ? { discountAmount: Math.round(discountAmount), freeShipping: false }
    : { discountAmount: 0, freeShipping: false };
}

export function applyFreeShipping(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  // If any matching item is in cart → free shipping
  const anyMatch = input.items.some((item) =>
    matchesCampaign(item.productId, input, campaign),
  );
  return { discountAmount: 0, freeShipping: anyMatch };
}

export function applyFixedAmountOff(
  campaign: Campaign,
  input: CartCalculationInput,
): RuleApplication {
  const amount = readNumber(campaign.ruleConfig, "discountAmount");
  if (amount <= 0) return { discountAmount: 0, freeShipping: false };
  // Only applies when at least one matching item is present
  const anyMatch = input.items.some((item) =>
    matchesCampaign(item.productId, input, campaign),
  );
  return anyMatch
    ? { discountAmount: Math.round(amount), freeShipping: false }
    : { discountAmount: 0, freeShipping: false };
}

export function isActiveNow(campaign: Campaign): boolean {
  if (!campaign.isActive) return false;
  const now = Date.now();
  const start = +new Date(campaign.startDate);
  if (start > now) return false;
  if (campaign.endDate) {
    const end = +new Date(campaign.endDate);
    if (end < now) return false;
  }
  return true;
}

export function evaluateCampaign(
  campaign: Campaign,
  input: CartCalculationInput,
): { result: RuleApplication; campaign: Campaign } | null {
  if (!isActiveNow(campaign)) return null;
  let result: RuleApplication;
  switch (campaign.ruleType) {
    case "percent_off":
      result = applyPercentOff(campaign, input);
      break;
    case "buy_x_get_y_discount":
      result = applyBuyXGetY(campaign, input);
      break;
    case "bundle_discount":
      result = applyBundleDiscount(campaign, input);
      break;
    case "free_shipping":
      result = applyFreeShipping(campaign, input);
      break;
    case "fixed_amount_off":
      result = applyFixedAmountOff(campaign, input);
      break;
    default:
      return null;
  }
  if (result.discountAmount === 0 && !result.freeShipping) return null;
  return { result, campaign };
}

export function asAppliedCampaign(
  campaign: Campaign,
  result: RuleApplication,
): AppliedCampaign {
  return {
    campaignId: campaign.id,
    title: campaign.title,
    ruleType: campaign.ruleType,
    discountAmount: result.discountAmount,
    freeShipping: result.freeShipping,
  };
}
```

- [ ] **Step 3: Write `lib/campaigns/index.ts`**

```typescript
import type { Campaign } from "@/types";

import { asAppliedCampaign, evaluateCampaign } from "./rules";
import type { CartCalculation, CartCalculationInput } from "./types";

export function applyCampaigns(
  input: CartCalculationInput,
  campaigns: Campaign[],
): CartCalculation {
  const subtotal = input.items.reduce(
    (s, item) => s + item.price * item.quantity,
    0,
  );

  const applied = campaigns
    .map((c) => evaluateCampaign(c, input))
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort(
      (a, b) =>
        (b.campaign.displayPriority ?? 0) - (a.campaign.displayPriority ?? 0),
    )
    .map(({ campaign, result }) => asAppliedCampaign(campaign, result));

  const totalDiscount = applied.reduce(
    (s, a) => s + a.discountAmount,
    0,
  );
  const freeShipping = applied.some((a) => a.freeShipping);

  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const shippingCost = freeShipping
    ? 0
    : discountedSubtotal >= input.freeShippingThreshold
      ? 0
      : input.baseShippingCost;

  return {
    subtotal,
    totalDiscount,
    appliedCampaigns: applied,
    shippingCost,
    total: discountedSubtotal + shippingCost,
  };
}

export type {
  AppliedCampaign,
  CartCalculation,
  CartCalculationInput,
} from "./types";
```

- [ ] **Step 4: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/campaigns
git commit -m "feat(campaigns): rule engine for all 5 campaign types"
```

---

### Task 16: Cart applies campaigns + UI display

**Files:**
- Modify: `app/(public)/sepet/page.tsx` (fetch campaigns and products, pass to view)
- Modify: `components/shop/cart-view.tsx` (use the rule engine, render discount lines)

- [ ] **Step 1: Read existing `components/shop/cart-view.tsx`**

Use the Read tool to load the current file. Then perform the replacements below.

- [ ] **Step 2: Replace `components/shop/cart-view.tsx` with the campaign-aware version**

```typescript
"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { applyCampaigns } from "@/lib/campaigns";
import { turkishCities } from "@/lib/mock/data";
import { formatPrice } from "@/lib/utils";
import { buildOrderWhatsAppLink } from "@/lib/whatsapp";
import { useCart } from "@/store/cart";
import type { Campaign, SiteSettings } from "@/types";
import type { ShippingAddress } from "@/types/cart";

const SHIPPING_THRESHOLD = 50000;
const SHIPPING_COST = 500;

interface CartViewProps {
  settings: SiteSettings;
  campaigns: Campaign[];
  productCategoryById: Record<string, string>;
}

export function CartView({
  settings,
  campaigns,
  productCategoryById,
}: CartViewProps) {
  const items = useCart((s) => s.items);
  const isHydrated = useCart((s) => s.isHydrated);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const calc = useMemo(
    () =>
      applyCampaigns(
        {
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
          })),
          productCategoryById,
          baseShippingCost: SHIPPING_COST,
          freeShippingThreshold: SHIPPING_THRESHOLD,
        },
        campaigns,
      ),
    [items, campaigns, productCategoryById],
  );

  const { register, handleSubmit, formState } = useForm<ShippingAddress>({
    mode: "onBlur",
  });

  const onSubmit = handleSubmit((data) => {
    const link = buildOrderWhatsAppLink(
      settings.whatsappNumber,
      items,
      calc.total - calc.shippingCost,
      data,
    );
    window.open(link, "_blank", "noopener,noreferrer");
  });

  if (!isHydrated) {
    return (
      <Container className="py-14">
        <div className="h-8 w-40 animate-pulse rounded-md bg-elevated" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-elevated"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-elevated" />
        </div>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-14 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-elevated">
          <ShoppingBag className="h-7 w-7 text-muted" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sepetiniz boş</h1>
        <p className="max-w-md text-muted">
          Henüz sepete ürün eklemediniz. Mağazaya göz atarak başlayabilirsiniz.
        </p>
        <Link href="/magaza">
          <Button size="lg">Mağazaya Git</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-10 lg:py-14">
      <header className="flex flex-col gap-2 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Sepet
        </h1>
        <p className="text-muted">
          {items.length} ürün — sipariş WhatsApp üzerinden tamamlanır.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-3 sm:p-4"
            >
              <Link
                href={`/urun/${item.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-elevated sm:h-28 sm:w-28"
              >
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col justify-between gap-2">
                <div>
                  {item.brand && (
                    <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                      {item.brand}
                    </p>
                  )}
                  <Link
                    href={`/urun/${item.slug}`}
                    className="line-clamp-2 text-sm font-semibold hover:text-lime-dark dark:hover:text-lime-primary"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {formatPrice(item.price)} / adet
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-xl border border-border">
                    <button
                      type="button"
                      aria-label="Azalt"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      className="grid h-9 w-9 place-items-center rounded-l-xl text-muted hover:text-foreground"
                    >
                      <Minus className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Arttır"
                      disabled={item.quantity >= item.stockQuantity}
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      className="grid h-9 w-9 place-items-center rounded-r-xl text-muted hover:text-foreground disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2.2} />
                      Kaldır
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold tracking-tight">
              Sipariş Özeti
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Ara Toplam</dt>
                <dd className="font-medium tabular-nums">
                  {formatPrice(calc.subtotal)}
                </dd>
              </div>

              {calc.appliedCampaigns.length > 0 && (
                <div className="space-y-2 rounded-xl bg-lime-primary/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-lime-dark dark:text-lime-primary">
                    Uygulanan Kampanyalar
                  </p>
                  {calc.appliedCampaigns.map((a) => (
                    <div
                      key={a.campaignId}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {a.title}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-success">
                        {a.freeShipping && a.discountAmount === 0
                          ? "Kargo bedava"
                          : `−${formatPrice(a.discountAmount)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-muted">Kargo</dt>
                <dd className="font-medium tabular-nums">
                  {calc.shippingCost === 0 ? (
                    <span className="text-success">Bedava</span>
                  ) : (
                    formatPrice(calc.shippingCost)
                  )}
                </dd>
              </div>

              {calc.shippingCost > 0 && calc.subtotal < SHIPPING_THRESHOLD && (
                <p className="rounded-lg bg-elevated px-3 py-2 text-xs text-muted">
                  {formatPrice(SHIPPING_THRESHOLD - calc.subtotal)} daha
                  alışveriş yapın, kargo bedava olsun.
                </p>
              )}

              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Toplam</dt>
                <dd className="tabular-nums">{formatPrice(calc.total)}</dd>
              </div>
            </dl>

            {!showAddressForm ? (
              <Button
                variant="primary"
                size="lg"
                className="mt-5 w-full"
                onClick={() => setShowAddressForm(true)}
              >
                Siparişi Tamamla
              </Button>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">
                    Ad Soyad
                  </label>
                  <input
                    {...register("fullName", { required: true, minLength: 3 })}
                    className="h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    {...register("phone", { required: true, minLength: 10 })}
                    placeholder="05XX XXX XX XX"
                    className="h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted">İl</label>
                    <select
                      {...register("city", { required: true })}
                      className="h-10 w-full rounded-lg border border-border bg-elevated px-2 text-sm text-foreground focus:border-lime-primary focus:outline-none"
                    >
                      <option value="">Seçin</option>
                      {turkishCities.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted">
                      İlçe
                    </label>
                    <input
                      {...register("district", { required: true })}
                      className="h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground focus:border-lime-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">
                    Adres
                  </label>
                  <textarea
                    {...register("detailedAddress", {
                      required: true,
                      minLength: 10,
                    })}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!formState.isValid}
                >
                  WhatsApp ile Siparişi Tamamla
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAddressForm(false)}
                >
                  Geri
                </Button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-elevated p-4 text-xs text-muted">
            <span className="font-semibold text-foreground">Demo modu:</span>{" "}
            Sipariş bilgileriniz WhatsApp linki olarak hazırlanır, gerçek bir
            ödeme alınmaz.
          </div>
        </div>
      </div>
    </Container>
  );
}
```

- [ ] **Step 3: Replace `app/(public)/sepet/page.tsx`**

```typescript
import type { Metadata } from "next";

import { CartView } from "@/components/shop/cart-view";
import { repo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Sepet",
};

export default async function CartPage() {
  const [settings, campaigns, products] = await Promise.all([
    repo.getSettings(),
    repo.listCampaigns(),
    repo.listProducts(),
  ]);

  const productCategoryById = Object.fromEntries(
    products.map((p) => [p.id, p.categoryId]),
  );

  return (
    <CartView
      settings={settings}
      campaigns={campaigns}
      productCategoryById={productCategoryById}
    />
  );
}
```

- [ ] **Step 4: Build + smoke test**

Run: `pnpm build`
Expected: ✓ Compiled.

Run: `pnpm dev`
- Add 5 panel products (cat-panel category) to cart
- Sepet should show "Bahar Kampanyası — 4 Panel Alana 5.si %70 İndirim" applied with the corresponding discount line
- Add a Paket Sistem product → free shipping should kick in
- Total reflects discounts

- [ ] **Step 5: Commit**

```bash
git add components/shop/cart-view.tsx "app/(public)/sepet/page.tsx"
git commit -m "feat(campaigns): apply rules to cart with discount display"
```

---

### Task 17: Stock subscription types + repository methods

**Files:**
- Modify: `lib/data/types.ts`
- Modify: `lib/data/repository.ts`
- Modify: `lib/data/demo-store.ts`
- Modify: `lib/data/demo-repository.ts`

- [ ] **Step 1: Append to `lib/data/types.ts`**

Read the file. Then append at the bottom (before the final re-export line if present, or just append):

```typescript
export interface StockSubscription {
  id: string;
  productId: string;
  email?: string;
  pushSubscriptionJson?: string; // JSON serialized PushSubscription
  isNotified: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Modify `lib/data/repository.ts`**

Read the file. Add to the imports at the top:

```typescript
import type {
  // ... existing imports ...
  StockSubscription,
} from "./types";
```

Then add to the `Repository` interface, after the existing notification methods:

```typescript
  // Stock subscriptions
  listStockSubscriptions(productId?: string): Promise<StockSubscription[]>;
  createStockSubscription(
    data: Omit<StockSubscription, "id" | "isNotified" | "createdAt">,
  ): Promise<StockSubscription>;
  deleteStockSubscription(id: string): Promise<void>;
  markStockSubscriptionNotified(id: string): Promise<void>;
```

- [ ] **Step 3: Modify `lib/data/demo-store.ts`**

Read the file. Add to the import:

```typescript
import type {
  // existing
  StockSubscription,
} from "./types";
```

Add seed array near other seeds:

```typescript
const seedStockSubscriptions: StockSubscription[] = [
  {
    id: "ss-1",
    productId: "p-5", // Solar Sokak Lambası — stockQuantity 0 in seed
    email: "musteri@example.com",
    isNotified: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];
```

In the `DemoStore` interface, add a field:

```typescript
export interface DemoStore {
  // ... existing fields ...
  stockSubscriptions: StockSubscription[];
}
```

In `freshStore()`, include:

```typescript
    stockSubscriptions: structuredClone(seedStockSubscriptions),
```

- [ ] **Step 4: Modify `lib/data/demo-repository.ts`**

Read the file. Add the four method implementations at the end of the `demoRepository` object (just before the closing `};` and `export type` line):

```typescript
  // ===== Stock Subscriptions =====
  async listStockSubscriptions(productId) {
    const all = [...getDemoStore().stockSubscriptions];
    return productId ? all.filter((s) => s.productId === productId) : all;
  },
  async createStockSubscription(data) {
    const store = getDemoStore();
    const subscription = {
      ...data,
      id: genId("ss"),
      isNotified: false,
      createdAt: new Date().toISOString(),
    };
    store.stockSubscriptions.unshift(subscription);
    return subscription;
  },
  async deleteStockSubscription(id) {
    const store = getDemoStore();
    store.stockSubscriptions = store.stockSubscriptions.filter(
      (s) => s.id !== id,
    );
  },
  async markStockSubscriptionNotified(id) {
    const store = getDemoStore();
    const sub = store.stockSubscriptions.find((s) => s.id === id);
    if (sub) sub.isNotified = true;
  },
```

- [ ] **Step 5: Type check + commit**

```bash
pnpm exec tsc --noEmit
git add lib/data
git commit -m "feat(notify): stock subscription types and repository methods"
```

---

### Task 18: Stock subscription API + NotifyWhenAvailable form

**Files:**
- Create: `app/(public)/api/stock-notifications/route.ts`
- Create: `lib/stock-notifications/types.ts`
- Create: `lib/stock-notifications/index.ts`
- Modify: `components/shop/add-to-cart.tsx` (replace mock notify with real form)

- [ ] **Step 1: Write `lib/stock-notifications/types.ts`**

```typescript
export interface SubscribeRequestBody {
  productId: string;
  email?: string;
  pushSubscriptionJson?: string;
}
```

- [ ] **Step 2: Write `lib/stock-notifications/index.ts`**

```typescript
import "server-only";

import { repo } from "@/lib/data";

export async function subscribeToStock(
  productId: string,
  email?: string,
  pushSubscriptionJson?: string,
) {
  if (!email && !pushSubscriptionJson) {
    throw new Error("E-posta veya bildirim aboneliği gerekli");
  }
  return repo.createStockSubscription({
    productId,
    email,
    pushSubscriptionJson,
  });
}

export async function dispatchForProduct(productId: string): Promise<number> {
  const subs = await repo.listStockSubscriptions(productId);
  const pending = subs.filter((s) => !s.isNotified);
  // Demo: just mark notified + push admin notification.
  // Real impl: send email (Resend) + Web Push to subscriptionJson.
  for (const s of pending) {
    await repo.markStockSubscriptionNotified(s.id);
  }
  if (pending.length > 0) {
    const product = await repo.getProductById(productId);
    await repo.pushNotification({
      type: "system",
      title: "Stok Bildirimleri Gönderildi (demo)",
      message: `${product?.name ?? productId} için ${pending.length} aboneye bildirim hazır`,
      relatedId: productId,
      relatedType: "product",
    });
  }
  return pending.length;
}
```

- [ ] **Step 3: Write `app/(public)/api/stock-notifications/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";

import { subscribeToStock } from "@/lib/stock-notifications";

const bodySchema = z.object({
  productId: z.string().min(1),
  email: z.string().email().optional(),
  pushSubscriptionJson: z.string().optional(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" },
      { status: 400 },
    );
  }
  if (!parsed.data.email && !parsed.data.pushSubscriptionJson) {
    return NextResponse.json(
      { error: "E-posta veya bildirim aboneliği gerekli" },
      { status: 400 },
    );
  }
  try {
    const sub = await subscribeToStock(
      parsed.data.productId,
      parsed.data.email,
      parsed.data.pushSubscriptionJson,
    );
    return NextResponse.json({ ok: true, id: sub.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Beklenmeyen hata" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Modify `components/shop/add-to-cart.tsx` — replace the out-of-stock branch**

Read the file. Find this block:

```typescript
  const handleNotifyRequest = () => {
    toast.success("Bilgilendirme talebiniz alındı", {
      description:
        "Demo modda — gerçek entegrasyon eklendiğinde e-posta veya bildirim alacaksınız.",
    });
  };
```

And the inline rendering when `!inStock` that has the single "Gelince Haber Ver" button.

Replace the entire component with this updated version that adds a small email form when out of stock:

```typescript
"use client";

import { Bell, Mail, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockSiteSettings } from "@/lib/mock/data";
import { buildQuickOrderLink } from "@/lib/whatsapp";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";

interface AddToCartProps {
  product: Product;
}

export function AddToCart({ product }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((s) => s.addItem);
  const inStock = product.stockQuantity > 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: product.currentPrice,
      imageUrl: product.media[0]?.url,
      stockQuantity: product.stockQuantity,
      quantity,
    });
    toast.success("Sepete eklendi", {
      description: `${quantity} × ${product.name}`,
      action: {
        label: "Sepete Git",
        onClick: () => {
          window.location.href = "/sepet";
        },
      },
    });
  };

  const whatsappLink = buildQuickOrderLink(
    mockSiteSettings.whatsappNumber,
    product.name,
    product.currentPrice,
  );

  if (!inStock) {
    return <NotifyWhenAvailable productId={product.id} productName={product.name} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Adet:</span>
        <div className="inline-flex items-center rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Azalt"
            className="grid h-10 w-10 place-items-center rounded-l-xl text-muted hover:text-foreground disabled:opacity-40"
          >
            <Minus className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuantity((q) => Math.min(product.stockQuantity, q + 1))
            }
            disabled={quantity >= product.stockQuantity}
            aria-label="Arttır"
            className="grid h-10 w-10 place-items-center rounded-r-xl text-muted hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="primary" size="lg" onClick={handleAddToCart}>
          <ShoppingCart className="h-4 w-4" strokeWidth={2.4} />
          Sepete Ekle
        </Button>
        <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="lg" className="w-full">
            Hemen Satın Al
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted">
        &quot;Hemen Satın Al&quot; WhatsApp üzerinden tamamlanır.
      </p>
    </div>
  );
}

function NotifyWhenAvailable({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Geçerli bir e-posta adresi girin");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/stock-notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, email: trimmed }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Gönderim başarısız");
          return;
        }
        setSubmitted(true);
        toast.success("Bildirim aboneliğiniz alındı", {
          description: `${productName} stoğa girince size haber vereceğiz.`,
        });
      } catch {
        setError("Bağlantı hatası — lütfen tekrar deneyin");
      }
    });
  }

  if (submitted) {
    return (
      <div className="space-y-2 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm">
        <p className="font-medium text-foreground">Aboneliğiniz kaydedildi.</p>
        <p className="text-xs text-muted">
          Ürün stoğa girdiğinde {email} adresine bildirim göndereceğiz.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
      <p className="text-sm font-medium text-foreground">
        Bu ürün şu anda tükenmiş durumda.
      </p>
      <p className="text-xs text-muted">
        E-postanızı bırakın, stoğa girince size haber verelim.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={2.2}
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@eposta.com"
            className="pl-10"
            autoComplete="email"
          />
        </div>
        <Button onClick={submit} disabled={pending}>
          <Bell className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : "Haber Ver"}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Build + smoke + commit**

Run: `pnpm build`
Run: `pnpm dev`
- Navigate to a product with stock 0 (e.g., `/urun/solar-sokak-lambasi-60w`)
- Fill email → click "Haber Ver" → success state appears
- In admin → notification bell shows new system notification

```bash
git add lib/stock-notifications "app/(public)/api/stock-notifications" components/shop/add-to-cart.tsx
git commit -m "feat(notify): stock subscription API and inline form"
```

---

### Task 19: Web Push registration helper + service worker

**Files:**
- Create: `lib/web-push/vapid.ts`
- Create: `lib/web-push/client.ts`
- Create: `public/sw.js`

- [ ] **Step 1: Write `public/sw.js`**

This is a static JS file (not TypeScript) served from public/.

```javascript
// KAYHAN Solar — demo service worker for Web Push.
// Real push payload handling will be wired when VAPID keys are set.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let title = "KAYHAN Solar";
  let body = "Yeni bir bildirim var.";
  let url = "/";
  try {
    if (event.data) {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      url = payload.url || url;
    }
  } catch {
    // payload was not JSON — fall back to defaults
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      badge: "/icons/badge.png",
      icon: "/icons/badge.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});
```

- [ ] **Step 2: Write `lib/web-push/vapid.ts`**

```typescript
export function getPublicVapidKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  return key && key.length > 0 ? key : null;
}

export function isWebPushEnabled(): boolean {
  return getPublicVapidKey() !== null;
}
```

- [ ] **Step 3: Write `lib/web-push/client.ts`**

```typescript
"use client";

import { getPublicVapidKey } from "./vapid";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(safe);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function subscribePush(): Promise<PushSubscription | null> {
  const key = getPublicVapidKey();
  if (!key) return null;
  if (!("Notification" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const reg = await registerServiceWorker();
  if (!reg) return null;
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Add env placeholder**

Read `.env.local.example` and append (if not already present):

```bash

# Web Push (filled later when VAPID keypair generated)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Do the same in `.env.local` (empty values).

- [ ] **Step 5: Build + commit**

Run: `pnpm build`

Run: `pnpm dev` and `curl http://localhost:3000/sw.js` — should return the JavaScript content.

```bash
git add lib/web-push public/sw.js .env.local.example
git commit -m "feat(notify): web push helpers and demo service worker"
```

> **Note:** The "Haber Ver" form (Task 18) still uses email-only in demo mode. Wiring the push subscribe flow is intentionally deferred — when real VAPID keys land, swap the inline form to also call `subscribePush()` and post the JSON to the API.

---

### Task 20: Admin stock subscribers page + auto-dispatch on stock save

**Files:**
- Create: `app/(admin)/kayhan-yonetim/(protected)/stok-bildirimleri/page.tsx`
- Create: `components/admin/stock-subscriber-row.tsx`
- Modify: `app/(admin)/kayhan-yonetim/actions/products.ts` (trigger dispatch on 0→>0)
- Modify: `components/admin/sidebar.tsx` (add menu entry)

- [ ] **Step 1: Write `components/admin/stock-subscriber-row.tsx`**

```typescript
import type { Product } from "@/types";
import type { StockSubscription } from "@/lib/data/types";

import { Badge } from "@/components/ui/badge";

interface Props {
  subscription: StockSubscription;
  product?: Product;
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StockSubscriberRow({ subscription, product }: Props) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {product?.name ?? subscription.productId}
        </p>
        <p className="text-xs text-muted">
          {subscription.email ?? "Push aboneliği"} · {fmt(subscription.createdAt)}
        </p>
      </div>
      {subscription.isNotified ? (
        <Badge tone="success">Gönderildi</Badge>
      ) : product && product.stockQuantity > 0 ? (
        <Badge tone="lime">Gönderime hazır</Badge>
      ) : (
        <Badge tone="warning">Stok bekleniyor</Badge>
      )}
    </li>
  );
}
```

- [ ] **Step 2: Write `app/(admin)/kayhan-yonetim/(protected)/stok-bildirimleri/page.tsx`**

```typescript
import { Bell } from "lucide-react";

import { StockSubscriberRow } from "@/components/admin/stock-subscriber-row";
import { repo } from "@/lib/data";

export default async function AdminStockNotificationsPage() {
  const [subscriptions, products] = await Promise.all([
    repo.listStockSubscriptions(),
    repo.listProducts(),
  ]);
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  const pending = subscriptions.filter((s) => !s.isNotified);
  const sent = subscriptions.filter((s) => s.isNotified);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime-primary/15 text-lime-dark dark:text-lime-primary">
          <Bell className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Stok Bildirimleri
          </h1>
          <p className="mt-1 text-sm text-muted">
            {subscriptions.length} abone — Ürün stoğa girdiğinde otomatik
            bildirim dispatch edilir.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Bekleyen Abonelikler</h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-elevated p-6 text-center text-sm text-muted">
            Bekleyen abonelik yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((s) => (
              <StockSubscriberRow
                key={s.id}
                subscription={s}
                product={productById[s.productId]}
              />
            ))}
          </ul>
        )}
      </section>

      {sent.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Gönderilenler
          </h2>
          <ul className="space-y-2">
            {sent.map((s) => (
              <StockSubscriberRow
                key={s.id}
                subscription={s}
                product={productById[s.productId]}
              />
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-2xl border border-dashed border-border bg-elevated p-4 text-sm text-muted">
        <span className="font-semibold text-foreground">Demo modu:</span>{" "}
        Bildirimler otomatik &quot;Gönderildi&quot; olarak işaretlenir; gerçek
        e-posta/push iletimi Resend ve VAPID anahtarları sağlandığında
        aktive olacak.
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Modify `app/(admin)/kayhan-yonetim/actions/products.ts`**

Read the file. At the top, add:

```typescript
import { dispatchForProduct } from "@/lib/stock-notifications";
```

Inside `updateProductAction`, after `revalidateCatalog(updated.slug);` (and before the `redirect(...)`), insert:

```typescript
  // If stock came back to >0 from 0, dispatch any pending stock subscriptions.
  // We need the prior state to know — fetch via repo.getProductById before update.
```

This requires comparing before vs after. Refactor `updateProductAction` to:

```typescript
export async function updateProductAction(
  id: string,
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();
  const result = parseFormData(formData);
  if ("error" in result) return result;

  const before = await repo.getProductById(id);
  const wasOutOfStock = before ? before.stockQuantity === 0 : false;

  const updated = await repo.updateProduct(id, {
    ...result,
    media: result.media.map((m, i) => ({
      id: m.id ?? `m-${Date.now()}-${i}`,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      altText: m.altText || undefined,
    })),
    technicalSpecs: result.technicalSpecs ?? {},
    compareAtPrice: result.compareAtPrice || undefined,
    supplierUrl: result.supplierUrl || undefined,
    supplierPrice: result.supplierPrice || undefined,
    markupPercentage: result.markupPercentage || undefined,
    brand: result.brand || undefined,
    longDescription: result.longDescription || undefined,
  });

  if (wasOutOfStock && updated.stockQuantity > 0) {
    await dispatchForProduct(id);
  }

  revalidateCatalog(updated.slug);
  redirect(`/kayhan-yonetim/urunler`);
}
```

- [ ] **Step 4: Modify `components/admin/sidebar.tsx`**

Read the file. Find the `items` array. Add this entry between `bildirimler` and `urunler`:

```typescript
  { href: "/kayhan-yonetim/stok-bildirimleri", label: "Stok Bildirimleri", icon: BellRing },
```

Update the imports from `lucide-react` to include `BellRing`.

- [ ] **Step 5: Build + smoke + commit**

Run: `pnpm build`
Run: `pnpm dev`
- Visit `/kayhan-yonetim/stok-bildirimleri` → seeded subscription for p-5 (Solar Sokak Lambası) is "Bekleyen"
- In admin, edit p-5 → change stock from 0 to 10 → save
- Refresh stok-bildirimleri → seeded subscription now in "Gönderilenler" with "Gönderildi" badge
- Bildirimler bell shows new system notification

```bash
git add app/\(admin\) components/admin
git commit -m "feat(notify): admin subscribers page + auto-dispatch on stock restock"
```

---

**✓ End of Sub-Phase 4C.** Cart applies all campaign rules; out-of-stock products take email subscriptions; admin sees subscribers + auto-dispatch fires when stock comes back.

---

# Sub-Phase 4D — Güvenlik + Verify

Outcome: Cloudflare Turnstile is wired but renders nothing when env keys are missing (demo passthrough); a basic in-memory rate limiter protects the offer + stock subscription endpoints; the whole branch passes a manual smoke test and gets a Verification Report.

---

### Task 21: Cloudflare Turnstile placeholder

**Files:**
- Create: `lib/turnstile/index.ts`
- Create: `components/security/turnstile.tsx`
- Modify: `.env.local.example` + `.env.local` (add Turnstile env entries)
- Modify: `components/offer-wizard/step-confirm.tsx` (mount the Turnstile widget above the submit button)
- Modify: `app/(public)/teklif-al/actions/submit.ts` (verify token when enabled)

- [ ] **Step 1: Add env entries**

Read `.env.local.example`. Append:

```bash

# Cloudflare Turnstile (filled later)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

Add same empty entries to `.env.local`.

- [ ] **Step 2: Write `lib/turnstile/index.ts`**

```typescript
import "server-only";

export function getTurnstileSiteKey(): string | null {
  const k = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return k && k.length > 0 ? k : null;
}

export function isTurnstileEnabled(): boolean {
  const site = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  return Boolean(site && secret);
}

export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  if (!isTurnstileEnabled()) return true; // demo passthrough
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY ?? "",
          response: token,
        }),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Write `components/security/turnstile.tsx`**

```typescript
"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

interface Props {
  siteKey: string | null;
  onToken: (token: string) => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function Turnstile({ siteKey, onToken, onExpire }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    function tryRender() {
      if (cancelled) return;
      if (!window.turnstile || !ref.current) {
        setTimeout(tryRender, 200);
        return;
      }
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey!,
        callback: onToken,
        "expired-callback": onExpire,
        theme: "auto",
      });
    }
    tryRender();
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore — widget may already be gone
        }
      }
    };
  }, [siteKey, onToken, onExpire]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <div ref={ref} className="my-2" />
    </>
  );
}
```

- [ ] **Step 4: Modify `components/offer-wizard/step-confirm.tsx`**

The wizard's confirm step needs to gate submission on a captcha token when Turnstile is enabled. Read the file. Make these changes:

Add imports at the top:

```typescript
import { Turnstile } from "@/components/security/turnstile";
```

Add a state ref for the token and a site key prop. Since this is a client component and env can be read via `process.env.NEXT_PUBLIC_*` at build time, do:

Inside `StepConfirm` (function body), declare:

```typescript
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
  const captchaRequired = Boolean(siteKey);
```

Update `handleSubmit` to also include `captchaToken`:

```typescript
  function handleSubmit() {
    if (!data.kvkkAccepted) {
      setError("KVKK aydınlatma metnini onaylayın");
      return;
    }
    if (captchaRequired && !captchaToken) {
      setError("Lütfen güvenlik doğrulamasını tamamlayın");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitOfferAction(data, captchaToken);
      if (!result.ok) {
        setError(result.error ?? "Gönderim başarısız");
        toast.error("Gönderilemedi", { description: result.error });
        return;
      }
      toast.success("Teklifiniz alındı");
      onSuccess();
    });
  }
```

Above the submit Button (in the JSX, just before the final `<div className="flex items-center justify-between gap-3">` block), add:

```typescript
      <Turnstile
        siteKey={siteKey}
        onToken={setCaptchaToken}
        onExpire={() => setCaptchaToken(null)}
      />
```

- [ ] **Step 5: Modify `app/(public)/teklif-al/actions/submit.ts`**

Read the file. Add the import:

```typescript
import { verifyTurnstileToken } from "@/lib/turnstile";
```

Change the signature of `submitOfferAction` to accept an optional token, and verify it before creating the offer. Replace the function with:

```typescript
export async function submitOfferAction(
  data: WizardState,
  captchaToken: string | null = null,
): Promise<SubmitOfferResult> {
  const captchaOk = await verifyTurnstileToken(captchaToken);
  if (!captchaOk) {
    return { ok: false, error: "Güvenlik doğrulaması başarısız" };
  }

  const parsed = finalSubmitSchema.safeParse({
    fullName: data.fullName,
    city: data.city,
    district: data.district,
    phone: data.phone,
    email: data.email || undefined,
    installationLocation: data.installationLocation,
    installationAddress: data.installationAddress,
    media: data.media,
    appliances: data.appliances,
    detailedDescription: data.detailedDescription,
    kvkkAccepted: data.kvkkAccepted,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Form geçersiz",
    };
  }

  const offer = await repo.createOffer({
    fullName: parsed.data.fullName,
    city: parsed.data.city,
    district: parsed.data.district,
    installationLocation: parsed.data.installationLocation,
    installationAddress: parsed.data.installationAddress,
    appliances: parsed.data.appliances,
    detailedDescription: parsed.data.detailedDescription,
    phone: parsed.data.phone,
    email: parsed.data.email ?? undefined,
  });

  revalidatePath("/kayhan-yonetim");
  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim/bildirimler");

  return { ok: true, offerId: offer.id };
}
```

- [ ] **Step 6: Build + smoke + commit**

Run: `pnpm build`
Expected: ✓ Compiled.

Run: `pnpm dev`
- Open `/teklif-al`, advance to confirm step
- Since `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is empty in demo, no widget renders
- Submission works as before

```bash
git add lib/turnstile components/security "components/offer-wizard/step-confirm.tsx" "app/(public)/teklif-al/actions/submit.ts" .env.local.example
git commit -m "feat(security): Cloudflare Turnstile env-driven placeholder"
```

---

### Task 22: Rate limit utility

**Files:**
- Create: `lib/rate-limit/index.ts`
- Modify: `app/(public)/teklif-al/actions/submit.ts` (apply rate limit by phone)
- Modify: `app/(public)/api/stock-notifications/route.ts` (apply rate limit by IP)

- [ ] **Step 1: Write `lib/rate-limit/index.ts`**

```typescript
import "server-only";

interface Bucket {
  count: number;
  resetAt: number;
}

interface LimiterOptions {
  windowMs: number;
  max: number;
}

const buckets = new Map<string, Bucket>();

// Prune expired buckets every ~5 minutes to keep map small.
let lastPrune = Date.now();
function maybePrune() {
  const now = Date.now();
  if (now - lastPrune < 300_000) return;
  lastPrune = now;
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkLimit(
  key: string,
  options: LimiterOptions,
): RateLimitResult {
  maybePrune();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= options.max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

// Convenience: 3 offers per 24h per phone number
export function checkOfferRateLimit(phone: string): RateLimitResult {
  const normalized = phone.replace(/\D/g, "");
  return checkLimit(`offer:${normalized}`, {
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
  });
}

// Convenience: 5 subscribe attempts per hour per IP
export function checkStockSubscribeRateLimit(ip: string): RateLimitResult {
  return checkLimit(`stocksub:${ip}`, {
    windowMs: 60 * 60 * 1000,
    max: 5,
  });
}
```

- [ ] **Step 2: Modify `app/(public)/teklif-al/actions/submit.ts`**

Read the file. Add the import:

```typescript
import { checkOfferRateLimit } from "@/lib/rate-limit";
```

Inside `submitOfferAction`, AFTER the captcha check and BEFORE `finalSubmitSchema.safeParse(...)`, add:

```typescript
  const limit = checkOfferRateLimit(data.phone);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Çok fazla deneme. Lütfen ${Math.ceil(limit.retryAfterSec / 60)} dakika sonra tekrar deneyin.`,
    };
  }
```

- [ ] **Step 3: Modify `app/(public)/api/stock-notifications/route.ts`**

Read the file. Add the import:

```typescript
import { checkStockSubscribeRateLimit } from "@/lib/rate-limit";
```

At the start of the `POST` function, before parsing the body, add:

```typescript
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limit = checkStockSubscribeRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Çok fazla istek. Lütfen ${Math.ceil(limit.retryAfterSec / 60)} dakika sonra tekrar deneyin.`,
      },
      { status: 429 },
    );
  }
```

- [ ] **Step 4: Build + commit**

Run: `pnpm build`

```bash
git add lib/rate-limit "app/(public)/teklif-al/actions/submit.ts" "app/(public)/api/stock-notifications/route.ts"
git commit -m "feat(security): in-memory rate limit for offer + stock subscribe"
```

---

### Task 23: End-to-end verification + Faz 4 report

**Files (verification only):**
- Run: build, lint, tsc, manual browser flow
- Create: `docs/verification/2026-05-11-faz-4.md`

- [ ] **Step 1: Clean checks**

```bash
cd "c:/SOLAR S1TE/kayhan-solar"
pnpm exec eslint . --ext .ts,.tsx --max-warnings 0
pnpm exec tsc --noEmit
pnpm build
```

Expected:
- ESLint: 0 errors, 0 warnings
- tsc: no output
- Build: ✓ Compiled, route table now includes:
  - `/galeri/[slug]` (SSG with seeded slugs)
  - `/api/search`, `/api/stock-notifications`
  - `/kayhan-yonetim/stok-bildirimleri`
  - `/sitemap.xml`, `/robots.txt`, `/opengraph-image`
  - The dynamic admin product/campaign/gallery edit pages (unchanged from Faz 3)

- [ ] **Step 2: Customer flow (incognito browser)**

Run `pnpm dev`. In an incognito window:

1. Visit `/` → home renders, search icon in header
2. Press `Ctrl+K` → search dialog opens; type "panel" → results appear in 3 groups
3. Click a product → goes to `/urun/<slug>`; view source confirms `<script type="application/ld+json">` with Product schema
4. Add to cart from a panel product, then add 4 more panels total → go to `/sepet` → "Bahar Kampanyası" appears in Uygulanan Kampanyalar with discount line
5. Add a paket-systems product → free shipping kicks in
6. Visit `/galeri` → cards link to detail pages; click one → detail renders
7. Visit `/teklif-al` → wizard welcome screen
8. Walk through all 6 steps, fill realistic data
9. On confirm step, since Turnstile is not configured, no widget renders; check KVKK and submit
10. Success step shows; reload page → wizard remembers state in localStorage but resets after success path
11. Visit out-of-stock product (`/urun/solar-sokak-lambasi-60w`) → submit email for stock notification → confirmation appears
12. Visit `/robots.txt` and `/sitemap.xml` → both return valid content
13. Visit `/opengraph-image` → cyber-lime image renders

- [ ] **Step 3: Admin flow**

In a separate browser (or same after sign-in):

1. Sign in to `/kayhan-yonetim`
2. Dashboard shows new offer count incremented (from wizard submission)
3. Visit `/kayhan-yonetim/teklifler` → new offer appears as "Yeni"
4. Visit `/kayhan-yonetim/stok-bildirimleri` → new email subscription for the out-of-stock product
5. Edit that product → set stock from 0 to 5 → save
6. Refresh `/kayhan-yonetim/stok-bildirimleri` → subscription now "Gönderildi"
7. Notification bell shows new "Stok Bildirimleri Gönderildi (demo)" system notification

- [ ] **Step 4: Write `docs/verification/2026-05-11-faz-4.md`**

```markdown
# M4 Verification Report — Faz 4 Gelişmiş Özellikler

**Tarih:** 2026-05-11
**Plan:** docs/plans/2026-05-11-faz-4-gelismis-ozellikler.md
**Tamamlanan görev sayısı:** 23 / 23
**Önceki commit:** Faz 3 verification report

## Yapılan
- Sub-Phase 4A — 6 adımlı Teklif Al wizard (localStorage persistence, per-step validation, KVKK onayı)
- Sub-Phase 4B — Galeri detay sayfası, Cmd+K site arama, sitemap.xml, robots.txt, OG fallback image, Product JSON-LD
- Sub-Phase 4C — Sepet kampanya kurallarını uyguluyor (5 rule type), out-of-stock email aboneliği, admin subscribers sayfası, otomatik dispatch on restock
- Sub-Phase 4D — Cloudflare Turnstile env-driven placeholder, in-memory rate limit (offer + stock subscribe)

## Test edildi
- pnpm build → tüm route'lar ✓ (38+ sayfa)
- ESLint + tsc → 0 hata
- Müşteri akışı: wizard, search, gallery, campaign in cart, stock notify subscribe
- Admin akışı: yeni offer & bell, stok bildirim dispatch trigger

## Düzeltildi
[Karşılaşılan + çözülen edge case'ler]

## Bilinen eksikler (sonraki fazlara)
- Web Push gerçek implementation (VAPID anahtarlar gelince — sub & dispatch hazır)
- Resend email gerçek gönderim (anahtar gelince)
- Cloudflare Turnstile gerçek anahtar (production deploy'da)
- AI asistan (Faz 5)
- Analitik dashboard (Faz 5)
- Multi-user auth (Faz 6 — Supabase Auth)

## Sıradaki adım
Faz 5 — AI Asistan + Analitik + KVKK çerez banner.
```

- [ ] **Step 5: Commit**

```bash
git add docs/verification/2026-05-11-faz-4.md
git commit -m "docs: Faz 4 verification report"
```

---

**✓ End of Faz 4.** Customer-facing depth complete: multi-step quote form, search, gallery detail, sitemap, robots, product structured data, cart campaign engine, stock notification subscription with auto-dispatch, env-driven Turnstile, basic rate limiting.

---

# Swap-to-Real-Services Checklist

When real API keys arrive, here's the runway for each integration:

| Service | Env vars | What to change |
|---|---|---|
| **Resend (email)** | `RESEND_API_KEY`, `ADMIN_EMAIL` | Implement `lib/email/resend.ts` to send (a) admin offer alerts and (b) stock back-in-stock messages. Wire into `repo.createOffer` and `dispatchForProduct`. |
| **Web Push** | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Run `npx web-push generate-vapid-keys`. Update `NotifyWhenAvailable` to also call `subscribePush()` and POST the JSON. Implement server-side push in `dispatchForProduct` using the `web-push` package. |
| **Cloudflare Turnstile** | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Set the env vars; widget auto-renders on the wizard's confirm step. `verifyTurnstileToken` already wired in `submitOfferAction`. |
| **Supabase** | (see Faz 3 swap checklist) | Repository implementations in `lib/data/supabase-repository.ts` and `lib/auth/supabase-provider.ts`. |

---

# Self-Review

**1. Spec coverage:**

| Spec requirement (from arguments) | Covered by task |
|---|---|
| Multi-step Teklif Al formu (6 steps) | Tasks 1–6 |
| Galeri detay `/galeri/[slug]` | Task 9 |
| Kampanya kurallarının sepette uygulanması | Tasks 15–16 |
| Stok bildirimi (Web Push + email kaydı, demo mock) | Tasks 17–20 |
| Site genelinde arama (autocomplete) | Tasks 10–11 |
| SEO meta + sitemap.xml + robots.txt | Tasks 12–14 |
| Cloudflare Turnstile env-driven placeholder | Task 21 |
| Master plan §6.5, §6.6, §6.4, §9, §12 mapping | All covered |
| Demo modda swap-flag mimari korunuyor | All new services (Turnstile, Web Push) follow demo-passthrough pattern |
| No automated tests | All tasks end in manual verify + build/lint/tsc |

**2. Placeholder scan:** No "TBD" / "implement later" / "similar to Task N" patterns. Each task contains full code.

**3. Type consistency:**
- `WizardState`, `WizardAppliance`, `WizardMediaRef` defined in `types/offer-wizard.ts` and used identically in hook, steps, server action.
- `Repository.createStockSubscription` signature matches `StockSubscription` type minus the auto-generated fields, and `demo-repository.ts` implementation satisfies it.
- `Campaign["ruleType"]` enum values match what the rule engine switches on.
- `AppliedCampaign` shape from `lib/campaigns/types.ts` matches what `cart-view.tsx` renders.
- `submitOfferAction(data, captchaToken)` signature consistent between server file and the `step-confirm.tsx` caller after Task 21's update.

No bugs found in cross-task identifiers. Plan ready for execution.

---

# Execution Handoff

Plan complete and saved to `docs/plans/2026-05-11-faz-4-gelismis-ozellikler.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, two-stage review between tasks, fast iteration. Same workflow as Faz 3 — already proven on this codebase.

**2. Inline Execution** — Execute tasks in this session, batch with checkpoints at sub-phase boundaries (4A, 4B, 4C, 4D).

Which approach?
