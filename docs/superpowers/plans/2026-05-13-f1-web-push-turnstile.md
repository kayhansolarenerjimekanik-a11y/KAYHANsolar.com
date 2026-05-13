# F-1 — Web Push Server Sender + Turnstile Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faz 6 (production prep) F grubunun kod tarafındaki iki açığını kapatmak — (a) VAPID public key zaten `.env.local`'da, browser subscription kodu hazır, ama **server-side sender yok ve `web-push` npm paketi kurulu değil**; (b) Turnstile sadece `teklif-al` formunda — `/api/orders` ve stok bildirim aboneliği akışları korumasız.

**Architecture:** İki bağımsız sub-phase. **F-1a (Web Push):** `web-push` npm paketini ekle, `lib/web-push/server.ts` modülünü yaz (`sendWebPush(subscriptionJson, payload)` — VAPID_SUBJECT/public/private env'leriyle); `lib/stock-notifications/index.ts:dispatchForProduct` içindeki TODO satırını gerçek gönderimle değiştir; 410 Gone / 404 NotFound yanıtlarında subscription kaydını sessizce sil. **F-1b (Turnstile):** `lib/turnstile/index.ts` zaten "demo passthrough" davranışıyla hazır. Iki yere `verifyTurnstileToken` çağrısı ekle (`/api/orders` POST handler + stock notification subscribe action) ve frontend formlara `<Turnstile>` widget'ı yerleştir.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5 strict, Supabase (admin client server-only), Zod, `web-push@^3.6` (eklenecek), `@types/web-push@^3.6` (devDep).

**Önemli notlar:**
- AGENTS.md uyarısı geçerli: Next.js 16 — sunucu/istemci sınırını her dosyada koru (`import "server-only"`).
- Test framework yok. Doğrulama = `pnpm lint` + `pnpm exec tsc --noEmit` + `pnpm build` + manuel smoke. Web push smoke testi `localhost`'ta yapılır (Chrome localhost'a izin verir; `VAPID_SUBJECT` zorunlu).
- VAPID_SUBJECT henüz `.env.local`'da var ama `.env.local.example`'da yok — eklenecek.
- F grubunun kalan parçası (admin görsel yükleme UI'ı + Supabase Storage bucket'ları + Resend domain + Vercel deploy) bu plan kapsam dışı; bağımsız plan olarak ele alınacak.

---

## Dosya Haritası

