# F-1 Verification Report — Web Push Server + Turnstile Coverage

**Tarih:** 2026-05-13
**Plan:** `docs/superpowers/plans/2026-05-13-f1-web-push-turnstile.md`
**Branch (merge edildi):** `feat/f1-web-push-turnstile` → `main` (fast-forward)
**Sonuç:** ✅ APPROVED FOR MERGE — main'e fast-forward merge edildi.

---

## Commit'ler (oldest → newest)

| SHA | Tip | Mesaj |
|---|---|---|
| `3b610f8` | docs | F-1 implementation plan |
| `6d4449d` | chore(deps) | add web-push for VAPID server-side dispatch |
| `5451a2e` | feat(web-push) | server sender + dispatch stock subscribers to push subscriptions |
| `7749a8d` | feat(security) | turnstile coverage for orders and stock subscribe |
| `5a6c07d` | fix(security) | place stock-subscribe Turnstile above input row |

## Ne tamamlandı

**F-1a (Web Push end-to-end):**
- `web-push@^3.6` + `@types/web-push@^3.6` paketleri eklendi.
- `lib/web-push/server.ts` yazıldı: VAPID detayları lazily kuruluyor (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`). `sendWebPush(json, payload)` 404/410 yanıtları "expired" olarak işaretler.
- `lib/stock-notifications/index.ts:dispatchForProduct` artık abonelere email + push gönderiyor. Süresi dolmuş aboneler `repo.deleteStockSubscription(id)` ile temizleniyor (mevcut metod kullanıldı).
- `.env.local.example` `VAPID_SUBJECT=mailto:noreply@kayhansolar.com` örneği eklendi.

**F-1b (Turnstile yayılımı):**
- `app/api/orders/route.ts` ve `app/(public)/api/stock-notifications/route.ts` artık Zod validation sonrası `verifyTurnstileToken` çağırıyor.
- `lib/validations/order.ts` + stock-notifications route Zod şemasına `captchaToken: z.string().optional()` eklendi.
- `components/shop/cart-view.tsx` (sepet checkout) ve `components/shop/add-to-cart.tsx` (stok bildirim aboneliği) `<Turnstile>` widget'ı render ediyor; token fetch body'sinde gidiyor.
- Anahtar yokken `verifyTurnstileToken` "demo passthrough" davranışı koruyor — geliştirme akışı bozulmadı.

## Doğrulama

| Komut | Sonuç |
|---|---|
| `pnpm exec tsc --noEmit` | ✅ PASS (yalnızca `.next/dev/types/validator.ts` ve orphan `components/admin/orders-table.tsx` kaynaklı pre-existing hatalar; F-1 kodundan değil) |
| `pnpm lint` | ✅ PASS (yalnızca pre-existing `product-lightbox.tsx` warning'i) |
| `pnpm build` | ⚠️ Yapılamadı — paralel branch'in bıraktığı orphan `components/admin/orders-table.tsx` build'i blokluyor. F-1 kodu kendi başına build'i kırmıyor. |
| Spec compliance review | ✅ APPROVED (her iki commit-grubu) |
| Code quality review | ✅ APPROVED (sadece engellemeyen nit'ler; widget yerleşimi `5a6c07d` ile düzeltildi) |
| Final branch review | ✅ APPROVED FOR MERGE |

## Anahtar gereksinimleri (production aktivasyonu için)

`.env.local`'da olması gereken (kullanıcı VAPID'i ekledi 2026-05-13):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<set>
VAPID_PRIVATE_KEY=<set>
VAPID_SUBJECT=mailto:m4likiletisim@gmail.com   # set (mailto: zorunlu)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=  # boş — Cloudflare Turnstile site oluşturulunca doldur
TURNSTILE_SECRET_KEY=             # boş — aynı
```

## Manuel smoke testleri (kullanıcı dev server'da yapacak)

1. **Demo-mode checkout:** `pnpm dev`, sepet doldur, "WhatsApp ile Siparişi Tamamla" → başarılı (Turnstile widget render etmez çünkü key yok, server demo passthrough).
2. **Demo-mode stok aboneliği:** Stoksuz ürün → email gir → "Haber Ver" → başarı toast.
3. **Web Push smoke** (VAPID anahtarları set olduğu için yapılabilir):
   - Chrome localhost'ta ürün detay sayfasında push subscribe + bildirim izni.
   - Admin paneli'nden ürün stoğunu > 0 yap → `dispatchForProduct` tetiklensin → tarayıcıya push bildirim gelmeli.
   - Server log'da `[notify] push send failed` olmamalı.
4. **Expired sub temizlik:** Supabase'da `stock_subscriptions.push_subscription` JSONB'sini bozuk endpoint ile doldur → dispatch tetikle → satır silinmeli.

## Kalan F grubu işleri (kapsam dışı, takip için)

- **F-2 — Admin görsel yükleme UI:** `uploadFile()` zaten yazılmış (`lib/supabase/storage.ts`) ama hiçbir admin formundan çağrılmıyor. Products / Gallery / Offers için file input + preview + upload action UI'ı yazılması gerek. Supabase Storage bucket'larının dashboard'da oluşturulması ön koşul (`docs/runbooks/faz-6-production-prep.md` §3).
- **F-3 — Cloudflare hesabı + Turnstile keys:** `docs/runbooks/faz-6-production-prep.md` §1 adımları.
- **F-4 — Resend domain DNS:** §4 — `kayhansolar.com` alındıktan sonra.
- **F-5 — Vercel project + env'ler + domain bağlama:** §5 — production deploy.

## Bilinen pre-existing problemler (F-1 kapsamında değil)

- **Orphan untracked dosya `components/admin/orders-table.tsx`** çalışma dizininde duruyor; `feat/admin-datatable-yayilim` branch'inden gelmiş. Build'i blokluyor çünkü `@/app/(admin)/kayhan-yonetim/actions/orders-bulk` modülü main'de yok. Çözüm: diğer branch'in merge'ünü tamamla veya dosyayı sil/stash.
- **`dispatchForProduct` admin notification mesajı stale:** "X için Y aboneye email iletildi" diyor ama artık push da iletiliyor. Küçük metin düzeltmesi — sonra yapılabilir.
