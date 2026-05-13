# Faz 6 Destek Araçları — Tasarım Dokümanı

**Tarih:** 2026-05-13
**Statü:** Onaylandı (kullanıcı, brainstorming oturumu)
**Sonraki adım:** writing-plans → executing-plans

---

## Amaç

Faz 6 (production prep) runbook'unu pratik kılmak için **iki bağımsız araç** eklemek:

1. **`pnpm check:env`** — `.env.local` içindeki anahtarların grup bazlı sağlık raporu.
2. **`GET /api/health`** — admin-gated, runtime entegrasyon doğrulama endpoint'i.

Bu araçlar paralel-agent ortamına özel olarak **shared file edit yapmadan** çalışır: her ikisi de yeni dosyalar, runbook'a dokunulmuyor, yardım metni dosya içine gömülü.

---

## Bağlam

- Proje: KAYHAN Solar (`C:\SOLAR S1TE\kayhan-solar`).
- Repo'da 4 paralel agent çalışıyor (admin / teklif / mağaza / F-1 hattı). Aynı dosyaya çakışan edit'ten kaçınılmalı.
- F-1 (web push + turnstile) main'e merge oldu (memory: 2026-05-13). VAPID `.env.local`'da set; **eksik tek anahtar Turnstile**.
- Bu araçlar Faz 6 ilerlemesinin runtime durumunu ve eksik anahtarları **tek komutla** görmeyi mümkün kılacak — diğer agent'lar dahil herkes faydalanır.

---

## Mimari

İki tamamen bağımsız bileşen. Paylaşılan tip yok, paylaşılan helper yok, paylaşılan dosya yok.

### Bileşen 1: `scripts/check-env.mjs`

**Sorumluluk:** Tek bir iş — `.env.local`'i tarayıp eksik/placeholder anahtarları renkli rapor olarak basmak.

**Tipler:**
- Node ESM script (`.mjs`).
- TypeScript'e dahil değil (tsc atlar).
- Dependency yok — saf `node:fs` ve `node:path` API.

**API:**
```
$ pnpm check:env
```
**Çıktı (örnek, mevcut .env.local için):**
```
KAYHAN Solar — .env.local sağlık raporu

Çekirdek (zorunlu)
  ✓  AUTH_MODE                                supabase
  ✓  DATA_MODE                                supabase
  ✓  AUTH_SECRET                              fK3a9Q…oY==

Supabase
  ✓  NEXT_PUBLIC_SUPABASE_URL                 https://…
  ✓  NEXT_PUBLIC_SUPABASE_ANON_KEY            eyJhbGc…wQ
  ✓  SUPABASE_SERVICE_ROLE_KEY                eyJhbGc…XX
  ✓  SUPABASE_SECRET_KEY                      sb-secret…

Servis anahtarları
  ✓  RESEND_API_KEY                           re_a1b2c…XY
  ✓  GEMINI_API_KEY                           AIzaSy…Q4

Faz 6 — Bot koruması (Turnstile)
  EKSİK  NEXT_PUBLIC_TURNSTILE_SITE_KEY       (eksik)
  EKSİK  TURNSTILE_SECRET_KEY                 (eksik)

Faz 6 — Web Push (VAPID)
  ✓  NEXT_PUBLIC_VAPID_PUBLIC_KEY             BMxK…ab
  ✓  VAPID_PRIVATE_KEY                        8jzG…YY
  ✓  VAPID_SUBJECT                            mailto:…

Faz 6 — Üretim URL
  ✓  NEXT_PUBLIC_SITE_URL                     https://kayhansolar.com

Özet: 11 hazır · 0 placeholder · 2 eksik / 13

Adımlar: docs/runbooks/faz-6-production-prep.md
```

**Exit codes:**
- `0` — tüm anahtarlar hazır.
- `1` — `.env.local` yok, ya da en az 1 eksik/placeholder var.

**Embedded help (paralel agent çakışmasını önler):** Footer satırı `Adımlar: docs/runbooks/faz-6-production-prep.md` her çağrıda basılır. Kullanıcı runbook'u nereden bulacağını bilir, runbook'a dokunulmaz.

**Davranışsal kurallar:**
- `.env.local` yoksa: kırmızı mesaj + exit 1.
- Yorum satırları (`#` ile başlayan) atlanır.
- Tek/çift tırnaklı değerler trim edilir.
- Değer önizlemesi: 20+ karakter ise `başı(8)…sonu(4)`.
- Placeholder tespiti: önceden tanımlı set (`replace-me-with-…`, `your-key-here`, `TODO`, boş string).

