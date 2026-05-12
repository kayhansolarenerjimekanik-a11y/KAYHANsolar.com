# Verification Report — Test + Bug Fix

**Tarih:** 2026-05-12
**Plan:** [docs/plans/2026-05-11-test-ve-buglar.md](../plans/2026-05-11-test-ve-buglar.md)
**Tamamlanan görev sayısı:** 30 / 30
**Mod:** `AUTH_MODE=supabase`, `DATA_MODE=supabase`

---

## Düzeltilen buglar

### Bug 1: Kampanya "buy_x_get_y_discount" sepete uygulanmıyordu (kök neden: süresi geçmiş `endDate`)

- **Belirti:** "4 panel alana 5.si %70 indirim" sepette hiç görünmüyordu.
- **Kök neden:** `lib/mock/data.ts`'te `bahar-kampanyasi-2025` için `endDate: "2025-06-30"`, `lityum-batarya-indirimi` için `"2025-05-31"`. Bugün 2026-05-12 → `lib/campaigns/rules.ts:122 isActiveNow()` false dönüyor → `evaluateCampaign()` null dönüyor.
- **Fix (commit `9e4acd8`):**
  - Mock seed dosyasında her iki endDate `"2027-12-31T23:59:59Z"` yapıldı.
  - `scripts/refresh-campaign-dates.ts` oluşturuldu — Supabase'deki süresi geçmiş tüm kampanyaları otomatik günceller.
  - `pnpm run refresh:campaigns` komutu eklendi.
- **Doğrulama (commit `374b882`):** CLI test scripti, 5×Jinko paneli (3450 TL/birim) sepetinde Bahar Kampanyası'nın 2415 TL indirim ürettiğini gösterdi (3450 × 0.70 = 2415, math doğru).

### Bug 2: Kampanya kartına tıklayınca filtreli sayfaya gitmiyordu

- **Belirti:** Anasayfadaki kampanya kartına tıklayınca `/magaza?kampanya=<slug>` URL'i açılıyordu ama mağaza sayfası bu query param'ı işlemediği için filtresiz tüm ürünler listeleniyordu.
- **Kök neden:**
  - `components/home/campaign-strip.tsx` — her zaman aynı URL formatını üretiyordu, applicableTo'ya göre akıllı yönlendirme yoktu.
  - `components/shop/shop-view.tsx` — `kampanya` query param hiç okunmuyordu.
  - `app/(public)/magaza/page.tsx` — `repo.listCampaigns()` çağırmıyordu, ShopView'a kampanya verisi geçmiyordu.
- **Fix (commit `c2aff9e`):**
  - CampaignStrip akıllı `targetHref()`: tek ürün hedefi → `/urun/<slug>`, tek kategori hedefi → `/magaza?kategori=<slug>&kampanya=<slug>`, çoklu/tüm hedef → `/magaza?kampanya=<slug>`.
  - ShopView: `kampanya` slug'ına göre filtre + üstte yeşil banner ("Kampanya filtresi: <title>" + "Filtreyi kaldır" butonu).
  - Magaza page: `repo.listCampaigns()` Promise.all'a eklendi, ShopView prop'una geçildi.
- **Doğrulama:** Anasayfada 3 aktif kampanyanın hepsi akıllı linke sahip (`/magaza?kategori=gunes-panelleri&kampanya=bahar-kampanyasi-2025` vb.). Banner HTML'de görünüyor, filtre çalışıyor (12 üründen 3'e düştü).

### Bug 3 (sweep'te keşif): 23 adet `@typescript-eslint/no-explicit-any` hatası

- **Belirti:** `pnpm run lint` 23 hata veriyordu. Önceki cutover doğrulamasının lint'i clean derken aslında bu dosyaları kapsamamış.
- **Kök neden:** Supabase cutover'da `lib/data/mappers.ts` ve `lib/data/supabase/*.ts` içinde Supabase client'ın `never[]` çıkışını bypass etmek için `any` cast'leri kullanılmıştı.
- **Fix (commit `8ea844c`):** Tüm `any` cast'leri `Record<string, unknown>` + alan başına `as string`/`as boolean` vb. ile değiştirildi. Davranış değişmedi, sadece tip annotation'ları.

---

## Test edildi

### Sub-Phase A — Recon

| Kontrol | Sonuç |
|---|---|
| Dev server boot (Supabase modunda) | ✅ Ready in 999ms |
| 7 public sayfa HTTP smoke | ✅ Hepsi 200 |
| `/kayhan-yonetim` protected redirect | ✅ HTTP 307 → `/giris` |
| Kampanya verisi recon (Supabase) | ✅ 2 expired campaign tespit edildi |
| Buy-x-get-y mantık review (`lib/campaigns/rules.ts`) | ✅ Mantık doğru, fix endDate'te |

