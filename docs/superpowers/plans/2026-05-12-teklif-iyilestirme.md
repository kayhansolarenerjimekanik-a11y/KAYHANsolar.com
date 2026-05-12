# Teklif Akışı İyileştirme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teklif akışını uçtan uca cilala — müşteri success ekranını eylem yönlendirici hale getir, wizard'a adım sayacı ekle, admin yanıt formundan müşteriye otomatik email gönder, admin tarafına manuel teklif oluşturma akışı ekle.

**Architecture:** Mevcut Resend altyapısı üzerine 2 yeni email helper ve şablon ekleniyor. Müşteri tarafı `step-success` zenginleşiyor, `WizardShell` server'dan WhatsApp numarası prop'u alıyor. Admin tarafı `updateOfferAction` durum=responded olunca müşteriye yanıt emaili gönderiyor. Manuel teklif için yeni route + tek sayfa form + ayrı zod schema ekleniyor.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Supabase (canlı), Resend, zod, Tailwind 4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-12-teklif-iyilestirme-design.md`

**Verification per task:** Bu projede unit test runner kurulu değil. Her görev sonunda:
```
pnpm exec tsc --noEmit && pnpm lint
```
sıfır hata + sıfır uyarı vermeli. Görev belirtirse manuel smoke testi yap. Sonra commit.

---

## Task 1: Yanıt emaili şablonu (`offer-response.tsx`)

**Files:**
- Create: `lib/email/templates/offer-response.tsx`

- [ ] **Step 1: Şablon dosyasını oluştur**

```tsx
// lib/email/templates/offer-response.tsx
import { calculateSystem } from "@/lib/solar-calculator";
import { formatPrice } from "@/lib/utils";
import type { Offer } from "@/lib/data/types";

export function renderOfferResponseEmail(
  offer: Offer,
  adminResponse: string,
): string {
  const calc = calculateSystem(
    offer.appliances.map((a) => ({ name: a.name, powerW: a.powerW })),
  );

  const calcRows =
    calc.totalPowerW === 0
      ? ""
      : `
      <h2 style="margin:24px 0 12px;font-size:16px;">Sistem Tahmini</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;">
        <tr><td style="padding:6px 0;color:#94a3b8;width:160px;">Toplam Güç</td><td>${calc.totalPowerW.toLocaleString("tr-TR")} W</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Günlük Tüketim</td><td>${calc.dailyEnergyKwh.toFixed(1)} kWh</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Aylık Tüketim</td><td>${calc.monthlyEnergyKwh.toFixed(0)} kWh</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Önerilen Panel (550W)</td><td>${calc.panelCount} adet</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Önerilen İnverter</td><td>${calc.recommendedInverterKw} kW</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Önerilen Batarya (48V)</td><td>${calc.recommendedBatteryAh} Ah</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Kabataslak Yatırım</td><td><strong>${escape(formatPrice(calc.roughCostTry))}</strong></td></tr>
      </table>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Bu tahmin saha keşfi sonrasında kesinleşecektir. ±%10 değişebilir.</p>`;

  const waLink = waUrl(offer.fullName);

  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Teklif Yanıtınız</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#c7ff00;color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">K</div>
        <strong style="font-size:16px;">KAYHAN Solar</strong>
      </div>

      <h1 style="margin:0 0 8px;font-size:22px;">Teklif Yanıtınız Hazır</h1>
      <p style="margin:0 0 20px;color:#475569;">Sayın ${escape(offer.fullName)}, aşağıda teklifiniz için hazırladığımız yanıt yer alıyor.</p>

      <div style="padding:20px;background:#f1f5f9;border-radius:12px;white-space:pre-wrap;font-size:14px;line-height:1.6;">${escape(adminResponse)}</div>

      ${calcRows}

      <div style="margin-top:28px;display:flex;flex-wrap:wrap;gap:10px;">
        <a href="${waLink}" style="display:inline-block;padding:12px 20px;background:#25d366;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">WhatsApp'tan İletişime Geç</a>
        <a href="${siteUrl()}/magaza" style="display:inline-block;padding:12px 20px;background:#c7ff00;color:#000;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Mağazamızı İncele</a>
      </div>

      <hr style="margin:32px 0 16px;border:none;border-top:1px solid #e2e8f0;" />
      <p style="margin:0;font-size:12px;color:#64748b;">Bu e-posta KAYHAN Solar teklif değerlendirme süreciniz kapsamında gönderilmiştir. KVKK aydınlatma metnimize <a href="${siteUrl()}/kvkk" style="color:#475569;">${siteUrl()}/kvkk</a> adresinden ulaşabilirsiniz.</p>
    </div>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";
}

function waUrl(fullName: string): string {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "905555555555").replace(/\D/g, "");
  const text = encodeURIComponent(
    `Merhaba, ${fullName}. Teklifimle ilgili görüşmek istiyorum.`,
  );
  return `https://wa.me/${phone}?text=${text}`;
}
```

> **Not:** WhatsApp linki burada ENV'den alınıyor. Email sunucudan gönderiliyor; site ayarlarına async erişim email build sırasında istenmiyor — env yeterli. Site numarası `NEXT_PUBLIC_WHATSAPP_NUMBER` zaten Faz 1'de eklendi mi diye kontrol için: yoksa fallback "905555555555" gider (zararsız placeholder, admin yanıtı zaten WhatsApp linki içermek zorunda değil; client tarafı site settings'ten okuyacak).

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add lib/email/templates/offer-response.tsx
git commit -m "feat(email): offer-response sablonu (yanit + sistem tahmini)"
```