### Bileşen 2: `app/api/health/route.ts`

**Sorumluluk:** Admin-gated, runtime'da entegrasyonların ayakta olduğunu doğrulayan JSON endpoint.

**Tipler:**
- Next.js 16 App Router GET route handler.
- TypeScript strict.
- Internal type:
  ```ts
  type CheckStatus = "ok" | "fail" | "skipped";
  interface Check {
    name: string;
    status: CheckStatus;
    detail?: string;
  }
  ```

**API:**
```
GET /api/health
Cookie: <admin session>
```
**Authorization:**
- `requireAdmin()` **ilk await**. Session yoksa Next.js otomatik 401 (handler hiç çalışmaz).
- Auth geçtikten sonra check'ler çalışır.

**Çıktı (örnek):**
```json
{
  "ok": true,
  "mode": { "auth": "supabase", "data": "supabase" },
  "checks": [
    { "name": "supabase", "status": "ok" },
    { "name": "resend", "status": "ok" },
    { "name": "gemini", "status": "ok" },
    { "name": "turnstile", "status": "skipped", "detail": "anahtar yok — bot koruması demo passthrough" },
    { "name": "vapid", "status": "ok" },
    { "name": "site_url", "status": "ok", "detail": "https://kayhansolar.com" }
  ],
  "runbook": "docs/runbooks/faz-6-production-prep.md",
  "timestamp": "2026-05-13T11:42:00.000Z"
}
```

**HTTP status:**
- `200` — `ok: true` (hiçbir check `fail` değil; skipped sayılmaz).
- `503` — `ok: false` (en az bir check `fail` döndü).

**Check tablosu:**

| name | Tip | Davranış |
|---|---|---|
| `supabase` | live | `DATA_MODE != supabase` → skipped. Anahtar eksik → fail. Aksi: `repo.listCategories()` çağırılır; throw → fail. |
| `resend` | env | `RESEND_API_KEY` boş → skipped. Aksi: ok. |
| `gemini` | env | `GEMINI_API_KEY` boş → skipped. Aksi: ok. |
| `turnstile` | env | iki anahtar (site + secret) eksik → skipped (demo passthrough). Aksi: ok. |
| `vapid` | env | 3 anahtar (public + private + subject) eksik → skipped. Aksi: ok. |
| `site_url` | env+parse | `NEXT_PUBLIC_SITE_URL` boş → skipped. `new URL()` throw → fail. Aksi: ok. |

**Embedded help:** Yanıt JSON'unda `runbook: "docs/runbooks/faz-6-production-prep.md"` alanı her çağrıda var. Eksik anahtar gören geliştirici runbook'a nereden bakacağını bilir.

---

## Veri akışı

### `check-env.mjs`
1. `process.cwd() + "/.env.local"` resolve.
2. Var olmazsa exit 1.
3. Dosyayı oku, satır satır parse (regex `^([A-Z0-9_]+)=(.*)$`).
4. `GROUPS` sabit listesini iterate et, her anahtar için status hesapla.
5. Console output (renkli, ANSI escape).
6. Özet satırı + footer.
7. Eksik veya placeholder varsa exit 1, yoksa exit 0.

**Network/IO:** Hiç. Saf filesystem read + stdout.