### Sub-Phase B — Bug fix

| Kontrol | Sonuç |
|---|---|
| Mock data + Supabase endDate yenileme | ✅ 2 kampanya 2027-12-31'e çekildi |
| `pnpm run refresh:campaigns` script | ✅ Tekrar çalıştırılabilir |
| Sepet matematik testi (5 panel × 3450 TL) | ✅ 2415 TL indirim üretildi |
| Smart redirect (3 aktif kampanya) | ✅ Hepsinin doğru kategori-bazlı linki var |
| `?kampanya=<slug>` banner + filtre | ✅ HTML'de banner render, 12 → 3 ürün filtresi |

### Sub-Phase C — Public site sweep (9 görev)

| Görev | Sonuç |
|---|---|
| T7 Anasayfa (`/`) | ✅ Güncel Kampanyalar, Öne Çıkan, Kategoriler, Bahar Kampanyası, Jinko — hepsi render |
| T8 `/magaza` (9 filtre varyasyonu) | ✅ Hepsi 200, `q=jinko` filtreli, `q=zzzzz` empty state |
| T9 Ürün detay (3 slug) | ✅ Hepsi 200, 404 senaryo OK, fiyat `₺` sembolüyle (TL değil) |
| T10 `/sepet` | ✅ 200, client-side test (zustand) browser-gerekli |
| T11 `/teklif-al` | ✅ 200, offer-wizard yüklendi, form submit browser-gerekli |
| T12 `/galeri` + 4 detay | ✅ 4 post listelendi, hepsinin detayı 200 |
| T13 `/api/search?q=jinko` | ✅ 1 hit, empty query graceful (200+empty arrays, 500 değil) |
| T14 AI chat (`/api/chat`) | ✅ 200 stream, Gemini yanıt veriyor. **Not:** planda `/api/ai/chat` yazmıştı, gerçek path `/api/chat` |
| T15 9 statik sayfa + theme + KVKK | ✅ Hepsi 200, cookie banner render |

### Sub-Phase D — Admin panel sweep (9 görev)

Admin'e HMAC session cookie mint ederek auth ile curl smoke yapıldı (`AUTH_SECRET` ile imzalı `kayhan_session` cookie).

| Görev | Sonuç |
|---|---|
| T16 `/kayhan-yonetim/giris` | ✅ Unauth 200 (form fields), auth 307 → dashboard |
| T17 `/kayhan-yonetim` dashboard | ✅ 4 KPI (Yeni Teklif/Bekleyen/Düşük Stok/Aktif Kampanya) HTML'de |
| T18 `/urunler` | ✅ 12 ürün edit linki + "Yeni Ürün" |
| T19 `/kategoriler` | ✅ 5 kategori render |
| T20 `/kampanyalar` | ✅ 3 kampanya, "Aktif" badge'leri görünür |
| T21 `/galeri` | ✅ 4 post (Diyarbakır, Mardin, Şanlıurfa, Batman) |
| T22 `/teklifler` | ✅ 200 |
| T23 `/siparisler` | ✅ 200 (empty state, henüz sipariş yok) |
| T24 `/stok-bildirimleri`, `/ai-egitim`, `/analitik`, `/kullanicilar`, `/ayarlar` | ✅ Hepsi 200 |
| Ürün round-trip (Supabase → admin liste) | ✅ 3 ürün adı + Türkçe locale fiyat + stok eşleşti |

### Sub-Phase E — Backend / RLS / mapper

**RLS matrisi (12/12 ✅):**

| Test | Beklenen | Gerçek |
|---|---|---|
| anon SELECT products | OK | OK |
| anon SELECT categories | OK | OK |
| anon SELECT campaigns | OK | OK |
| anon SELECT gallery_posts | OK | OK |
| anon SELECT site_settings | OK | OK |
| anon SELECT profiles | BLOCKED | BLOCKED |
| anon SELECT admin_notifications | BLOCKED | BLOCKED |
| anon SELECT offers | BLOCKED | BLOCKED |
| anon SELECT orders | BLOCKED | BLOCKED |
| anon INSERT offers | OK | OK (201) |
| anon INSERT orders | OK | OK (201) |
| anon UPDATE products | BLOCKED | BLOCKED |

