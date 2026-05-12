# Verification Report — Master Fix

**Tarih:** 2026-05-12
**Plan:** [docs/plans/2026-05-12-master-fix-iyilestirme.md](../plans/2026-05-12-master-fix-iyilestirme.md)
**Tamamlanan görev sayısı:** 13 / 13
**Mod:** `AUTH_MODE=supabase`, `DATA_MODE=supabase`

---

## Düzeltilen bug'lar (kategori bazlı)

### A) Akut render-time / fonksiyon bug'ları

#### A1 — ProductForm inline `<script>` (commit `c2fda67`)
- **Sorun:** React 19 console error: "Encountered a script tag while rendering React component". Admin'de ürün düzenlerken her render'da uyarı veriyordu.
- **Kök neden:** `components/admin/product-form.tsx:217-228` checkbox→hidden input sync için `document.currentScript` ile inline JavaScript çalıştırıyordu. React 19 bunu kabul etmiyor.
- **Fix:** `useState<ProductBadge[]>` ile kontrollü checkbox + hidden input doğrudan state'in JSON serialize'ından doluyor. Inline script tamamen kalktı.
- **Doğrulama:** Curl ile admin ürün edit sayfası HTML'inde `currentScript|badges_options` araması: 0 sonuç. Hidden input `value` doğru JSON: `["yeni","kargo_bedava"]`.

#### A2+A3 — `mockSiteSettings` leak (add-to-cart + iletisim) (commit `afd9ebc`)
- **Sorun:** Admin Ayarlar'da WhatsApp numarası/telefon/email değiştirsen `/iletisim` ve ürün detay "Hemen Satın Al" tuşları eski mock değerlerle açılıyordu.
- **Kök neden:** İki dosya hâlâ `import { mockSiteSettings } from "@/lib/mock/data"` kullanıyordu — Supabase cutover'da unutulmuş.
- **Fix:**
  - `add-to-cart.tsx`: prop drilling `whatsappNumber: string`. Çağıran `urun/[slug]/page.tsx` `repo.getSettings()` çağırıp prop olarak geçiyor.
  - `iletisim/page.tsx`: async + `repo.getSettings()`. "Demo modu" disclaimer kaldırıldı.
  - Bonus: `add-to-cart.tsx`'deki toast aksiyonu `window.location.href` yerine `router.push` — full reload kalktı, client-side nav.
- **Doğrulama:** End-to-end test: Supabase'de `whatsapp_number` değerini geçici `905998887766`'a çevirdim → `curl /iletisim` ve `curl /urun/...` ikisinde de `wa.me/905998887766` yansıdı. Sonra geri aldım.

### B) Stale text temizliği (commit `959bee5`)

| Sayfa | Eski | Yeni |
|---|---|---|
| `/hesabim` | "kullanıcı paneli Faz 3'te aktif olacak" | "müşteri hesabı production deploy'unda (Faz 6) aktif olacak" |
| `/galeri` | "Detaylı proje sayfaları Faz 4'te eklenecek" | "Detaylı incelemek için kart üzerine tıklayın" |
| `/ayarlar` (public) | "Faz 3 ve Faz 5'te aktive edilecek" | "production deploy'unda (Faz 6)" |
| `/kayhan-yonetim/kullanicilar` | "Faz 3D / Faz 6'da gelecek" | "Production deploy (Faz 6) sonrası gelecek" |

Curl ile her sayfada eski stringlerin grep sayısı: 0. Yeni stringlerin grep sayısı: 1.

### C) Loading + global-error (commit `dd2ff2f`, `bef2d2a` global-error fix)

**Yeni dosyalar:**
- `app/(public)/loading.tsx` — generic public skeleton
- `app/(public)/magaza/loading.tsx` — filter panel + product grid skeleton
- `app/(public)/urun/[slug]/loading.tsx` — galeri + sidebar skeleton
- `app/(public)/galeri/loading.tsx` — grid skeleton
- `app/(public)/teklif-al/loading.tsx` — 6-step indicator + form skeleton
- `app/(admin)/kayhan-yonetim/(protected)/loading.tsx` — KPI + table skeleton
- `app/global-error.tsx` — root-level fallback (Anasayfa link `next/link`)

Test: tüm rotalar HTTP 200, hata yok.

### D) Mapper coverage (commits `799096d`, `3c2b83a`)

#### D1+D2 — Gallery `is_active` + `display_order`
- `GalleryPost` interface'e `isActive: boolean` + `displayOrder: number` eklendi.
- `rowToGallery` + `galleryToInsert` map ediyor.
- `listGalleryPosts(opts: { onlyActive?: boolean })` parametresi eklendi.
- Public `/galeri`, sitemap, search'in `onlyActive: true` ile çağrılıyor.
- Admin update action `isActive` + `displayOrder` patch'i kabul ediyor.
- **Doğrulama:** Supabase'de `diyarbakir-cati-10kw` post'unu pasif yaptım → `curl /galeri` link sayım: 6→5. Tekrar aktif yapınca 6.