| Dosya | Durum | Sub-phase |
|---|---|---|
| `package.json` | Modify (`web-push` + `@types/web-push` ekle) | F-1a |
| `.env.local.example` | Modify (`VAPID_SUBJECT` satırı ekle) | F-1a |
| `lib/web-push/server.ts` | **YENİ** | F-1a |
| `lib/stock-notifications/index.ts` | Modify (TODO satırı → gerçek dispatch) | F-1a |
| `lib/data/repository.ts` | Modify (yeni `deleteStockSubscription(id)` API'sı) | F-1a |
| `lib/data/demo-repository.ts` | Modify (`deleteStockSubscription` implementasyonu) | F-1a |
| `lib/data/supabase-repository.ts` | Modify (`deleteStockSubscription` implementasyonu) | F-1a |
| `lib/data/supabase/stock-subscriptions.ts` | Modify (`deleteStockSubscription` DB silme) | F-1a |
| `app/api/orders/route.ts` | Modify (Turnstile token doğrulama) | F-1b |
| `lib/validations/order.ts` | Modify (Zod schema'ya `captchaToken` opsiyonel string) | F-1b |
| `components/shop/cart-view.tsx` | Modify (Turnstile widget + token state) | F-1b |
| `lib/stock-notifications/index.ts` | Modify (`subscribeToStock`'a captchaToken parametresi + doğrulama) | F-1b |
| `components/shop/stock-notify-button.tsx` *veya benzeri (aşağıda doğrulanacak)* | Modify (Turnstile widget + token submit) | F-1b |

Commit planı (3 commit):
1. `chore(deps): add web-push for VAPID server-side dispatch`
2. `feat(web-push): server sender + dispatch stock subscribers to push subscriptions`
3. `feat(security): turnstile coverage for orders and stock subscribe`

---

## Sub-phase F-1a: Web Push Server Sender

### Task 1.1: `web-push` paketini ekle

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Paket kurulumu**

Çalıştır: `pnpm add web-push@^3.6 && pnpm add -D @types/web-push@^3.6`

Beklenen: `package.json` `dependencies` altına `"web-push": "^3.6.x"`, `devDependencies` altına `"@types/web-push": "^3.6.x"` yazılır; `pnpm-lock.yaml` güncellenir.

- [ ] **Step 2: Type check + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS (yeni paket sadece type ekledi, kod değişmedi).

- [ ] **Step 3: Commit**

```powershell
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add web-push for VAPID server-side dispatch"
```

---

### Task 1.2: `.env.local.example`'a `VAPID_SUBJECT` ekle

**Files:**
- Modify: `.env.local.example:35-37`

- [ ] **Step 1: Mevcut bloğu güncelle**

Mevcut blok (satır 35-37):

```
# Web Push (filled later when VAPID keypair generated)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

Yeni hâli:

```
# Web Push (filled later when VAPID keypair generated)
# VAPID_SUBJECT must be a mailto: URL — required by Apple/Google push services.
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:noreply@kayhansolar.com
```

- [ ] **Step 2: Doğrulama**

`.env.local`'da `VAPID_SUBJECT` zaten set (kullanıcı `m4likiletisim@gmail.com` adresiyle ekledi). Sadece example dosyası güncellenmiş olacak.

Çalıştır: `pnpm exec tsc --noEmit`

Beklenen: PASS.

*(Commit'i sonraki task ile birleştirelim — tek server sender commit.)*

---

### Task 1.3: `lib/web-push/server.ts` modülünü yaz

**Files:**
- Create: `lib/web-push/server.ts`

- [ ] **Step 1: Dosyayı oluştur**

```ts
import "server-only";

import webpush, { type PushSubscription as WebPushSubscription, type SendResult } from "web-push";

let configured = false;

function configure(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isServerPushEnabled(): boolean {
  return configure();
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface SendPushResult {
  ok: boolean;
  /** True when push service returned 404/410 — caller should delete this subscription. */
  expired: boolean;
  error?: string;
}

export async function sendWebPush(
  subscriptionJson: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  if (!configure()) {
    return { ok: false, expired: false, error: "vapid_not_configured" };
  }
  let subscription: WebPushSubscription;
  try {
    subscription = JSON.parse(subscriptionJson) as WebPushSubscription;
  } catch {
    return { ok: false, expired: true, error: "invalid_subscription_json" };
  }
  try {
    const result: SendResult = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
    );
    return { ok: result.statusCode >= 200 && result.statusCode < 300, expired: false };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      return { ok: false, expired: true, error: `push_gone_${status}` };
    }
    const message = err instanceof Error ? err.message : "unknown";
    return { ok: false, expired: false, error: message };
  }
}
```

- [ ] **Step 2: Type check + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS. Hata varsa: `web-push` type'ı `SendResult` export etmiyorsa `import webpush from "web-push"` + minimum tip tanımına geç:

```ts
interface SendResult { statusCode: number }
```

(Sadece TS hata verirse uygula.)

---

### Task 1.4: Repository'ye `deleteStockSubscription(id)` ekle

**Files:**
- Modify: `lib/data/repository.ts`
- Modify: `lib/data/demo-repository.ts`
- Modify: `lib/data/supabase-repository.ts`
- Modify: `lib/data/supabase/stock-subscriptions.ts`

- [ ] **Step 1: Repository interface'ine metod ekle**

`lib/data/repository.ts`'de `Repository` interface'inde `markStockSubscriptionNotified` metodunun **hemen altına** ekle:

```ts
  deleteStockSubscription(id: string): Promise<void>;
```

- [ ] **Step 2: Demo implementasyonu**

`lib/data/demo-repository.ts`'de `markStockSubscriptionNotified` metodunun hemen altına ekle. (Mevcut metodun yapısına bakarak demo store'dan `stockSubscriptions` filter et. Örnek desen:)

```ts
async deleteStockSubscription(id: string): Promise<void> {
  store.stockSubscriptions = store.stockSubscriptions.filter((s) => s.id !== id);
}
```

(Eğer store key adı farklıysa — kontrol et: `lib/data/demo-repository.ts` içinde `stockSubscriptions` veya benzeri bir array property. İlk olarak aç ve gerçek isimle yaz.)

- [ ] **Step 3: Supabase repository wrapper**

`lib/data/supabase-repository.ts`'de `markStockSubscriptionNotified` çağrısının olduğu yerin hemen yanına ekle. Tipik desen (mevcut `markStockSubscriptionNotified` satırına bakıp aynı stilde yaz):

```ts
async deleteStockSubscription(id: string): Promise<void> {
  return deleteStockSubscription(id);
}
```

ve dosyanın üstündeki `from "./supabase/stock-subscriptions"` import satırına `deleteStockSubscription` ekle.

- [ ] **Step 4: Supabase DB silme**

`lib/data/supabase/stock-subscriptions.ts` dosyasının sonuna ekle:

```ts
export async function deleteStockSubscription(id: string): Promise<void> {
  const client = getSupabaseAdminClient();
  const { error } = await client.from("stock_subscriptions").delete().eq("id", id);
  if (error) throw error;
}
```

Üstteki import bloğunda `getSupabaseAdminClient` zaten kullanılıyorsa yeniden ekleme; yoksa `import { getSupabaseAdminClient } from "@/lib/supabase/admin"`.

- [ ] **Step 5: Type check**

Çalıştır: `pnpm exec tsc --noEmit`

Beklenen: PASS.

---

### Task 1.5: `dispatchForProduct`'ı gerçek push gönderimiyle güncelle

**Files:**
- Modify: `lib/stock-notifications/index.ts:31-42`

- [ ] **Step 1: Import'lara web-push'u ekle**

Dosyanın üst tarafına ekle (mevcut `sendStockBackEmail` import'unun altına):

```ts
import { sendWebPush, isServerPushEnabled } from "@/lib/web-push/server";
```

- [ ] **Step 2: Loop içindeki TODO satırını gerçek gönderimle değiştir**

Mevcut blok:

```ts
  for (const s of pending) {
    if (s.email) {
      try {
        await sendStockBackEmail(s.email, product.name, productUrl);
      } catch (err) {
        console.error("[notify] email send failed", err);
      }
    }
    // Web push dispatch (when VAPID configured) — Faz 6.
    await repo.markStockSubscriptionNotified(s.id);
  }
```

Yeni hâli:

```ts
  const pushEnabled = isServerPushEnabled();
  for (const s of pending) {
    if (s.email) {
      try {
        await sendStockBackEmail(s.email, product.name, productUrl);
      } catch (err) {
        console.error("[notify] email send failed", err);
      }
    }
    if (pushEnabled && s.pushSubscriptionJson) {
      try {
        const result = await sendWebPush(s.pushSubscriptionJson, {
          title: `${product.name} stoğa girdi`,
          body: "Hemen incelemek için tıklayın.",
          url: productUrl,
        });
        if (result.expired) {
          await repo.deleteStockSubscription(s.id);
          continue;
        }
      } catch (err) {
        console.error("[notify] push send failed", err);
      }
    }
    await repo.markStockSubscriptionNotified(s.id);
  }
```

- [ ] **Step 3: Type check + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS.

- [ ] **Step 4: Build**

Çalıştır: `pnpm build`

Beklenen: Build başarılı. Hata varsa: dispatch'in çağrıldığı yer (admin action ya da scheduled handler) artık `deleteStockSubscription` tipini görüyor mu? Düzelt.

- [ ] **Step 5: Manuel smoke testi**

Dev sunucusunu başlat: `pnpm dev`

Adımlar:
1. `http://localhost:3000` aç, herhangi bir ürün detay sayfasına git (`/urun/<slug>`).
2. Eğer ürün stoksuzsa "Stokta yok, gelince haber ver" butonunu kullanarak bir e-posta + push subscription ile abone ol (tarayıcı izin pop-up'ı gelir → izin ver).
3. Admin panelinden o ürünün stok miktarını > 0 yap ve kaydet (`/kayhan-yonetim/urunler/<id>`).
4. Sunucu log'unda push gönderim hatası olmadığını doğrula.
5. Tarayıcıda gerçek bir push bildirimi gelmeli (başlık: "X stoğa girdi").

**Beklenmeyen durumlar:**
- Push bildirimi gelmiyor → `VAPID_SUBJECT` `.env.local`'da mı? Server restart yapıldı mı?
- "vapid_not_configured" hatası → 3 env değişkeninden biri eksik.
- Admin panelinde stok güncelleme `dispatchForProduct`'ı tetiklemiyor → ayrı bir bug; bu task kapsamında değil. Sadece web-push çalıştığını manuel olarak `dispatchForProduct(<productId>)`'yi bir script veya admin debug action ile çağırarak doğrula.

- [ ] **Step 6: Commit**

```powershell
git add .env.local.example lib/web-push/server.ts lib/data/repository.ts lib/data/demo-repository.ts lib/data/supabase-repository.ts lib/data/supabase/stock-subscriptions.ts lib/stock-notifications/index.ts
git commit -m "feat(web-push): server sender + dispatch stock subscribers to push subscriptions"
```

---

## Sub-phase F-1b: Turnstile Coverage

### Task 2.1: Stock notification subscribe akışını bul

**Files:**
- Read: `lib/stock-notifications/index.ts`
- Read: `components/shop/**/stock-notify*` veya `components/product-detail/**/stock-notify*`

- [ ] **Step 1: Çağıran component'i bul**

Çalıştır (PowerShell veya tooling üzerinden):
- Grep ile `subscribeToStock` çağırıcılarını ara.
- Beklenen: 1-2 dosya (genelde bir client component + bir form/button).

- [ ] **Step 2: Bulunan dosya yolunu kaydet**

Aşağıdaki Task 2.4'te dosya yolunu doldur. Bu plan'da placeholder `components/shop/stock-notify-button.tsx` kabul edildi — gerçek isim farklıysa o dosyayı kullan.

*(Bu sadece keşif task'ı, kod değişikliği yok, commit yok.)*

---

### Task 2.2: `/api/orders` route'una Turnstile doğrulama ekle

**Files:**
- Modify: `lib/validations/order.ts`
- Modify: `app/api/orders/route.ts:1-37`

- [ ] **Step 1: Zod schema'ya `captchaToken` ekle**

`lib/validations/order.ts`'de `createOrderSchema`'nın **son alanı olarak** ekle (mevcut alanları okuduktan sonra):

```ts
  captchaToken: z.string().optional(),
```

(Zod v4 syntax — `.optional()` chainable.)

- [ ] **Step 2: Route handler'da Turnstile doğrula**

`app/api/orders/route.ts`'nin mevcut hâli:

```ts
import { NextResponse } from "next/server";

import { repo } from "@/lib/data";
import { checkOrderRateLimit } from "@/lib/rate-limit";
import { createOrderSchema } from "@/lib/validations/order";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz sipariş verisi" },
        { status: 400 },
      );
    }
    const limit = checkOrderRateLimit(parsed.data.customerPhone);
    ...
```

Yeni hâli (Turnstile import + parse sonrasında doğrulama):

```ts
import { NextResponse } from "next/server";

import { repo } from "@/lib/data";
import { checkOrderRateLimit } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createOrderSchema } from "@/lib/validations/order";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz sipariş verisi" },
        { status: 400 },
      );
    }
    const captchaOk = await verifyTurnstileToken(parsed.data.captchaToken ?? null);
    if (!captchaOk) {
      return NextResponse.json(
        { ok: false, error: "Güvenlik doğrulaması başarısız" },
        { status: 400 },
      );
    }
    const limit = checkOrderRateLimit(parsed.data.customerPhone);
    ...
```

(Geri kalan kod aynı kalır — `createOrder` ve catch blokları.)

- [ ] **Step 3: Type check + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS.

*(Frontend wiring sonraki task'ta; commit'i birleştir.)*

---

### Task 2.3: `cart-view.tsx`'e Turnstile widget'ı ekle

**Files:**
- Modify: `components/shop/cart-view.tsx`

- [ ] **Step 1: Mevcut yapıyı oku**

İlk önce `components/shop/cart-view.tsx` dosyasının tamamını oku. Submit handler'ı (`onSubmit` veya `handleCheckout` gibi) bulup `/api/orders`'a `fetch` POST attığını teyit et.

- [ ] **Step 2: Turnstile import + state ekle**

Mevcut import'ların altına ekle:

```tsx
import { Turnstile } from "@/components/security/turnstile";
import { getTurnstileSiteKey } from "@/lib/turnstile";
```

**ÖNEMLİ:** `getTurnstileSiteKey` `server-only` import'una sahip. Bu client component'te çalışmaz. Alternatif: site key'i `NEXT_PUBLIC_TURNSTILE_SITE_KEY` env'inden doğrudan oku.

Daha temiz çözüm — client tarafında env'i direkt oku:

```tsx
import { Turnstile } from "@/components/security/turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;
```

Component'in state bloğuna ekle (mevcut useState'lerin yanına):

```tsx
const [captchaToken, setCaptchaToken] = useState<string | null>(null);
```

- [ ] **Step 3: Widget'ı submit butonunun üstüne yerleştir**

Submit button'ın hemen üstüne render et (form içinde, button'dan önce):

```tsx
<Turnstile
  siteKey={TURNSTILE_SITE_KEY}
  onToken={(t) => setCaptchaToken(t)}
  onExpire={() => setCaptchaToken(null)}
/>
```

- [ ] **Step 4: Submit handler'a captcha token'ı ekle**

`/api/orders`'a giden `fetch` body'sine `captchaToken` ekle:

```tsx
body: JSON.stringify({
  ...mevcut alanlar,
  captchaToken,
}),
```

- [ ] **Step 5: Build + lint + type check**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint && pnpm build`

Beklenen: PASS.

- [ ] **Step 6: Manuel smoke testi (Turnstile yokken)**

Henüz Cloudflare hesabı + key yok. Bu durum `isTurnstileEnabled()` `false` döndürdüğü için `verifyTurnstileToken(null)` `true` döner ("demo passthrough"). Beklenen davranış:

1. `pnpm dev` ile dev sunucusunu başlat.
2. Sepete bir ürün ekle, checkout'a git.
3. Turnstile widget render edilmez (siteKey `null` çünkü env yok) — `<Turnstile>` null döndürür (`turnstile.tsx:62`).
4. Submit et → sipariş başarıyla oluşur. (captchaToken `null` gider, server `demo passthrough` kabul eder.)
5. Admin panelinde yeni order görünür.

**Beklenmeyen:** `Geçersiz sipariş verisi` hatası → Zod schema'da `captchaToken` `.optional()` değil; düzelt.

---

### Task 2.4: Stock notification subscribe form'una Turnstile ekle

**Files:**
- Modify: `lib/stock-notifications/index.ts:8-21` (`subscribeToStock`)
- Modify: *(Task 2.1'de bulunan dosya — örn. `components/shop/stock-notify-button.tsx`)*

- [ ] **Step 1: `subscribeToStock`'a captchaToken parametresi ekle**

Mevcut imza:

```ts
export async function subscribeToStock(
  productId: string,
  email?: string,
  pushSubscriptionJson?: string,
) {
```

Yeni imza:

```ts
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function subscribeToStock(
  productId: string,
  email?: string,
  pushSubscriptionJson?: string,
  captchaToken?: string | null,
) {
  const captchaOk = await verifyTurnstileToken(captchaToken ?? null);
  if (!captchaOk) {
    throw new Error("Güvenlik doğrulaması başarısız");
  }
  if (!email && !pushSubscriptionJson) {
    throw new Error("E-posta veya bildirim aboneliği gerekli");
  }
  return repo.createStockSubscription({
    productId,
    email,
    pushSubscriptionJson,
  });
}
```

- [ ] **Step 2: Client component'i güncelle**

Task 2.1'de bulunan dosyayı aç. Mevcut state'lere ekle:

```tsx
const [captchaToken, setCaptchaToken] = useState<string | null>(null);
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;
```

Submit handler'da `subscribeToStock` çağrısına 4. parametre olarak `captchaToken` geç.

Form içinde, submit button'ın üstüne:

```tsx
<Turnstile
  siteKey={TURNSTILE_SITE_KEY}
  onToken={(t) => setCaptchaToken(t)}
  onExpire={() => setCaptchaToken(null)}
/>
```

`import { Turnstile } from "@/components/security/turnstile";` üstte eksikse ekle.

- [ ] **Step 3: Type check + lint**

Çalıştır: `pnpm exec tsc --noEmit && pnpm lint`

Beklenen: PASS.

- [ ] **Step 4: Build**

Çalıştır: `pnpm build`

Beklenen: PASS.

- [ ] **Step 5: Manuel smoke testi**

1. `pnpm dev` başlat, stoksuz bir ürünün detay sayfasına git.
2. "Stokta yok, gelince haber ver" formunu doldur (sadece e-posta).
3. Submit → "Aboneliğiniz alındı" tipi başarı mesajı çıkmalı (demo passthrough geçer).
4. Admin panelinde stok bildirim listesinde yeni kaydı gör.

- [ ] **Step 6: Commit**

```powershell
git add lib/validations/order.ts app/api/orders/route.ts components/shop/cart-view.tsx lib/stock-notifications/index.ts <Task 2.1'de bulunan dosya>
git commit -m "feat(security): turnstile coverage for orders and stock subscribe"
```

---

## Bittikten Sonra

- [ ] **Verification report yaz**

`docs/verification/2026-05-13-f1-web-push-turnstile.md`'a kısa bir not:
- Hangi commit'ler atıldı (3 hash).
- Hangi env değişkenleri set edildi (sadece isim, değer DEĞİL).
- Manuel smoke testi sonuçları.
- Bilinen kalan iş: F-2 (admin görsel yükleme UI'ı + Supabase Storage bucket'ları), F-3 (Cloudflare hesap + Turnstile key üretme, kullanıcı aksiyonu), F-4 (Resend domain DNS, kullanıcı aksiyonu), F-5 (Vercel deploy + env'ler).

- [ ] **Memory güncelle**

`C:\Users\Lenovo\.claude\projects\C--SOLAR-S1TE\memory\project_master_fix_findings.md`'a F grubu durumunu güncelle: web-push server kurulu, Turnstile coverage tamam, kalan kullanıcı aksiyonları yukarıda listelendi.

- [ ] **F-2 plan'ı için brainstorm aç (opsiyonel)**

Admin görsel yükleme UI'ı 3 ayrı admin formunu (`products`, `gallery`, `offers`) etkiler ve Supabase Storage bucket'larının dashboard'da oluşturulmuş olmasını gerektirir. Kullanıcı bucket'ları oluşturduktan sonra yeni bir brainstorm + plan ile başla.