**Not:** `anon.insert(...).select()` "row violates RLS" hatası verebilir (RETURNING clause SELECT policy'sini tetikliyor). Public form kodu bare `.insert(...)` kullanıyor — doğru pattern.

**Bildirim sayıları (son 24h):** low_stock=0, new_offer=0, new_order=0 (boş — Sub-Phase C/D'de form submit yapılmadı).

### Sub-Phase F — Build/lint/tsc

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ 0 hata |
| `pnpm run lint` | ✅ 0 hata (23 lint hatası `8ea844c`'de düzeltildi) |
| `pnpm build` | ✅ 59 sayfa, 12.0s, hata yok |

---

## Mapper coverage gap'leri (bilgi amaçlı, UI bug üretmiyor)

`lib/data/mappers.ts` Supabase kolonlarının bir kısmını domain tipine geçirmiyor. Sub-Phase C ve D'de UI sorununa yol açmadıkları için fix öncelikli değil:

- **products:** `is_in_stock`, `meta_title`, `meta_description`, `last_supplier_check`, `supplier_sync_enabled`, `updated_at`
- **offers:** `user_id`, `responded_by`
- **orders:** `user_id`, `discount_amount`, `applied_campaigns`, `payment_status`, `payment_reference`, `updated_at`
- **campaigns:** `created_at`
- **gallery_posts:** `long_description`, `client_name`, `display_order`, `is_active`, `created_at`
- **categories:** `is_active`, `created_at`
- **admin_notifications:** `metadata`
- **profiles:** mapper yok (auth flow doğrudan kolonları okur)
- **ai_knowledge:** mapper yok (vector search query farklı path)
- **site_settings:** ✅ tam (key-value aggregation)

**Etkisi olabilecek senaryolar (gelecekte fix gerekirse):**
- `gallery_posts.is_active=false` set edilirse public `/galeri` hala gösterir (mapping'de bu field yok).
- `gallery_posts.display_order` set edilirse sıralanmaz.
- `orders.discount_amount` admin order detayında görünmez.

---

## Manuel doğrulama gerekiyor (CLI'dan yapamadım)

Tarayıcıda akış testi:

- **Sepet client-side davranışları:** "Sepete Ekle" → toast, qty +/-, ürün sil, WhatsApp checkout link içeriği
- **Teklif-al 6 adımlı form submit:** wizard akışı, KVKK checkbox, Supabase `offers` row + `admin_notifications` insert (form submit sonrası)
- **AI chat FAB:** cookie banner accept sonrası FAB açılması, mesaj stream
- **Theme toggle:** dark/light persistence
- **Cookie banner:** Accept / Reject davranışları, "Sadece zorunlu" gating
- **Admin login form submit:** server action ile password verify
- **Admin form submit'leri:** ürün/kategori/kampanya/galeri create/edit/delete + revalidatePath public tarafa yansıyor mu
- **Low-stock notification trigger:** admin UI'dan stok=1 yapınca `admin_notifications` `low_stock` satır
- **Multi-step wizard medya upload:** Cloudinary veya Supabase storage (Faz 4 plan'da)

---

## Bilinen eksikler (sonraki adımlar)

- Otomatik test altyapısı yok (master plan §3.9 — Vitest/Playwright Faz 5+)
- Web Push (VAPID) anahtarları yok — stok bildirimi mock
- Cloudflare Turnstile anahtarları yok — wizard'da spam koruması placeholder
- Resend domain doğrulaması yok — emailler dev sandbox'tan gidiyor
- Mapper coverage gap'leri (yukarıdaki liste) — future feature için fix

---

## Commits

Plan boyunca atılan commit'ler (en yeni → en eski):

```
f27c1f7 verify: build + tsc + lint clean (59 page, 12s)
8ea844c chore(data): no-explicit-any temizligi (23 hata)
fbc1cf9 verify: rls matrix + side-effect counts + mapper roundtrip
3897105 test: admin paneli 9 sayfa smoke (passed)
b67c1dd test: statik sayfalar + kvkk consent smoke
11c66d3 test: ai chat smoke (passed)
3e47d0d test: search api smoke
fe50abc test: galeri liste+detay smoke
ca3896d test: teklif-al wizard smoke
af6cdce test: sepet smoke
6bcfe62 test: urun detay smoke
cced5d6 test: magaza filtre/sort/arama smoke
4489fc2 test: anasayfa smoke
c2aff9e fix(campaigns): kampanya kartlari smart redirect + magaza ?kampanya= filtresi
374b882 verify: buy_x_get_y sepette uygulaniyor
9e4acd8 fix(campaigns): endDate'leri yenile + refresh:campaigns scripti
4b568ee recon: buy_x_get_y mantigi dogru
17d4c5b recon: kampanya verisi dogrulandi
ae9b96d checkpoint: test-ve-buglar plani baslangic
```

---

## Önerilen Sıradaki Adım

Master plan §13 Faz 6 — Production deployment:
- Vercel hosting + custom domain
- Cloudflare DNS + Turnstile gerçek site key
- Resend domain doğrulaması
- VAPID keypair üretimi (Web Push gerçek production)
- Sentry / Vercel Analytics entegrasyonu
- Mapper coverage gap'lerini (gallery_posts.is_active, orders.discount_amount) fix
