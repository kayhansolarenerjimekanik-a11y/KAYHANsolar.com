# Netlify'a Üretim Deployı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** KAYHAN Solar Next.js 16 sitesini Netlify'a deploy ederek `kayhansolar.com` adresinden canlıya çıkarmak; tüm entegrasyonların (Supabase, Resend, Gemini, VAPID, Turnstile) üretimde çalıştığını doğrulamak.

**Architecture:** İki kollu yaklaşım. (1) **Yerel kod hazırlığı**: `netlify.toml`, Node version pin, `next.config.ts`'te Supabase Storage hostname eklenmesi, yerel production build doğrulaması — hepsi geri çevrilebilir, repo'da yedeklenmiş. (2) **Netlify Dashboard işleri**: hesap açma, repo bağlama, 14 env variable kopyalama, domain bağlama, DNS kayıtları — kullanıcının dashboard'da yapacağı manuel adımlar, agentin sadece doğrulayabildiği işler.

**Tech Stack:** Next.js 16.2.6 (App Router), Node 24 LTS, pnpm 10.x, Netlify Build + `@netlify/plugin-nextjs` (auto-detect), Cloudflare DNS veya domain sağlayıcısı DNS, Let's Encrypt SSL (Netlify otomatik provision).

**Bağımlılıklar:**
- `feat/admin-datatable-yayilim` branch'indeki `c1fd4e5 feat(storage): ...` commit'i main'e merge edilmiş olmalı (storage migration source-of-truth'ta gerekli).
- Tüm env anahtarları `.env.local`'da set olmalı (var: Supabase, Resend, Gemini, VAPID, Turnstile).

**Verification:**
Her task sonunda:
```
pnpm exec tsc --noEmit && pnpm lint
```
Sıfır hata. Deploy task'ları sonunda smoke test komutu task içinde yazılı.

**Kapsam dışı (gerekçeli):**
- **Resend domain DNS doğrulama** — bu plana paralel, başka runbook'ta (Faz 6 §4); 5 dk-24 saat sürer, deploy plan'ı bekletmesin.
- **F-2 admin upload UI** — storage bucket'ları kullanıp Supabase'e görsel yükleyen admin sayfası; ayrı plan.
- **Monitoring/Sentry/Analytics** — launch sonrası, Faz 7+.
- **WooCommerce entegrasyonu** — proje sahibi kararıyla devre dışı (Supabase mağazasıyla devam).

---

## Task 1: `netlify.toml` build config'i ekle

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Dosyayı oluştur**

