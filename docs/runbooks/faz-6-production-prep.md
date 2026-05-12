# Faz 6 — Üretim Hazırlığı (Anahtar Kurulumu)

> **Amaç:** Kodun zaten yaptığı tüm güvenlik, bildirim ve dosya yükleme özelliklerini gerçek anahtarlarla devreye almak. Kod tarafında değişiklik gerekmiyor; bu rehber sadece hesap açma, anahtar üretme ve ortama yazma adımlarını içerir.

**Süresi:** Ortalama 60–90 dakika (Resend domain DNS bekleme süresi dahil).

**Ön koşul:** GitHub repo (var: `kayhansolarenerjimekanik-a11y/KAYHANsolar.com`), Vercel projesi (varsa), Supabase projesi (var), Cloudflare hesabı (yoksa açılacak), Resend hesabı (var, domain doğrulaması yapılacak).

---

## 1. Cloudflare Turnstile — Bot Koruması

**Neden:** Form spam'ini engeller. Sipariş, teklif, stok bildirimi formları korunur. Kod `lib/turnstile/index.ts`'de hazır — anahtar yokken "demo passthrough" çalışır (her şey geçer). Anahtar gelince gerçek bot doğrulaması devreye girer.

**Adımlar:**

1. **Cloudflare hesabına gir** (yoksa: https://dash.cloudflare.com/sign-up — ücretsiz)
2. Sol menü → **Turnstile**
3. **Add site** butonuna bas
4. Site name: `KAYHAN Solar` (istediğin bir isim)
5. Domain ekle:
   - Üretimde: `kayhansolar.com`
   - Geliştirme için: `localhost` (Turnstile localhost'u otomatik kabul eder, ek widget gerekmez)
6. Widget mode: **Managed** (önerilen)
7. **Create** → İki anahtar verir:
   - **Site Key** (public — frontend'de görünür) — başında `0x4AAA...` gibi
   - **Secret Key** (gizli — server'da kullanılır) — başında `0x4AAA...` gibi
8. İkisini de güvenli bir yere kaydet (1Password, parola yöneticisi).

**.env.local'a ekle:**

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...
TURNSTILE_SECRET_KEY=0x4AAA...
```

**Doğrulama:** Dev sunucusunu durdur, yeniden başlat (`pnpm dev`). Teklif al formuna git → Turnstile widget görünmeli (yeşil onay kutusu).

---

## 2. Web Push (VAPID) — Tarayıcı Bildirimleri

**Neden:** Admin'e yeni sipariş/teklif geldiğinde push bildirim. Kod `lib/web-push/vapid.ts` ve `lib/web-push/client.ts`'de hazır. Anahtar yoksa push subscribe akışı devre dışı.

**Adımlar:**

1. **VAPID anahtar çifti üret** (terminal):

```powershell
cd "C:\SOLAR S1TE\kayhan-solar"
npx web-push generate-vapid-keys
```

(`web-push` paketi `node_modules` içinde zaten var — proje dependency'si.)

2. Çıktıda 2 satır görünür:

```
Public Key: BMxK...
Private Key: 8jzG...
```

3. Bu iki değeri güvenli bir yere kaydet.

**.env.local'a ekle:**

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BMxK...
VAPID_PRIVATE_KEY=8jzG...
VAPID_SUBJECT=mailto:m4likiletisim@gmail.com
```

(`VAPID_SUBJECT` zorunlu — Apple/Google push servisleri "kim gönderdi" diye sorar; `mailto:` formatında olur.)

**Doğrulama:** Admin paneline gir, `/kayhan-yonetim/bildirimler` veya admin başlığında "Bildirimleri aç" butonu varsa → tıkla → tarayıcı izin pop-up'ı gelmeli. İzin ver → bir test bildirimi gelmeli (yeni sipariş simüle ederek test).

---

## 3. Supabase Storage Bucket'ları

**Neden:** Admin paneli ürün/galeri/teklif görsellerini Supabase Storage'a yüklüyor. Kod `lib/supabase/storage.ts` `uploadFile()` ile hazır. Bucket'lar dashboard'da oluşturulmalı + RLS policy eklenmeli.

**Adımlar:**

1. **Supabase Dashboard** → projeyi aç (`https://app.supabase.com`)
2. Sol menü → **Storage**
3. **Create bucket** butonuna bas (her bucket için 1 kez yap):

   | Bucket adı | Public? | Açıklama |
   |---|---|---|
   | `product-media` | ✅ Public | Ürün görselleri (mağaza public görüyor) |
   | `gallery-media` | ✅ Public | Galeri post görselleri |
   | `offer-media` | ❌ Private | Teklif başvurusu görselleri (sadece admin görür) |

4. **Bucket policy ekle** — her bucket'a `Policies` sekmesinden:

   **product-media + gallery-media için** (public okuma, admin yazma):
   - Policy adı: `Public read`
   - For: `SELECT`
   - Target roles: `anon, authenticated`
   - USING: `true`
   - Save

   - Policy adı: `Service write`
   - For: `INSERT, UPDATE, DELETE`
   - Target roles: `service_role`
   - USING: `true`
   - Save

   **offer-media için** (sadece admin):
   - Policy adı: `Admin only`
   - For: `SELECT, INSERT, UPDATE, DELETE`
   - Target roles: `service_role`
   - USING: `true`
   - Save

   (Service role anahtarı zaten `.env.local`'da var. `lib/supabase/admin.ts` admin client kullanıyor.)

5. **Test:** Admin panelinden bir ürün düzenleme sayfasına gir → medya yükle → yüklenmiş URL'i kontrol et (https://...supabase.co/storage/v1/object/public/product-media/...).

**Doğrulama:** Yeni bir ürün oluştur, görsel yükle, kaydet. Public mağaza sayfasında görsel görünmeli.

---

## 4. Resend Domain Doğrulaması

**Neden:** Email gönderimi (yeni teklif bildirimi, sipariş onayı). Kod `lib/email/resend.ts`'de hazır. Resend hesabı zaten var ama varsayılan `onboarding@resend.dev`'den gönderiyor olabilir — bu spam filtrelerine takılır.

**Adımlar:**

1. **Resend Dashboard** → https://resend.com/domains
2. **Add Domain** butonuna bas
3. Domain: `kayhansolar.com`
4. Region: `Frankfurt (eu-west-1)` (Türkiye'ye en yakın)
5. **Add** → Resend sana 3-4 DNS kaydı verir (SPF, DKIM, MX, opsiyonel DMARC).

   Örnek:
   - `MX | send.kayhansolar.com | 10 feedback-smtp.eu-west-1.amazonses.com`
   - `TXT | send.kayhansolar.com | "v=spf1 include:amazonses.com ~all"`
   - `TXT | resend._domainkey.kayhansolar.com | p=MIIBIjANBg...`

6. **DNS sağlayıcına git** (domain'in nereden alındığına bağlı — Cloudflare DNS, GoDaddy, Natro vb.) → DNS yönetimi sayfasına gir → yukarıdaki 3 kaydı bire bir kopyala.
7. Kayıtları ekledikten sonra Resend Dashboard'a dön → **Verify** butonuna bas. DNS yayılması 5 dakika – 24 saat sürebilir; sabırlı ol.
8. Tüm kayıtlar yeşil ✓ olunca:

**.env.local güncelle:**

```
RESEND_FROM_EMAIL=KAYHAN Solar <noreply@kayhansolar.com>
```

(Şu an `onboarding@resend.dev` yazıyorsa değiştir.)

**Doğrulama:** Bir teklif başvurusu yap, admin'e email gelmeli (spam değil, inbox'a). Sender: `noreply@kayhansolar.com`.

---

## 5. NEXT_PUBLIC_SITE_URL + Vercel Deploy

**Neden:** SEO için absolute URL'ler (Open Graph, JSON-LD, sitemap, RSS). Kod fallback'i `"https://kayhansolar.com"` — ama Vercel preview deploy'larında farklı URL olur.

**Adımlar:**

1. **Vercel Dashboard** → projeyi aç (yoksa: https://vercel.com/new — GitHub repo'yu bağla)
2. **Settings** → **Environment Variables**
3. Aşağıdaki env'leri ekle (her biri için **Production**, **Preview**, **Development** scope'larını da işaretle):

   ```
   NEXT_PUBLIC_SITE_URL=https://kayhansolar.com
   NEXT_PUBLIC_SUPABASE_URL=<.env.local'daki değer>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<...>
   SUPABASE_SERVICE_ROLE_KEY=<...>
   SUPABASE_DB_SECRET=<...>
   RESEND_API_KEY=<...>
   RESEND_FROM_EMAIL=KAYHAN Solar <noreply@kayhansolar.com>
   GEMINI_API_KEY=<...>
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=<Adım 1>
   TURNSTILE_SECRET_KEY=<Adım 1>
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<Adım 2>
   VAPID_PRIVATE_KEY=<Adım 2>
   VAPID_SUBJECT=mailto:m4likiletisim@gmail.com
   SITE_MODE=supabase
   AUTH_MODE=supabase
   ```

4. **Domain bağla:** Settings → **Domains** → `kayhansolar.com` ekle. Vercel sana DNS kayıtları verir (A 76.76.21.21 veya CNAME) → DNS sağlayıcısında ekle.
5. **Production deploy tetikle:** Bir commit push et (örn. küçük README değişikliği) ya da Vercel Dashboard'dan **Redeploy** butonuna bas.

**Doğrulama:**
- `https://kayhansolar.com` açılır.
- View Source → `<meta property="og:url" content="https://kayhansolar.com/...">` doğru.
- `/sitemap.xml` doğru URL'lerle render eder.
- Public mağaza, teklif formu, sepet, ürün detay, admin paneli — hepsi çalışır.

---

## 6. Son Kontroller (smoke testi)

Tüm adımlar bittikten sonra üretimde elle kontrol:

- [ ] **Form spam koruması:** Teklif formu doldur → Turnstile widget yeşil → submit → başarılı.
- [ ] **Email:** Teklif gelince admin email alıyor (spam değil), reply-to doğru.
- [ ] **Push bildirimi:** Admin tarayıcısında "Bildirimleri aç" → izin ver → yeni sipariş simüle et → bildirim alınıyor.
- [ ] **Storage:** Admin yeni ürün ekle → görsel yükle → mağazada görsel görünüyor.
- [ ] **SEO:** Google Search Console'a `kayhansolar.com` ekle → sitemap.xml gönder → 24 saat içinde indexleme başlamalı.
- [ ] **Lighthouse:** `kayhansolar.com` Lighthouse audit'i → tüm metrikler yeşil (Performance, A11y, Best Practices, SEO).

---

## 7. Sorun Giderme

**Turnstile widget görünmüyor:**
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set edilmiş mi?
- Dev sunucusunu yeniden başlattın mı? (`NEXT_PUBLIC_*` env değişkenleri her başlatmada okunur)
- Domain whitelist'te mi? (Cloudflare → Turnstile → Site → Allowed domains)

**VAPID push hata:**
- `VAPID_SUBJECT` `mailto:` formatında mı?
- Tarayıcı izni reddedildi mi? → tarayıcı ayarlarından siteyi sıfırla, tekrar dene.
- HTTPS şart — `localhost` için izin var ama HTTP üretimde çalışmaz.

**Email gelmiyor:**
- Resend Dashboard → Activity → email loglarına bak. Bounce, complaint?
- DNS kayıtları hâlâ propagasyon halinde olabilir → 24 saat bekle.
- Spam klasörü kontrol et.

**Supabase Storage 403:**
- Bucket policy yanlış → SELECT public, INSERT/UPDATE/DELETE service_role olmalı.
- `SUPABASE_SERVICE_ROLE_KEY` `.env.local`'da doğru mu?

**Vercel deploy hatası:**
- Build log'a bak (`Vercel Dashboard → Deployments → <son deploy> → Logs`).
- Eksik env değişkeni varsa build başarısız olur → Settings → Environment Variables kontrol.
- `pnpm-lock.yaml` ile `package.json` uyumsuzsa lock'u sil ve `pnpm install` çalıştır.

---

## 8. Bittikten Sonra

- Bu rehber çalıştırıldı → memory güncellensin: `project_integrations.md` "Missing: VAPID, Turnstile" satırı sil; tüm anahtarlar set olduğunu işaretle.
- Master Fix bulguları memory'sindeki F grubu kapatılmış sayılır → `project_master_fix_findings.md` güncelle.
- Production monitoring (Sentry, Vercel Analytics) gelecek tur — şu an spec dışı.

---

## Kontrol Listesi (TL;DR)

- [ ] Cloudflare hesap aç → Turnstile site oluştur → site key + secret al → `.env.local` + Vercel env
- [ ] `npx web-push generate-vapid-keys` → public + private al → `.env.local` + Vercel env + `VAPID_SUBJECT`
- [ ] Supabase Dashboard → 3 bucket oluştur (`product-media`, `gallery-media`, `offer-media`) + RLS policy
- [ ] Resend Dashboard → `kayhansolar.com` domain ekle → DNS records → verify
- [ ] Vercel project oluştur (varsa) → tüm env'leri ekle → domain bağla → production deploy
- [ ] Smoke testi (Bölüm 6'daki 6 madde)
- [ ] Memory güncelle