---

## Task 2: Manuel kayıt emaili şablonu (`offer-created.tsx`)

**Files:**
- Create: `lib/email/templates/offer-created.tsx`

- [ ] **Step 1: Şablon dosyasını oluştur**

```tsx
// lib/email/templates/offer-created.tsx
import type { Offer } from "@/lib/data/types";

export function renderOfferCreatedEmail(offer: Offer): string {
  const installationLabel =
    offer.installationLocation === "roof"
      ? "Çatı"
      : offer.installationLocation === "land"
        ? "Arazi"
        : "Diğer";

  const createdAt = new Date(offer.createdAt).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Talebiniz Alındı</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#c7ff00;color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">K</div>
        <strong style="font-size:16px;">KAYHAN Solar</strong>
      </div>

      <h1 style="margin:0 0 8px;font-size:22px;">Talebiniz Alındı</h1>
      <p style="margin:0 0 20px;color:#475569;">Sayın ${escape(offer.fullName)}, telefonda görüştüğümüz teklif talebiniz sistemimize kaydedildi.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#94a3b8;width:160px;">İl / İlçe</td><td>${escape(offer.city)} / ${escape(offer.district)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Kurulum yeri</td><td>${installationLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Kayıt tarihi</td><td>${escape(createdAt)}</td></tr>
      </table>

      <p style="margin:24px 0 0;color:#475569;">Detaylı yanıtımız 24 saat içinde size iletilecektir.</p>

      <div style="margin-top:24px;">
        <a href="${siteUrl()}" style="display:inline-block;padding:12px 20px;background:#c7ff00;color:#000;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Anasayfaya Git</a>
      </div>
    </div>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";
}
```

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add lib/email/templates/offer-created.tsx
git commit -m "feat(email): offer-created sablonu (manuel kayit bildirimi)"
```

---

## Task 3: Resend helper'larını ekle

**Files:**
- Modify: `lib/email/resend.ts`

- [ ] **Step 1: `sendOfferResponseEmail` ve `sendOfferCreatedEmail` fonksiyonlarını ekle**

`lib/email/resend.ts` dosyasının sonuna (dosyanın en altında, `sendOrderStatusEmail` fonksiyonundan sonra) ekle:

```ts
export async function sendOfferResponseEmail(
  offer: Offer,
  adminResponse: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!offer.email) return { ok: false, error: "Müşteri e-postası yok" };
  const { renderOfferResponseEmail } = await import("./templates/offer-response");
  const html = renderOfferResponseEmail(offer, adminResponse);
  return send({
    to: offer.email,
    subject: "Teklif Yanıtınız — KAYHAN Solar",
    html,
  });
}