### `/api/health`
1. `GET /api/health` request.
2. `requireAdmin()` — session yoksa 401 throw.
3. Her check çağrısı (sync env check'leri + async supabase ping).
4. Array oluştur, `ok` hesapla (her status !== "fail").
5. NextResponse.json — status 200/503.

**Network/IO:** Supabase'e bir hafif `listCategories()` sorgusu (DATA_MODE=supabase ise). Diğer check'ler sadece env okur.

**Caching:** Yok. `revalidate = 0` veya `dynamic = "force-dynamic"` (Next.js default route handler zaten dynamic; özel ayar gerekmez).

---

## Hata yönetimi

### `check-env.mjs`
- `.env.local` yok → kırmızı mesaj + exit 1 + footer.
- Parse hatası tek satırda → satır atlanır, raporlanmaz (silent skip — yorumlar zaten atlanıyor).
- Beklenmeyen exception → Node default trace.

### `/api/health`
- `requireAdmin()` 401 throw → Next.js 401 response (handler içine geçilmez). Bu **doğru** davranış.
- Her check kendi try/catch'inde — biri çökerse diğerleri çalışır.
- `repo.listCategories()` throw → `supabase` check `fail`, `detail = error.message`.
- `new URL(SITE_URL)` throw → `site_url` check `fail`, `detail = "geçersiz URL: …"`.

---

## Test stratejisi

**Test runner yok** (AGENTS.md gereği: `Test runner yok — doğrulama TypeScript + ESLint + manuel smoke.`)

**Statik:**
- `pnpm exec tsc --noEmit` — 0 hata (script .mjs olduğu için zaten dışarıda; endpoint route handler TypeScript).
- `pnpm lint` — 0 uyarı.

**Manuel smoke:**

| Senaryo | Beklenen |
|---|---|
| `pnpm check:env` (mevcut .env.local) | Çıktı yukarıdaki örneğe benzer; Turnstile EKSİK, diğerleri ✓; exit 1 (Turnstile eksik olduğu için) |
| `pnpm check:env` (.env.local silinmiş) | Kırmızı "bulunamadı" mesajı + exit 1 |
| `curl http://localhost:3000/api/health` (cookie yok) | 401 |
| `curl -b <admin cookie> http://localhost:3000/api/health` | 200 JSON; supabase/resend/gemini/vapid `ok`, turnstile `skipped`, site_url duruma göre |
| `DATA_MODE=demo` `curl …` | supabase check `skipped`, ok=true |

**Edge case'ler (manuel olarak doğrulanır):**
- Boş `.env.local` (sadece yorum satırı) → tüm anahtarlar eksik, exit 1.
- Tırnaklı değer (`AUTH_SECRET="abc"`) → tırnaklar soyulur, preview doğru.
- `NEXT_PUBLIC_SITE_URL=garbage` → `/api/health` site_url `fail`, ok=false, HTTP 503.

---

## Kapsam dışı (YAGNI)

- ❌ Runbook (`docs/runbooks/faz-6-production-prep.md`) edit — paralel agent çakışması riski. Embedded help yeterli.
- ❌ Resend / Gemini live ping — API kotası tüketir, env varlığı şu an yeterli sinyal. Gelecekte gerekirse eklenir.
- ❌ Uptime monitor entegrasyonu (Better Uptime, Vercel monitoring) — Faz 6 sonrası.
- ❌ Detaylı metrik (latency, error rate, p99) — Production observability sprint'inde.
- ❌ `/api/health` için cron çağrısı — manuel kullanım yeterli.
- ❌ Vercel deploy doğrulama scripti — `check:env` + `/api/health` zaten kapsıyor.
- ❌ CI integration — repo'da CI yok; gerekirse sonra.

---

## Bağımlılıklar

**Mevcut, kullanılacak:**
- `@/lib/auth` `requireAdmin()` — endpoint authorization.
- `@/lib/data` `repo.listCategories()` — supabase live check.
- `next/server` `NextResponse` — endpoint response.

**Yeni paket yok.** `dotenv` paketine ihtiyaç yok — script kendi parse'ını yapar (regex + split).

**`package.json` değişikliği:**
- `scripts` bölümüne tek satır: `"check:env": "node scripts/check-env.mjs"`.

---

## Risk değerlendirmesi

| Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|
| Paralel agent `package.json` scripts'i aynı anda değiştirir | Düşük | Orta (merge conflict) | Edit minimal (tek satır); conflict olursa elle düzelt |
| Paralel agent `lib/data` interface'ini değiştirir | Düşük | Düşük | `listCategories()` 6+ aydır stabil; değişme olasılığı çok düşük |
| `.env.local` farklı dizinde aranır | Düşük | Düşük | `process.cwd()` Windows + Unix'te aynı çalışır; user her zaman repo root'tan çağırır |
| Branch chaos (4 agent farklı branch açıyor) | Yüksek | Orta | Plan 2 yeni dosyalar; herhangi bir branch'te commit edilebilir, son merge'de conflict olmaz |
| Admin auth flow değişir (memory'de feat/admin-auth henüz yok) | Çok düşük | Yüksek | `requireAdmin()` 4 aydır stabil; değişirse endpoint birlikte güncellenir |

---

## Onay

✅ Kullanıcı 2026-05-13 brainstorming oturumunda C yaklaşımını (minimal + embedded help) onayladı.
✅ /api/health admin-only kararı verildi.

Sonraki adım: `superpowers:writing-plans` skill'i ile bu spec'ten implementation plan üret. Mevcut `docs/superpowers/plans/2026-05-13-faz6-destek-arac.md` plan dosyası bu spec'e göre güncellenecek (runbook edit task'i çıkar, embedded help eklenir, admin guard eklenir).
