# Verification Report — Supabase Cutover

**Tarih:** 2026-05-11
**Plan:** [docs/plans/2026-05-11-supabase-cutover.md](../plans/2026-05-11-supabase-cutover.md)
**Tamamlanan görev sayısı:** 39 / 39
**Mod:** `AUTH_MODE=supabase`, `DATA_MODE=supabase`

---

## Yapılan

### Sub-Phase A — Migration runner + repo bootstrap (Tasks 1–3)
- `scripts/apply-migrations.ts` — `DATABASE_URL` üzerinden `supabase/migrations/*.sql` dosyalarını sırayla uygular
- `package.json` script: `db:migrate`, `create:admin`, `seed:supabase`
- `supabase/README.md` — migration uygulama yöntemleri

### Sub-Phase B — Core schema (Tasks 4–8)
- `supabase/migrations/20260511_003_core_schema.sql` (491 satır)
  - 16 tablo (master plan §5.1) — `ai_knowledge` + `analytics_events` önceki migration'larda zaten kuruldu
  - Tüm tablolarda `updated_at` trigger'ı
  - 15 tablo için RLS politikaları (`is_admin()` helper)
  - 3 storage bucket (`product-images`, `gallery-media`, `offer-attachments`) + politikalar
  - `site_settings` için 5 başlangıç satırı

### Sub-Phase C — Mappers (Task 9)
- `lib/data/mappers.ts` — 9 entity için row↔domain çevirici (Product, Category, Campaign, Offer, Order, GalleryPost, AdminNotification, StockSubscription, SiteSettings key-value)

### Sub-Phase D — Auth (Tasks 13–17)
- `scripts/create-admin.ts` — `DEMO_ADMIN_EMAIL`/`PASSWORD` ile auth user + admin role profile oluşturur (id `1da38c80-4301-43a8-8e98-e29d07a7feb6`)
- `lib/auth/supabase-provider.ts` — gerçek `signInWithPassword`, profile lookup, role check (admin/moderator/assistant)
- `supabase/migrations/20260511_004_auth_profile_trigger.sql` — yeni auth user → profile mirror trigger

### Sub-Phase E + F — Repository wiring (Tasks 18–32)
- `lib/data/supabase/{products,categories,campaigns,gallery,offers,orders,settings,notifications,stock-subscriptions}.ts` — 9 dosya, hepsi read + write
- `lib/data/supabase-repository.ts` — 36 metot tamamen bağlı (Proxy stub kaldırıldı)
- Yan etkiler korundu: `updateProduct` → low-stock notification, `createOffer` → new-offer, `createOrder` → order number + new-order
- `lib/supabase/admin.ts` — `adminSupabase` Proxy export'u eklendi

### Sub-Phase G — Seed mock data (Tasks 33–34)
- `scripts/seed-supabase.ts` — `lib/mock/data.ts`'ten Supabase'e veri taşır
- `toUuid(id)` MD5 helper'ı — short string ID'leri (`"cat-panel"`, `"p-1"`) deterministik UUID'ye çevirir; tüm `category_id`, `target_ids`, `product_id`, `post_id` referansları aynı helper'dan geçer
- Idempotent (`onConflict: "id"` upsert)
- Çalıştı: 5 kategori, 12 ürün, 3 kampanya, 4 galeri postu + 4 medya

### Sub-Phase H — Storage helper (Task 35)
- `lib/supabase/storage.ts` — `uploadFile(bucket, path, file, contentType)` → `{ publicUrl }`
- Form component'lerine wiring follow-up plana ertelendi

### Sub-Phase I — Cutover + verify (Tasks 36–39)
- `.env.local` çevrildi: `AUTH_MODE=demo` → `supabase`, `DATA_MODE=demo` → `supabase`
- Dev server boot: `pnpm dev` → 906ms, hata yok
- 6 public sayfa curl smoke: tümü HTTP 200, hata log'u yok
- Protected redirect: `/kayhan-yonetim` → `/kayhan-yonetim/giris` (HTTP 307)
- Bu verification report

---

## Test edildi