```toml
# netlify.toml — Netlify build config for kayhan-solar
# Plugin @netlify/plugin-nextjs auto-installs and handles Next.js routing,
# server components, server actions, and image optimization.

[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "24"
  PNPM_VERSION = "10"
  NEXT_TELEMETRY_DISABLED = "1"

# @netlify/plugin-nextjs is auto-detected when Next.js is in package.json
# but explicit declaration prevents version drift surprises.
[[plugins]]
  package = "@netlify/plugin-nextjs"

# Security headers — defense in depth.
# CSP must allow Turnstile (challenges.cloudflare.com) and Supabase storage.
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

- [ ] **Step 2: Commit**

```bash
git add netlify.toml
git commit -m "build(netlify): toml ile build config + güvenlik header'ları"
```

---

## Task 2: Node version + paket yöneticisi pin'le

**Files:**
- Create: `.nvmrc`
- Modify: `package.json` (engines alanı ekle)

- [ ] **Step 1: `.nvmrc` oluştur**

```
24
```

- [ ] **Step 2: `package.json`'a `engines` alanı ekle**

`package.json` içinde `"private": true,` satırından hemen sonra şu bloğu ekle:

```json
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  },
```

Final `package.json` üst kısmı şuna benzemeli:

```json
{
  "name": "kayhan-solar",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  },
  "scripts": {
    ...
```

- [ ] **Step 3: Doğrula**

```bash
pnpm install
```

Hata vermemeli. `engines` warning verirse versiyon uyumlu demektir.

- [ ] **Step 4: Commit**

```bash
git add .nvmrc package.json
git commit -m "build: pin Node 24 + pnpm 10 engines"
```

---

## Task 3: `next.config.ts`'te Supabase Storage hostname'i ekle

**Files:**
- Modify: `next.config.ts`

**Neden:** Storage bucket'larından (`product-media`, `gallery-media`) gelen görseller `next/image` ile render edildiğinde, Next.js güvenlik nedeniyle remotePatterns whitelist'inde yoksa reddeder. Şu an sadece `picsum.photos` ve `images.unsplash.com` var.

- [ ] **Step 1: Dosyayı oku**

`next.config.ts` mevcut hali:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Supabase hostname'i ekle**

`remotePatterns` array'inin sonuna yeni bir entry ekle:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "ljehpnhcqdipyqxdcwwn.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Type check**

```bash
pnpm exec tsc --noEmit
```

Sıfır hata.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "build(next): allow Supabase Storage hostname for next/image"
```

---

## Task 4: Yerel production build smoke testi

**Files:** Yok (yalnızca komut çalıştırma)

**Neden:** Netlify'a göndermeden önce build'in yerelde geçtiğini görmek; sürpriz hataları orada yakalamak.

- [ ] **Step 1: Production build çalıştır**

```bash
pnpm build
```

Beklenen çıktı: build başarıyla bitmeli. Hatalar:
- `Module not found` → eksik dependency, `pnpm install` yap.
- `Type error` → tsc hatası, ilgili dosyada düzelt.
- `'next-themes' veya '@supabase/ssr' import` hatası → version mismatch, `pnpm-lock.yaml` sil + `pnpm install` tekrar.

- [ ] **Step 2: Production sunucusunu yerel çalıştır + smoke**

```bash
pnpm start
```

Tarayıcıda `http://localhost:3000` aç:
- Anasayfa açılıyor mu?
- `/urunler` listesi yükleniyor mu (Supabase'den gerçek veri)?
- Bir ürün detayına girip teklif al butonuna basabiliyor musun?
- `/kayhan-yonetim` admin paneli açılıyor mu (giriş ekranı)?

Yukarıdakilerden herhangi biri kırıksa, dev modda da kırık mı diye kontrol et (`pnpm dev`). Üretim-only hatalar genelde Server/Client component sınırı veya env değişkeni eksikliğidir.

- [ ] **Step 3: Production sunucusunu durdur**

Ctrl+C.

(Commit yok — bu task kod değişikliği üretmedi.)

---

## Task 5: Netlify hesabı ve GitHub repo bağlama (MANUEL — Dashboard)

**Files:** Yok (Netlify dashboard'da iş)

- [ ] **Step 1: Netlify hesabı aç**

`https://app.netlify.com/signup` → "Sign up with GitHub" → KAYHAN GitHub hesabıyla giriş yap.

- [ ] **Step 2: Yeni site oluştur**

Dashboard → **Sites** → **Add new site** → **Import an existing project** → **Deploy with GitHub**.

- [ ] **Step 3: Repository erişimi ver**

Netlify Authorization sayfasında `KAYHANsolar.com` reposunu izinli yap (sadece bu repo veya all repos, tercihen sadece bu).

- [ ] **Step 4: Repo'yu seç**

Listeden `kayhansolarenerjimekanik-a11y/KAYHANsolar.com` seç.

- [ ] **Step 5: Build settings'i kontrol et**

Netlify `netlify.toml` dosyasını okuyup otomatik dolduracak. Şunları gör:
- Branch to deploy: `main`
- Build command: `pnpm build` (toml'dan)
- Publish directory: `.next` (toml'dan)

Tüm değerler doğruysa **Deploy site** butonuna BASMA (önce env variable'lar lazım, sonraki task). Eğer Netlify zaten deploy başlattıysa, ilk deploy hata verecek (env eksik) — sorun değil, sonra düzeltilecek.

(Commit yok — manuel iş.)

---

## Task 6: Environment variables'ı Netlify'a ekle (MANUEL — Dashboard)

**Files:** Yok

**Neden:** 14 anahtar `.env.local`'da var ama Netlify'ın deploy'u görmüyor. Hepsini Netlify Dashboard'a kopyalamak gerek.

- [ ] **Step 1: Netlify env sayfasını aç**

Site Settings → **Environment variables** → **Add a variable**.

- [ ] **Step 2: Her bir anahtarı **Production**, **Deploy previews**, **Branch deploys** scope'larıyla ekle**

Aşağıdaki tablodaki her satır için "Add a variable" → key + value gir → tüm 3 scope'u işaretle → Save.

| Key | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`'dan kopyala |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local`'dan kopyala |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`'dan kopyala |
| `SUPABASE_SECRET_KEY` | `.env.local`'dan kopyala |
| `DATABASE_URL` | `.env.local`'dan kopyala |
| `AUTH_MODE` | Değer: `supabase` |
| `DATA_MODE` | Değer: `supabase` |
| `AUTH_SECRET` | **Yeni üret**: `openssl rand -hex 32` (yerelle aynı kullanma) |
| `RESEND_API_KEY` | `.env.local`'dan kopyala |
| `GEMINI_API_KEY` | `.env.local`'dan kopyala |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `.env.local`'dan kopyala |
| `TURNSTILE_SECRET_KEY` | `.env.local`'dan kopyala |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env.local`'dan kopyala |
| `VAPID_PRIVATE_KEY` | `.env.local`'dan kopyala |
| `VAPID_SUBJECT` | Değer: `mailto:m4likiletisim@gmail.com` |
| `NEXT_PUBLIC_SITE_URL` | Şimdilik: Netlify'ın verdiği `*.netlify.app` URL'i. Custom domain bağlandıktan sonra `https://kayhansolar.com` ile güncellenecek. |

- [ ] **Step 3: Sensitive değişkenleri "secret" işaretle**

`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `GEMINI_API_KEY`, `TURNSTILE_SECRET_KEY`, `VAPID_PRIVATE_KEY` — her birinde "Mark as sensitive" tikini açık tut. Bu Netlify UI'da değeri maskeler ve build log'a sızdırmayı önler.

- [ ] **Step 4: Doğrulama**

Environment variables listesinde 16 satır görmeli (`NODE_VERSION` ve `PNPM_VERSION` toml'dan eklenmiş, env'de görünmez ama build'de kullanılır).

(Commit yok.)

---

## Task 7: İlk deploy'u tetikle ve preview'da smoke test

**Files:** Yok

- [ ] **Step 1: Deploy tetikle**

Site overview → **Deploys** → **Trigger deploy** → **Deploy site**. Veya az önceki başarısız deploy varsa **Retry deploy** → **Retry with latest branch**.

- [ ] **Step 2: Build log'u izle**

Deploy detayında log akışını aç. Beklenen sıra:
1. `Installing pnpm`, `Installing dependencies` (~2-3 dk)
2. `pnpm build` (~3-5 dk)
3. `@netlify/plugin-nextjs` Next.js artifacts'ı paketliyor
4. `Site is live` mesajı

Hatalar:
- `command failed: pnpm build`: env var eksik veya yanlış. Build log'da hangi hata yazıyor bak.
- `Module not found "@supabase/ssr"`: pnpm-lock.yaml versiyon uyumsuzluğu, yerelde `rm pnpm-lock.yaml && pnpm install && git commit` yap.

- [ ] **Step 3: Preview URL'i kopyala**

Başarılı deploy'da site overview'da `*.netlify.app` URL'i görünür (örn. `kayhan-solar-12345.netlify.app`). Bu URL'i smoke test için kullan.

- [ ] **Step 4: Smoke testler**

Tarayıcıdan preview URL'i aç, sırasıyla:

1. **Anasayfa** (`/`): sayfa açılıyor, kampanya slider'ı yükleniyor, ürün grid'i render ediliyor mu?
2. **Ürün liste** (`/urunler`): Supabase'den gelen ürünler listeleniyor mu? Boş kategori filtresi çalışıyor mu?
3. **Ürün detay** (`/urun/<bir-slug>`): görsel yükleniyor mu? "Sepete ekle" butonu çalışıyor mu?
4. **Teklif al formu** (`/teklif-al`): Turnstile widget çıkıyor mu (yeşil onay)? Form gönder → 200 dönüyor mu?
5. **Admin login** (`/kayhan-yonetim`): giriş ekranı çıkıyor mu? `admin@kayhansolar.com` ile giriş → admin paneline yönleniyor mu?
6. **API health** (`/api/chat`): KVKK consent olmadan 403 dönüyor mu? (Master Fix E1 davranışı)

Herhangi bir adımda fail varsa:
- Network tab'ı kontrol et (4xx/5xx response'lar)
- Netlify function log'larına bak (Functions → Logs)
- Env variable eksikliği en yaygın nedendir

- [ ] **Step 5: Smoke fail varsa commit/fix iterate**

Bulgu varsa yerelde düzelt → commit → push → Netlify otomatik deploy edecek (~5 dk) → tekrar smoke. 6 madde de geçtikten sonra ilerle.

---

## Task 8: Custom domain bağla ve DNS kayıtlarını gir

**Files:** Yok

**Bağımlılık:** Domain `kayhansolar.com`'un DNS'i nereden yönetiliyor bilmek gerekiyor (Cloudflare, GoDaddy, Natro, IsimTescil vb.). Kullanıcıdan teyit al.

- [ ] **Step 1: Netlify'a domain ekle**

Site Settings → **Domain management** → **Add a domain** → `kayhansolar.com` yaz → **Verify**.

Netlify "Bu domain'i sen mi sahiplendin?" sorar → **Yes, add domain**.

- [ ] **Step 2: Netlify DNS kayıtlarını topla**

Netlify sana 2-3 seçenek verir:
1. **Netlify DNS** (önerilen): tüm DNS yönetimini Netlify'a aktar (4 NS kaydı).
2. **External DNS**: A kaydı (`75.2.60.5`) veya CNAME (`apex-loadbalancer.netlify.com`).

Tavsiye edilen yol Netlify DNS — SSL otomatik, deploy önizleme alt domain'leri otomatik. Ama mevcut DNS'te başka kayıt varsa (örn. Resend için TXT, MX), bunları Netlify DNS'e taşımalısın.

- [ ] **Step 3: Domain sağlayıcıda kayıtları gir**

**Eğer Netlify DNS:**
- Domain sağlayıcısının kontrol panelinde Nameservers'ı şu 4'e değiştir (Netlify sana verir, örnek):
  - `dns1.p01.nsone.net`
  - `dns2.p01.nsone.net`
  - `dns3.p01.nsone.net`
  - `dns4.p01.nsone.net`
- Resend DNS kayıtları (SPF, DKIM) zaten girilmişse, Netlify DNS panel'inde aynısını ekle (yoksa Resend ayrı plan'da gelecek).

**Eğer External DNS:**
- A kaydı: Host `@`, Value `75.2.60.5`, TTL 3600
- CNAME: Host `www`, Value `<site-name>.netlify.app`, TTL 3600

- [ ] **Step 4: Propagation bekle ve doğrula**

DNS propagation 5 dk - 24 saat sürer. Komutla kontrol et:

```bash
nslookup kayhansolar.com 8.8.8.8
```

Beklenen: Netlify IP'si (`75.2.60.5`) dönmeli. Eski IP geliyorsa daha bekle.

(Commit yok.)

---

## Task 9: SSL sertifikasını doğrula

**Files:** Yok

- [ ] **Step 1: Netlify SSL durumunu kontrol et**

Domain management → **HTTPS** bölümü. "Let's Encrypt certificate" yeşil "Active" göstermeli. DNS propagate olmamışsa "Waiting for DNS" yazar — bekle.

- [ ] **Step 2: HTTPS testi**

```bash
curl -I https://kayhansolar.com
```

Beklenen: `HTTP/2 200` ve `strict-transport-security` header'ı.

- [ ] **Step 3: HTTP → HTTPS yönlendirmesi**

```bash
curl -I http://kayhansolar.com
```

Beklenen: `HTTP/1.1 301 Moved Permanently` ve `Location: https://kayhansolar.com/`.

(Commit yok.)

---

## Task 10: `NEXT_PUBLIC_SITE_URL`'i kayhansolar.com'a güncelle

**Files:** Yok (Netlify env değişiminden ibaret)

- [ ] **Step 1: Netlify env'de URL'i güncelle**

Site Settings → Environment variables → `NEXT_PUBLIC_SITE_URL` → **Edit** → Değeri `https://kayhansolar.com` yap → Save.

- [ ] **Step 2: Yeni deploy tetikle**

Deploys → **Trigger deploy** → **Clear cache and deploy site**. (Cache temizliği önemli — eski URL build'e gömülü kalmasın.)

- [ ] **Step 3: SEO meta tag doğrula**

Deploy bittikten sonra production URL'i tarayıcıda aç → View Source → şu satırı bul:

```html
<meta property="og:url" content="https://kayhansolar.com/...">
```

`*.netlify.app` değil `kayhansolar.com` olmalı. Aynı kontrol için:

```bash
curl -s https://kayhansolar.com/sitemap.xml | head -20
```

URL'ler `https://kayhansolar.com/...` ile başlamalı.

(Commit yok.)

---

## Task 11: Production smoke testleri (full pas)

**Files:** Yok (sadece manuel test)

- [ ] **Step 1: Public sayfalar smoke (production URL)**

`https://kayhansolar.com` üzerinde Task 7 Step 4'teki 6 testi tekrarla. Hepsi geçmeli.

- [ ] **Step 2: Storage entegrasyon smoke**

Admin paneline gir, bir ürünün medyasına bak. Görsel URL'i tarayıcıda direkt aç:
```
https://ljehpnhcqdipyqxdcwwn.supabase.co/storage/v1/object/public/product-media/<id>/<file>.jpg
```
200 dönmeli, görsel açılmalı. (F-2 admin upload UI henüz yoksa, mevcut Supabase'deki demo verileri test edebilirsin.)

- [ ] **Step 3: Push notification smoke (admin)**

Admin tarayıcısında VAPID subscribe akışı test et:
1. `/kayhan-yonetim/bildirimler` aç (varsa) veya admin header'da "Bildirimleri aç" butonu.
2. Tarayıcı izin pop-up'ı gelmeli (HTTPS şart — production'da çalışır, localhost'ta da çalışırdı ama HTTP'de çalışmaz).
3. İzin ver → subscription Supabase `web_push_subscriptions` tablosuna yazılmalı.

Doğrulama (DBeaver veya psql ile):
```sql
select count(*) from web_push_subscriptions where user_id = '1da38c80-4301-43a8-8e98-e29d07a7feb6';
```
1 veya daha fazla satır.

- [ ] **Step 4: Email smoke (Resend)**

Bir teklif başvurusu doldur ve gönder. Admin email kutusunu kontrol et:
- Inbox'a düştü mü (spam değil)?
- Sender alanında `noreply@kayhansolar.com` mı (Resend domain doğrulanmışsa) veya `onboarding@resend.dev` mı (henüz doğrulanmamışsa)?

Eğer `onboarding@resend.dev` görüyorsan, ayrı runbook (Faz 6 §4 Resend domain) çalıştırılmamış demektir. Plan bittikten sonra onu yap.

- [ ] **Step 5: Lighthouse audit**

Chrome DevTools → Lighthouse → "Mobile" + "All categories" → Run.

Hedef:
- Performance: ≥ 80
- Accessibility: ≥ 95
- Best Practices: ≥ 90
- SEO: ≥ 90

Kırmızı veya 50 altı bir metrik varsa, bulguları yeni bir issue/plan'a topla — bu plan'ı tamamla, optimizasyon ayrı tur.

---

## Task 12: Memory + dokümantasyon güncelleme

**Files:**
- Modify: `C:\Users\Lenovo\.claude\projects\C--SOLAR-S1TE\memory\project_integrations.md`
- Modify: `docs/runbooks/faz-6-production-prep.md` (bittikleri işaretle)

- [ ] **Step 1: Memory güncelle**

`project_integrations.md`'de "**Eksik**" satırından deploy ile ilgili kalemleri sil:
- ~~deploy host (Vercel yerine Netlify/Render/Hostinger)~~
- ~~`NEXT_PUBLIC_SITE_URL`~~

Yeni "Deploy" satırı ekle:
```
- **Netlify deploy**: site canlı (https://kayhansolar.com). 14 env variable Netlify'a kopyalandı. Auto-deploy main push'larda tetikleniyor. SSL Let's Encrypt aktif.
```

- [ ] **Step 2: Runbook'a "DONE" işareti**

`docs/runbooks/faz-6-production-prep.md` §5 (Vercel) bölümünün üstüne not düş:
```
> **Not (2026-05-13):** Deploy Vercel yerine Netlify ile yapıldı, ayrı plan: docs/superpowers/plans/2026-05-13-netlify-deploy.md.
```

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/faz-6-production-prep.md
git commit -m "docs(runbook): Netlify deploy tamamlandı işareti"
```

(Memory dosyası repo dışında, commit gerekmiyor.)

---

## Self-Review checklist

### Spec coverage
- [x] netlify.toml build config (Task 1)
- [x] Node version pin (Task 2)
- [x] Supabase hostname için next/image (Task 3)
- [x] Yerel build smoke (Task 4)
- [x] Netlify hesap + repo bağlama (Task 5)
- [x] 14+ env variable (Task 6)
- [x] İlk deploy + preview smoke (Task 7)
- [x] Custom domain + DNS (Task 8)
- [x] SSL doğrulama (Task 9)
- [x] NEXT_PUBLIC_SITE_URL güncelleme (Task 10)
- [x] Production full smoke (Task 11)
- [x] Memory + runbook güncelleme (Task 12)

### Açık riskler / kullanıcının önceden bilmesi gerekenler

1. **Resend domain doğrulama bu plan'ın dışında** — bu plan bittikten sonra Faz 6 §4'ü çalıştır, yoksa email gönderimleri `onboarding@resend.dev`'den gider ve spam'e düşer.
2. **`AUTH_SECRET` mutlaka yeniden üretilmeli** — yereldeki "local-dev-secret-do-not-use-in-prod" üretimde çalışmaz/güvensiz. Task 6 Step 2'de `openssl rand -hex 32` ile yenisini üret.
3. **DNS propagation süresi** — Task 8-9 arası 5 dk ile 24 saat arasında bekleyebilir. Plan'ı duraklat, bekle, devam et.
4. **`feat/admin-datatable-yayilim` branch'i main'e merge edilmedi** — storage migration (`20260513_006_storage_buckets.sql`) main'de yok. Deploy ana branch'i deploy edeceği için, migration dosyası repo'da görünmeyecek. Storage'ın kendisi Supabase'de var (zaten manuel uygulandı), ama yeni bir ortam kurulduğunda migration replay edilemez. **Plan başlamadan ÖNCE bu branch'i merge et** veya storage commit'ini cherry-pick ile main'e al.
5. **Hostinger çıkarıldı** — Next.js 16 SSR Hostinger paylaşımlı hosting'de çalışmaz. Bu seçenek bu plan kapsamında yok.

### Placeholder taraması
Plan içinde "TBD", "TODO", "implement later", "fill in details", "add error handling" gibi belirsizlikler aranıp temizlendi. Yalnız Task 5 ve Task 8'de "kullanıcı dashboard'da Y'ye basacak" tipi adımlar var — bunlar agentin yapamadığı manuel adımlar, kasıtlı placeholders değil.

### Tip tutarlılığı
Kod değişiklikleri sadece Task 1-3'te ve aynı dosyalara (`netlify.toml`, `.nvmrc`, `package.json`, `next.config.ts`). Tip uyumu sorunu yok.