export async function sendOfferCreatedEmail(
  offer: Offer,
): Promise<{ ok: boolean; error?: string }> {
  if (!offer.email) return { ok: false, error: "Müşteri e-postası yok" };
  const { renderOfferCreatedEmail } = await import("./templates/offer-created");
  const html = renderOfferCreatedEmail(offer);
  return send({
    to: offer.email,
    subject: "Talebiniz Alındı — KAYHAN Solar",
    html,
  });
}
```

> **Önemli:** Bu iki fonksiyon `send()`'in `{ ok, error }` sonucunu **döndürüyor** (mevcut `sendNewOfferEmail` `void` dönüyordu). Çağıran kod sonucu okuyacak. Hata durumunda `send()` zaten throw etmiyor, sadece `{ ok: false, error }` döner.

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı. `Offer` tipi dosyanın başında zaten import edilmiş.

- [ ] **Step 3: Commit**

```bash
git add lib/email/resend.ts
git commit -m "feat(email): sendOfferResponseEmail + sendOfferCreatedEmail helper"
```

---

## Task 4: Step indicator — "Adım X/5" etiketi

**Files:**
- Modify: `components/offer-wizard/step-indicator.tsx`

- [ ] **Step 1: Üst etiket bloğu ekle**

`components/offer-wizard/step-indicator.tsx` içeriğini tamamen değiştir:

```tsx
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
  const countedSteps = STEP_ORDER.filter((s) => s !== "success");
  const currentIndex = countedSteps.indexOf(current);
  const total = countedSteps.length;

  return (
    <div className="space-y-3">
      {currentIndex >= 0 && (
        <p className="text-xs font-medium tracking-wide text-muted">
          <span className="tabular-nums text-foreground">
            Adım {currentIndex + 1}/{total}
          </span>{" "}
          — {STEP_LABELS[current]}
        </p>
      )}

      <nav aria-label="Adım göstergesi" className="overflow-x-auto">
        <ol className="flex min-w-fit items-center gap-2">
          {countedSteps.map((id, idx) => {
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
                {idx < countedSteps.length - 1 && (
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
    </div>
  );
}
```

> **Değişiklikler:**
> - `countedSteps` = `STEP_ORDER` - "success" (5 adım).
> - Üst satıra "Adım X/Y — Etiket" eklendi (tabular-nums ile yerleşim sabit).
> - `success` adımına denk gelirse (`currentIndex === -1`) üst etiket gizleniyor — zaten WizardShell success ekranında indicator'ı render etmiyor, ama defansif.

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Manuel smoke**

`pnpm dev` çalıştır, `/teklif-al` adresini aç. Welcome'da "Adım 1/5 — Başlangıç" görünmeli. İleri tuşuyla 2/5, 3/5, ..., 5/5'e kadar gitmeli. Sonra confirm sonrası success ekranında indicator hiç görünmemeli (mevcut davranış, değişmedi).

- [ ] **Step 4: Commit**

```bash
git add components/offer-wizard/step-indicator.tsx
git commit -m "feat(wizard): adim X/5 sayaci eklendi"
```

---

## Task 5: WizardShell prop akışı ile WhatsApp numarası

**Files:**
- Modify: `components/offer-wizard/wizard-shell.tsx`
- Modify: `app/(public)/teklif-al/page.tsx`

- [ ] **Step 1: `WizardShell` propunu ekle**

`components/offer-wizard/wizard-shell.tsx` tamamı:

```tsx
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

interface Props {
  whatsappNumber: string | null;
}

export function WizardShell({ whatsappNumber }: Props) {
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
        {wizard.step === "success" && (
          <StepSuccess
            onReset={wizard.reset}
            whatsappNumber={whatsappNumber}
            customerName={wizard.data.fullName}
          />
        )}
      </div>
    </Container>
  );
}
```

> **Değişiklikler:** `Props` interface'i + `whatsappNumber: string | null` ve `customerName` propları `StepSuccess`'e geçiyor (mesaj için kullanılacak).

- [ ] **Step 2: `/teklif-al/page.tsx`'i server'da settings çekecek şekilde değiştir**

`app/(public)/teklif-al/page.tsx` tamamı:

```tsx
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
```

- [ ] **Step 3: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata. `StepSuccess`'in tip imzası bir sonraki task'ta güncellenecek, şimdilik fail edebilir — eğer eder ise commit etmeden Task 6'ya geç. (Aslında StepSuccess'i Task 6'da güncelleyeceğiz; tsc bu task'ta hata verirse bunu Task 6 sonunda doğrulayacağız.)

> **Plan kuralı:** Task 5'in tsc check'i Task 6 ile birlikte yeşil olmalı. Önce Step 4'ü yap, sonra Task 6'ya geç, ikisi bitince commit'le. Aşağıdaki commit'i Task 6'nın commit'iyle birleştir.

- [ ] **Step 4: Henüz commit etme — Task 6'yı bitir, sonra ikisini birlikte commit et**

(Bu task açık kalır.)

---

## Task 6: `step-success` zenginleştirme

**Files:**
- Modify: `components/offer-wizard/step-success.tsx`

- [ ] **Step 1: `StepSuccess`'i yeni proplarla ve içerikle güncelle**

`components/offer-wizard/step-success.tsx` tamamı:

```tsx
"use client";

import { CheckCircle2, Home, MessageCircle, Phone, ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface Props {
  onReset: () => void;
  whatsappNumber: string | null;
  customerName: string;
}

const NEXT_STEPS = [
  "Ekibimiz 24 saat içinde sizi arayacak.",
  "Saha keşfi için size uygun bir randevu planlanacak.",
  "Detaylı teklif e-posta veya WhatsApp ile size iletilecek.",
];

export function StepSuccess({ onReset, whatsappNumber, customerName }: Props) {
  const waLink = whatsappNumber
    ? buildWaLink(whatsappNumber, customerName)
    : null;

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-10 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-lime-primary/20 text-lime-dark dark:text-lime-primary">
        <CheckCircle2 className="h-10 w-10" strokeWidth={2.2} />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Teklifiniz Başarıyla İletildi
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted">
          Bilgileriniz ekibimize ulaştı. En geç 24 saat içinde size telefon
          veya e-posta ile dönüş yapacağız.
        </p>
      </div>

      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 text-left">
        <h3 className="text-sm font-semibold tracking-tight">Sırada Ne Var?</h3>
        <ol className="mt-3 space-y-3">
          {NEXT_STEPS.map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-primary text-xs font-semibold text-black tabular-nums">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/">
          <Button size="lg" variant="primary">
            <Home className="h-4 w-4" strokeWidth={2.4} />
            Anasayfaya Dön
          </Button>
        </Link>
        <Link href="/magaza">
          <Button size="lg" variant="outline">
            <ShoppingBag className="h-4 w-4" strokeWidth={2.2} />
            Mağazaya Göz At
          </Button>
        </Link>
        {waLink && (
          <Link href={waLink} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline">
              <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
              WhatsApp&apos;la İletişim
            </Button>
          </Link>
        )}
        {!waLink && (
          <Link href="/iletisim">
            <Button size="lg" variant="outline">
              <Phone className="h-4 w-4" strokeWidth={2.2} />
              İletişim Sayfası
            </Button>
          </Link>
        )}
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

function buildWaLink(whatsappNumber: string, customerName: string): string {
  const clean = whatsappNumber.replace(/\D/g, "");
  const text = encodeURIComponent(
    customerName.trim()
      ? `Merhaba, ben ${customerName}. Az önce siteden bir teklif gönderdim, görüşmek isterim.`
      : "Merhaba, az önce siteden bir teklif gönderdim, görüşmek isterim.",
  );
  return `https://wa.me/${clean}?text=${text}`;
}
```

> **Davranış:**
> - WhatsApp numarası varsa "WhatsApp'la İletişim" butonu görünür, müşterinin adıyla pre-fill mesaj.
> - WhatsApp numarası yoksa yerine "İletişim Sayfası" butonu (`/iletisim`).
> - Sıradaki 3 adım numaralı kartlar halinde.

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Manuel smoke**

`pnpm dev` çalıştır:
1. `/teklif-al` baştan sona doldur (Ad: "Test Kullanıcı", telefon, il/ilçe, kurulum, en az 1 cihaz, açıklama, KVKK).
2. Submit sonrası success ekranı:
   - "Teklifiniz Başarıyla İletildi" başlığı.
   - 3 numaralı sıralı adım kartları.
   - 3 buton: Anasayfa, Mağaza, WhatsApp (numara varsa) veya İletişim (numara yoksa).
3. WhatsApp tuşuna tıkla → `wa.me/<numara>?text=...` açılsın, mesaj kullanıcı adıyla pre-fill olsun.

- [ ] **Step 4: Task 5 + Task 6 birlikte commit**

```bash
git add components/offer-wizard/wizard-shell.tsx \
        components/offer-wizard/step-success.tsx \
        app/(public)/teklif-al/page.tsx
git commit -m "feat(wizard): step-success zenginlestirme + whatsappNumber prop akisi"
```

---

## Task 7: Admin `updateOfferAction` — yanıt emaili tetikle

**Files:**
- Modify: `app/(admin)/kayhan-yonetim/actions/offers.ts`

- [ ] **Step 1: Action'ı email gönderimini içerecek şekilde güncelle**

`app/(admin)/kayhan-yonetim/actions/offers.ts` tamamı:

```ts
"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { sendOfferResponseEmail } from "@/lib/email/resend";
import { offerUpdateSchema } from "@/lib/validations/offer";

export interface OfferActionState {
  error?: string;
  success?: boolean;
  emailSent?: boolean;
  emailWarning?: string;
}

export async function updateOfferAction(
  id: string,
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  await requireAdmin();
  const parsed = offerUpdateSchema.safeParse({
    status: formData.get("status"),
    adminNotes: formData.get("adminNotes") || undefined,
    adminResponse: formData.get("adminResponse") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const offer = await repo.getOfferById(id);
  if (!offer) {
    return { error: "Teklif bulunamadı" };
  }

  const patch: Parameters<typeof repo.updateOffer>[1] = {
    status: parsed.data.status,
    adminNotes: parsed.data.adminNotes,
    adminResponse: parsed.data.adminResponse,
  };
  if (parsed.data.status === "responded") {
    patch.respondedAt = new Date().toISOString();
  }

  await repo.updateOffer(id, patch);

  let emailSent = false;
  let emailWarning: string | undefined;

  const shouldEmail =
    parsed.data.status === "responded" &&
    Boolean(parsed.data.adminResponse?.trim()) &&
    Boolean(offer.email);

  if (shouldEmail) {
    try {
      const result = await sendOfferResponseEmail(
        { ...offer, ...patch },
        parsed.data.adminResponse!,
      );
      if (result.ok) {
        emailSent = true;
      } else {
        emailWarning = result.error ?? "Email iletilemedi";
        console.error("[email] offer-response failed", result.error);
      }
    } catch (err) {
      console.error("[email] offer-response threw", err);
      emailWarning = "Email iletilemedi";
    }
  }

  revalidatePath(`/kayhan-yonetim/teklifler/${id}`);
  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim");
  return { success: true, emailSent, emailWarning };
}
```

> **Önemli:**
> - Önce `getOfferById` çağrılıyor (mevcut kodda yoktu) — `offer.email` ve full offer state'i için gerekli.
> - `repo.updateOffer` patch tipinde `respondedAt` opsiyonel; mevcut Offer tipinde alan zaten var.
> - `{ ...offer, ...patch }` ile email şablonuna güncel offer state'i geçiliyor (DB'ye gönderilen patch buraya da yansır).

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/kayhan-yonetim/actions/offers.ts
git commit -m "feat(admin): updateOfferAction status=responded'da musteriye email"
```

---

## Task 8: `OfferResponseForm` UI — dinamik buton + email durumu

**Files:**
- Modify: `components/admin/offer-response-form.tsx`

- [ ] **Step 1: Form'u dinamik etiket ve email state'leriyle güncelle**

`components/admin/offer-response-form.tsx` tamamı:

```tsx
"use client";

import { Mail, Save } from "lucide-react";
import { useActionState, useState } from "react";

import {
  updateOfferAction,
  type OfferActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/offers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Offer, OfferStatus } from "@/lib/data/types";

interface Props {
  offer: Offer;
}

export function OfferResponseForm({ offer }: Props) {
  const [state, action, pending] = useActionState<OfferActionState, FormData>(
    updateOfferAction.bind(null, offer.id),
    {},
  );

  const [status, setStatus] = useState<OfferStatus>(offer.status);
  const [responseText, setResponseText] = useState<string>(
    offer.adminResponse ?? "",
  );

  const willEmail =
    status === "responded" &&
    responseText.trim().length > 0 &&
    Boolean(offer.email);

  const responseMissingEmail =
    status === "responded" &&
    responseText.trim().length > 0 &&
    !offer.email;

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Yönetici Yanıtı</h2>
        <p className="mt-1 text-xs text-muted">
          Durumu &quot;Yanıtlandı&quot; yapıp kaydederseniz müşterinin e-posta
          adresine yanıt metni otomatik gönderilir.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Durum</Label>
        <Select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OfferStatus)}
        >
          <option value="new">Yeni</option>
          <option value="in_review">İnceleniyor</option>
          <option value="responded">Yanıtlandı</option>
          <option value="closed">Kapalı</option>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adminNotes">Dahili notlar (müşteriye gitmez)</Label>
        <Textarea
          id="adminNotes"
          name="adminNotes"
          rows={3}
          defaultValue={offer.adminNotes ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adminResponse">Müşteriye yanıt</Label>
        <Textarea
          id="adminResponse"
          name="adminResponse"
          rows={5}
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
        />
      </div>

      {responseMissingEmail && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Bu müşterinin e-postası yok. Yanıtı kaydedebilirsiniz ama otomatik
          email gitmez — WhatsApp veya telefonla iletin.
        </p>
      )}

      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      {state.success && state.emailSent && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <Mail className="h-3.5 w-3.5" strokeWidth={2.4} />
          Kaydedildi · Email gönderildi
        </p>
      )}
      {state.success && state.emailWarning && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Kaydedildi. ⚠ {state.emailWarning}
        </p>
      )}
      {state.success && !state.emailSent && !state.emailWarning && (
        <p className="text-xs text-success">Kaydedildi.</p>
      )}

      <Button type="submit" variant="primary" size="sm" disabled={pending}>
        {willEmail ? (
          <>
            <Mail className="h-4 w-4" strokeWidth={2.4} />
            {pending ? "Gönderiliyor..." : "Kaydet ve Email At"}
          </>
        ) : (
          <>
            <Save className="h-4 w-4" strokeWidth={2.4} />
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </>
        )}
      </Button>
    </form>
  );
}
```

> **Davranış:**
> - `status` ve `responseText` controlled state, button etiketini canlı günceller.
> - `willEmail` true ise buton "Kaydet ve Email At" + Mail ikon.
> - Müşteri email'i yok + responded + yanıt dolu → uyarı kutusu.
> - Submit sonrası 3 state varyantı: emailSent / emailWarning / sade success.

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Manuel smoke**

1. `pnpm dev` ile aç, admin'e login ol.
2. `/kayhan-yonetim/teklifler` → email'i olan bir teklif aç. Status'u "Yanıtlandı" yap, yanıt yaz → buton "Kaydet ve Email At" olmalı. Tıkla, sonuçta "Kaydedildi · Email gönderildi" görünmeli (RESEND_API_KEY varsa Resend log'unda görünür; yoksa console.warn'a düşer ama UI yine başarı gösterir çünkü `send()` warn modunda `{ ok: true }` döner).
3. Email'siz bir teklifi aç. Status "Yanıtlandı" + yanıt yaz → "Bu müşterinin e-postası yok" uyarısı görünmeli, buton "Kaydet" kalmalı.
4. Status "İnceleniyor" + yanıt yaz → buton "Kaydet" kalmalı (email tetiklemez).

- [ ] **Step 4: Commit**

```bash
git add components/admin/offer-response-form.tsx
git commit -m "feat(admin): yanit formunda dinamik buton + email durumu"
```

---

## Task 9: Manuel teklif — zod validation schema

**Files:**
- Create: `lib/validations/offer-create.ts`

- [ ] **Step 1: Schema dosyasını oluştur**

```ts
// lib/validations/offer-create.ts
import { z } from "zod";

export const offerCreateSchema = z.object({
  fullName: z.string().min(3, "Ad soyad zorunlu").max(120),
  phone: z
    .string()
    .regex(/^[0-9+\s()-]{10,20}$/, "Geçerli bir telefon numarası girin"),
  email: z
    .string()
    .email("Geçerli e-posta girin")
    .optional()
    .or(z.literal("")),
  city: z.string().min(2, "İl seçin"),
  district: z.string().min(2, "İlçe yazın").max(80),
  installationLocation: z.enum(["roof", "land", "other"]),
  installationAddress: z
    .string()
    .min(5, "Kurulum adresini açıklayın")
    .max(500),
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
    .min(10, "En az 10 karakter")
    .max(2000, "En fazla 2000 karakter"),
});

export type OfferCreateInput = z.infer<typeof offerCreateSchema>;
```

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/offer-create.ts
git commit -m "feat(validation): offer-create zod schema"
```

---

## Task 10: Manuel teklif — `createOfferAction` server action

**Files:**
- Create: `app/(admin)/kayhan-yonetim/actions/create-offer.ts`

- [ ] **Step 1: Action dosyasını oluştur**

```ts
// app/(admin)/kayhan-yonetim/actions/create-offer.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/data";
import { sendOfferCreatedEmail } from "@/lib/email/resend";
import { offerCreateSchema } from "@/lib/validations/offer-create";

export interface CreateOfferActionState {
  error?: string;
}

export async function createOfferAction(
  _prev: CreateOfferActionState,
  formData: FormData,
): Promise<CreateOfferActionState> {
  await requireAdmin();

  let appliancesRaw: unknown = [];
  try {
    const raw = formData.get("appliances");
    appliancesRaw =
      typeof raw === "string" && raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return { error: "Cihaz listesi okunamadı" };
  }

  const parsed = offerCreateSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    city: formData.get("city"),
    district: formData.get("district"),
    installationLocation: formData.get("installationLocation"),
    installationAddress: formData.get("installationAddress"),
    appliances: appliancesRaw,
    detailedDescription: formData.get("detailedDescription"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
  }

  const offer = await repo.createOffer({
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    city: parsed.data.city,
    district: parsed.data.district,
    installationLocation: parsed.data.installationLocation,
    installationAddress: parsed.data.installationAddress,
    appliances: parsed.data.appliances,
    detailedDescription: parsed.data.detailedDescription,
  });

  if (offer.email) {
    try {
      await sendOfferCreatedEmail(offer);
    } catch (err) {
      console.error("[email] offer-created failed", err);
    }
  }

  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim");
  redirect(`/kayhan-yonetim/teklifler/${offer.id}`);
}
```

> **Notlar:**
> - `redirect()` Next.js'te throw eder, dönüş tipini etkilemez. TypeScript'in `Promise<...>` imzası korunur.
> - Email başarısızlığı redirect'i bozmasın — try/catch içinde sessizce yutulur (console log düşer).
> - `repo.createOffer` `OfferRequest` tipini bekliyor; `installationAddress` opsiyonel ama schema bizde min 5 zorunlu, yani her zaman dolu geçiriyoruz.

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/kayhan-yonetim/actions/create-offer.ts
git commit -m "feat(admin): createOfferAction (manuel teklif olusturma)"
```

---

## Task 11: Manuel teklif — `OfferCreateForm` bileşeni

**Files:**
- Create: `components/admin/offer-create-form.tsx`

- [ ] **Step 1: Form bileşenini oluştur**

```tsx
// components/admin/offer-create-form.tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  createOfferAction,
  type CreateOfferActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/create-offer";
import { ApplianceListEditor } from "@/components/offer-wizard/appliance-list-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { turkishCities } from "@/lib/mock/data";
import type { WizardAppliance } from "@/types/offer-wizard";

export function OfferCreateForm() {
  const [state, action, pending] = useActionState<
    CreateOfferActionState,
    FormData
  >(createOfferAction, {});

  const [appliances, setAppliances] = useState<WizardAppliance[]>([]);

  return (
    <form action={action} className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Müşteri</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName">Ad Soyad *</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              placeholder="Müşterinin tam adı"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="+90 555 555 55 55"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta (opsiyonel)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ornek@eposta.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">İl *</Label>
            <Select id="city" name="city" required defaultValue="">
              <option value="">Seçin</option>
              {turkishCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="district">İlçe *</Label>
            <Input id="district" name="district" required placeholder="İlçe" />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">Kurulum</h2>

        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <div className="space-y-1.5">
            <Label htmlFor="installationLocation">Kurulum türü *</Label>
            <Select
              id="installationLocation"
              name="installationLocation"
              defaultValue="roof"
            >
              <option value="roof">Çatı</option>
              <option value="land">Arazi</option>
              <option value="other">Diğer</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="installationAddress">Adres / kurulum detayları *</Label>
            <Textarea
              id="installationAddress"
              name="installationAddress"
              rows={3}
              required
              placeholder="Örn: Müstakil ev çatısı, güneye bakıyor, 80 m2..."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold tracking-tight">İhtiyaç</h2>

        <div>
          <Label>Çalıştırılacak Cihazlar</Label>
          <p className="mt-1 text-xs text-muted">
            Telefonla aldığınız bilgilere göre listeleyin. Boş bırakılabilir.
          </p>
          <div className="mt-3">
            <ApplianceListEditor items={appliances} onChange={setAppliances} />
          </div>
        </div>

        <input
          type="hidden"
          name="appliances"
          value={JSON.stringify(appliances.filter((a) => a.name.trim()))}
        />

        <div className="space-y-1.5">
          <Label htmlFor="detailedDescription">Detaylı Açıklama *</Label>
          <Textarea
            id="detailedDescription"
            name="detailedDescription"
            rows={5}
            required
            placeholder="Aylık ortalama tüketim, kullanım saatleri, batarya yedek ihtiyacı..."
          />
        </div>
      </section>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link href="/kayhan-yonetim/teklifler">
          <Button type="button" variant="outline">
            İptal
          </Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Kaydediliyor..." : "Kaydet ve Detay Sayfasını Aç"}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 3: Commit**

```bash
git add components/admin/offer-create-form.tsx
git commit -m "feat(admin): OfferCreateForm bileseni"
```

---

## Task 12: Manuel teklif — `/teklifler/yeni` route + liste tuşu

**Files:**
- Create: `app/(admin)/kayhan-yonetim/(protected)/teklifler/yeni/page.tsx`
- Modify: `app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx`

- [ ] **Step 1: Yeni route'u oluştur**

```tsx
// app/(admin)/kayhan-yonetim/(protected)/teklifler/yeni/page.tsx
import Link from "next/link";

import { OfferCreateForm } from "@/components/admin/offer-create-form";

export default function NewOfferPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/kayhan-yonetim/teklifler"
          className="text-xs text-muted hover:text-foreground"
        >
          ← Tekliflere dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Yeni Teklif (Manuel Kayıt)
        </h1>
        <p className="mt-1 text-sm text-muted">
          Telefonla gelen müşteri için hızlı kayıt formu. Müşterinin e-postası
          girilirse otomatik &quot;kayıt alındı&quot; bildirimi gönderilir.
        </p>
      </header>

      <OfferCreateForm />
    </div>
  );
}
```

- [ ] **Step 2: Liste sayfasının başlığına "+ Yeni Teklif" tuşu ekle**

`app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx`'in header bölümünü güncelle. Mevcut:

```tsx
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Teklifler</h1>
        <p className="mt-1 text-sm text-muted">{all.length} toplam</p>
      </header>
```

Bunu şuna değiştir:

```tsx
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teklifler</h1>
          <p className="mt-1 text-sm text-muted">{all.length} toplam</p>
        </div>
        <Link href="/kayhan-yonetim/teklifler/yeni">
          <Button size="sm" variant="primary">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Teklif
          </Button>
        </Link>
      </header>
```

Dosyanın importlarına `Button` ve `Plus` ekle (Link zaten var):

```tsx
import { Plus } from "lucide-react";
import Link from "next/link";

import { OfferStatusPill } from "@/components/admin/offer-status-pill";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { repo } from "@/lib/data";
import type { OfferStatus } from "@/lib/data/types";
```

- [ ] **Step 3: TypeScript ve lint kontrol**

Run:
```
pnpm exec tsc --noEmit && pnpm lint
```
Expected: 0 hata, 0 uyarı.

- [ ] **Step 4: Manuel smoke**

1. `pnpm dev` ile aç, admin'e login ol.
2. `/kayhan-yonetim/teklifler` aç → sağ üstte "+ Yeni Teklif" tuşu görünür.
3. Tıkla → form açılır.
4. Doldur (Ad: "Manuel Test", telefon: "5551112233", il: "İzmir", ilçe: "Karşıyaka", kurulum: Çatı, adres: "Test adres detay", cihaz: 1 adet "Klima 1500W", açıklama 10+ karakter).
5. Submit → otomatik `/kayhan-yonetim/teklifler/[id]` detay sayfasına yönlen.
6. Detay sayfasında: cihaz listesi görünmeli, calculator çalışmalı.
7. Email dolduğu senaryoda Resend log'unda "Talebiniz Alındı" maili görünmeli (RESEND_API_KEY varsa).
8. Validation testi: telefon boş → form üstünde hata, redirect olmaz.

- [ ] **Step 5: Commit**

```bash
git add app/(admin)/kayhan-yonetim/(protected)/teklifler/yeni/page.tsx \
        app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx
git commit -m "feat(admin): manuel teklif olusturma route + liste tusu"
```

---

## Task 13: Uçtan uca smoke + verification raporu

**Files:**
- Create: `docs/verification/2026-05-12-teklif-iyilestirme.md`

- [ ] **Step 1: Tam akış manuel test**

`pnpm dev` çalıştır. Sırayla:

**Müşteri akışı (incognito):**
1. `/teklif-al` aç. Üstte "Adım 1/5 — Başlangıç" görünmeli.
2. İleri tuşuyla 2/5 → 3/5 → 4/5 → 5/5 geçişlerini gör.
3. Form'u doldur, KVKK onayla, gönder.
4. Success ekranı: "Teklifiniz Başarıyla İletildi", 3 sıralı adım kartı, 3 buton (Anasayfa, Mağaza, WhatsApp). WhatsApp tuşuna tıkla → wa.me linki açılsın.
5. Sayfayı yenile → wizard kaldığı yerden başlamamalı çünkü reset oldu — hayır, success ekranındaki "Yeni teklif" linki reset eder. Bu adımda yeni sekmede `/teklif-al` aç, başka bir teklifin yarısında bırak, sekmeyi kapat, geri aç → kaldığı adımda buluyor olmalı (mevcut davranış korunmuş).

**Admin yanıt akışı:**
1. Admin login → `/kayhan-yonetim/teklifler`. Yeni gelen teklif görünmeli, "+ Yeni Teklif" tuşu da görünmeli.
2. Az önce gönderilen teklifi aç (email'i varsa).
3. Durumu "Yanıtlandı" yap, "Müşteriye yanıt" alanına "Sayın müşterimiz, teklifinizi inceledik. Saha keşfi için sizi yarın arayacağız." yaz.
4. Buton etiketi "Kaydet ve Email At" olmalı. Tıkla.
5. State'de "Kaydedildi · Email gönderildi" mesajı görünmeli. Resend log'unu kontrol et.
6. Email içeriği kontrol: yanıt metni + sistem tahmini tablosu (cihaz varsa) + WhatsApp/Mağaza CTA.

**Admin manuel teklif:**
1. `/kayhan-yonetim/teklifler` → "+ Yeni Teklif" → form.
2. Email dolduğu bir senaryoda doldur, submit.
3. Detay sayfasına yönlendiğini doğrula.
4. Resend log'unda "Talebiniz Alındı" maili görünmeli.

**Edge case testleri:**
- Email'siz teklif + responded → "Bu müşterinin e-postası yok" uyarısı, email gitmesin.
- Status "İnceleniyor" + yanıt yaz → email gitmesin.
- Site ayarındaki WhatsApp numarasını geçici olarak boşa çek (`whatsapp_number = ''` settings tablosunda) → success ekranında "İletişim Sayfası" tuşu görünsün, WhatsApp tuşu gizlensin. **Test sonrası numarayı geri al.**

- [ ] **Step 2: Verification raporunu yaz**

`docs/verification/2026-05-12-teklif-iyilestirme.md`:

```markdown
# Teklif Akışı İyileştirme — Verification

**Tarih:** 2026-05-12
**Spec:** docs/superpowers/specs/2026-05-12-teklif-iyilestirme-design.md
**Plan:** docs/superpowers/plans/2026-05-12-teklif-iyilestirme.md

## Yapılan değişiklikler

- `step-success` zenginleştirildi: 3 sıralı adım kartı + Anasayfa/Mağaza/WhatsApp butonları.
- `step-indicator`'a "Adım X/5 — Etiket" üst satırı eklendi (success adımı sayaç dışı).
- `WizardShell`'e `whatsappNumber` propu, `/teklif-al/page.tsx` server'da `repo.getSettings()` çağırıyor.
- `updateOfferAction` status=responded + adminResponse + offer.email koşullarında `sendOfferResponseEmail` tetikliyor.
- `OfferResponseForm` dinamik buton etiketi + 3 sonuç state'i.
- Yeni route `/kayhan-yonetim/teklifler/yeni` + `OfferCreateForm` + `createOfferAction`.
- 2 yeni email şablonu (`offer-response.tsx`, `offer-created.tsx`).

## Test sonuçları

### Statik
- `pnpm exec tsc --noEmit`: 0 hata.
- `pnpm lint`: 0 uyarı.

### Manuel smoke
- [ ] Müşteri wizard'ı 1/5 → 5/5 sayaç akışı.
- [ ] Success ekranı 3 sıralı adım + 3 buton; WhatsApp linki pre-fill mesajla açılır.
- [ ] Admin yanıt formu: dinamik buton etiketi, "Yanıtlandı" + yanıt → email gider.
- [ ] Resend log'unda yanıt emaili göründü, içerik = yanıt metni + calculator tablosu.
- [ ] Manuel teklif formu → detay sayfasına yönlendi, müşteri email'i varsa "kayıt alındı" maili gitti.
- [ ] Email'siz teklif uyarısı doğru çalışıyor.
- [ ] WhatsApp numarası boşken success ekranında "İletişim Sayfası" tuşu (fallback) görünüyor.

## Riskler / Bilinen sınırlamalar

- Resend sandbox sadece `RESEND_API_KEY` sahibinin doğrulanmış adresine gönderir; production domain doğrulaması Faz 6'da yapılacak.
- Yanıt emaili idempotent değil — admin tekrar kaydederse email tekrar gider. İstenen davranış.
- DB şema değişikliği yok.
```

- [ ] **Step 3: Commit**

```bash
git add docs/verification/2026-05-12-teklif-iyilestirme.md
git commit -m "docs: teklif iyilestirme verification raporu"
```

---

## Self-Review Notları

**Spec coverage (her madde için task):**
- step-success zenginleştirme → Task 6
- Wizard "Adım X/Y" sayacı → Task 4
- localStorage restore dokunma → use-wizard-state.ts'ye dokunmuyoruz (planda dosya yok)
- Admin yanıt → müşteri emaili → Task 7 + Task 8 (action + UI)
- Manuel teklif → Task 9 (schema) + Task 10 (action) + Task 11 (form) + Task 12 (route + liste tuşu)
- Email şablonları → Task 1 (offer-response) + Task 2 (offer-created)
- Resend helpers → Task 3
- Smoke testler → Task 13

**Type tutarlılığı:**
- `OfferActionState` Task 7'de genişletildi, Task 8'de tüketildi → ✓
- `sendOfferResponseEmail`'in dönüş tipi `{ ok, error }` → Task 3 ve Task 7 tutarlı → ✓
- `CreateOfferActionState` Task 10'da tanımlı, Task 11'de tüketildi → ✓
- `WhatsappNumber: string | null` propu Task 5'te tanımlı, Task 6'da tüketildi → ✓

**No placeholder check:** ✓ Tüm kod blokları tam, exact path kullanıldı, manuel smoke adımları somut.