#### D3 — Categories `is_active`
- `Category` interface'e `isActive: boolean` eklendi.
- Aynı pattern: `rowToCategory` + `categoryToInsert` + opts param.
- Public `/magaza`, anasayfa kategori grid, kampanya strip, search `onlyActive: true`.
- **Doğrulama:** Supabase'de `aydinlatma` kategorisini pasif yaptım → `curl /magaza`'da filter panel'de "Aydınlatma" kayboldu (5 kategori → 4). Aktif yapınca geri geldi.

#### D4 — Orders `discount_amount` + `applied_campaigns`
- `Order` interface'e `discountAmount: number` + `appliedCampaignIds: string[]` eklendi.
- Schema `applied_campaigns uuid[]` olduğu için type string[] (campaign ID listesi). Admin UI title'ları `repo.listCampaigns()` ile lookup ediyor.
- Admin `/siparisler` sayfası: indirim varsa `−₺X,XXX` yeşil renkte ve parantez içinde kampanya adları gösteriyor.
- **Doğrulama:** Test order ekledim (`discount_amount=2415`, `applied_campaigns=['<bahar-uuid>']`) → admin liste HTML'inde "TEST-DISC-001", "−₺2.415", "Bahar Kampanyası — 4 Panel Alana 5.si %70 İndirim" hepsi render. Sonra sildim.

#### D5 — Products `meta_*`
- Plan'da düşük öncelikli idi. UI'da meta override yok (sadece otomatik). Faz 6'ya devredildi.

### E) Server-side KVKK consent gating (commit `6d266a6`)

- `lib/consent/index.ts`'in `writeConsent`'i artık hem localStorage hem cookie yazıyor (1 yıl, SameSite=Lax, urlEncoded JSON).
- `lib/consent/server.ts` yeni dosya — `readServerConsent()` Next.js `cookies()` API'sini kullanır.
- `/api/chat` consent.analytics false ise **HTTP 403** "AI sohbeti için çerez bannerındaki Analitik veya Hepsini Kabul tercihi gerekli." mesajı.
- `/api/analytics` consent.analytics false ise sessizce **200 + `{skipped: true}`** (client tracker hata almasın).
- **Doğrulama:** Cookie'siz: chat 403, analytics 200/skipped. Cookie ile (`analytics: true`): chat Gemini cevap stream'liyor, analytics 200/ok.

### F) Production prep env örneği (commit `fa7332e`)

- `.env.local.example`'a `NEXT_PUBLIC_SITE_URL=https://kayhansolar.com` (Faz 6 deploy'unda gerçek domain).

---

## Test edildi

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ 0 hata |
| `pnpm run lint` | ✅ 0 hata, 0 uyarı |
| `pnpm build` | ✅ 59 sayfa, 14.1s, hata yok |
| ProductForm admin sayfası (HMAC cookie ile) | ✅ HTTP 200, inline script kayboldu |
| Settings round-trip (Supabase → iletisim + ürün detay) | ✅ Anında yansıyor |
| 4 sayfada stale text grep | ✅ 0 eski string |
| 7 loading.tsx + global-error.tsx oluştu | ✅ build manifest'te var |
| Gallery `onlyActive` filter | ✅ Pasif post public'te kayboluyor |
| Categories `onlyActive` filter | ✅ Pasif kategori filter panel'de kayboluyor |
| Orders discount UI | ✅ Admin liste "−₺X" + kampanya adı |
| Chat consent gate (cookiesiz) | ✅ HTTP 403 |
| Chat consent gate (cookieli) | ✅ Gemini stream |
| Analytics consent gate (cookiesiz) | ✅ 200 + skipped: true |
| Analytics consent gate (cookieli) | ✅ 200 + ok |

---

## Bilinen sınırlar (sonraki adımlar / Faz 6)

- **D5 — Products meta_title/meta_description** mapping eklenmedi. Per-product SEO override şu an admin'den yapılamaz; sayfa metadata `name`/`shortDescription`'dan otomatik üretiliyor. Müşteri talebi olursa Faz 6'da admin form'a eklenir.
- **createOrder** server-action akışı yok (sepet → WhatsApp link, gerçek backend submit değil). Bu yüzden `discountAmount`/`appliedCampaignIds` şu an sadece manuel insert / admin seed yoluyla doluyor. Faz 6 production deploy'unda WhatsApp link'i koruyup ek olarak `createOrder` action eklenebilir (analytics + retention için).
- **Cloudinary / Supabase Storage gerçek upload** — admin formları hâlâ URL paste, file picker yok. Plan'da F5 olarak Faz 6'ya devredildi.
- **VAPID + Turnstile + Resend domain** — gerçek anahtar bekliyor, Faz 6.

---

## Commits (en yeni → en eski)

```
fa7332e chore(env): NEXT_PUBLIC_SITE_URL ornek
6d266a6 fix(privacy): server-side KVKK consent gating
3c2b83a fix(orders): discount_amount + appliedCampaignIds mapping + admin UI
799096d fix(mapper): gallery_posts + categories isActive/displayOrder + public site onlyActive filter
dd2ff2f feat(ux): route-bazli loading skeleton'lari + global-error fallback
959bee5 chore(copy): stale faz referanslarini Faz 6'ya guncelle (4 sayfa)
afd9ebc fix(settings-leak): add-to-cart + iletisim mockSiteSettings yerine repo.getSettings + useRouter
c2fda67 fix(product-form): inline script yerine React state - badge sync
```