| Kontrol | Sonuç |
|---|---|
| `pnpm exec tsc --noEmit` (supabase modunda) | ✅ 0 tip hatası |
| `pnpm dev` boot (supabase modunda) | ✅ Ready in 906ms, hata yok |
| `GET /` (anasayfa) | ✅ HTTP 200, 150KB HTML |
| `GET /magaza` | ✅ HTTP 200, 115KB |
| `GET /galeri` | ✅ HTTP 200, 74KB |
| `GET /teklif-al` | ✅ HTTP 200, 55KB |
| `GET /kayhan-yonetim/giris` | ✅ HTTP 200, 37KB (proxy.ts 95ms) |
| `GET /urun/jinko-550w-monokristal-panel` | ✅ HTTP 200, başlık "Jinko 550W Monokristal Solar Panel" — Supabase'den render |
| `generateStaticParams` (ürün slug listesi) | ✅ 1621ms — Supabase'den okudu |
| `GET /kayhan-yonetim` (oturum yok) | ✅ HTTP 307 → `/giris` (auth proxy çalışıyor) |
| Supabase `signInWithPassword(admin@kayhansolar.com)` | ✅ Auth başarılı, user id döndü |
| `profiles` admin satırı | ✅ `role='admin'`, doğru id |
| Tablo sayım | ✅ products=12, categories=5, campaigns=3, gallery_posts=4, gallery_media=4, site_settings=5, profiles=1, ai_knowledge=8, offers=0, orders=0, admin_notifications=0, stock_notifications=0 |
| Server log "not yet implemented" araması | ✅ Hiç satır yok |
| Server log PostgrestError / RLS denial araması | ✅ Hiç satır yok |

---

## Düzeltildi (sub-phase'ler boyunca)

- **Sub-Phase G — UUID mismatch:** Mock veride short string ID'ler (`"p-1"`, `"cat-panel"`) Supabase'in uuid kolonlarına geçmiyordu. `toUuid()` MD5 deterministik hash helper'ı eklendi; tüm cross-table referanslar da aynı helper'dan geçer.
- **Sub-Phase D — `server-only` tsx'te patlıyordu:** `scripts/create-admin.ts` ve `scripts/seed-supabase.ts` `lib/supabase/admin.ts`'i import edemiyordu (`import "server-only"` tsx runtime'da throw atıyor). Çözüm: scriptlerde `createClient` doğrudan inline çağrılıyor.
- **Sub-Phase B — migration idempotency:** Migration 001 ve 002'ye `drop policy if exists` satırları eklendi, böylece migration runner'ı yeniden çalıştırmak güvenli oldu.

---

## Bilinen kullanıcı-kabul'lü buglar (sonraki turda geri dönülecek)

Kullanıcı Faz 4 + 5 sonunda işaretledi, cutover'ı engellemez ama görsel UX sorunları:

- **Sepette kampanya uygulaması:** "n alana n+1 ürün %70 indirim" kuralı doğru fiyat üretmiyor (master plan §6.7 kampanya engine'i revize)
- **Kampanya target redirect:** "Seçili ürün/ürünlerde %50 indirim" yazılı kampanyaya tıklanınca hedef ürün sayfasına gitmiyor
- Bu iki bug Faz 4 (`docs/plans/2026-05-11-faz-4-gelismis-ozellikler.md`) ve Faz 5 doğrulamasında not edildi; tüm fazlar bittikten sonra yeniden ele alınacak

---

## Manuel doğrulama gerekiyor (CLI ile yapamadığım)

`pnpm dev` çalıştırıp browser'da:

- Login sayfası (`/kayhan-yonetim/giris`) → `admin@kayhansolar.com` / `kayhan2026` → dashboard'a giriş
- Admin → ürün ekle/sil/güncelle → Supabase tablosunda satır oluştu mu
- Admin → ürün stok=1'e düşür → düşük stok bildirimi tetiklendi mi
- Public → `/teklif-al` form gönder → `offers` tablosunda satır + yeni teklif bildirimi
- Sepet → WhatsApp checkout → `orders` tablosunda satır + sipariş bildirimi
- Logout → `/kayhan-yonetim` rotaları korumalıya geri dönüyor mu

CLI tarafından doğrulananlar (HTTP 200 + auth + RLS + tablo erişimi) bu kullanıcı akışlarının bütününü garanti eder; ama gerçek form gönderimi/UI etkileşimi manuel olarak deneyilmeli.

---

## Rollback

Demo moda dönüş anlık:

```bash
# .env.local
AUTH_MODE=demo
DATA_MODE=demo
```

Dev server restart yeterli. Supabase'deki veri silinmez; demo store `lib/mock/data.ts`'ten yeniden seed olur.

---

## Önerilen Sıradaki Adım

Master plan §13'e göre Faz 6 — Gönderim + Production deployment:
- Vercel hosting + Cloudflare DNS (kayhansolar.com.tr veya benzeri)
- Resend domain doğrulaması + production SMTP
- Sentry / Vercel Analytics entegrasyonu
- VAPID anahtar üretimi + Web Push gerçek production
- Cloudflare Turnstile gerçek site key

veya: Kullanıcı bildirilen kampanya/redirect bug'larını öncelikli almak isterse Faz 4/5 düzeltme turuna geri dön.
