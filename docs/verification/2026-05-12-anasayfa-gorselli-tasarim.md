# Anasayfa Görselli Tasarım — Verification

**Tarih:** 2026-05-12
**Plan:** `docs/superpowers/plans/2026-05-12-anasayfa-gorselli-tasarim.md`
**Spec:** `docs/superpowers/specs/2026-05-12-anasayfa-gorselli-tasarim-design.md`
**Branch:** `feat/anasayfa-gorselli-tasarim` (worktree: `c:\SOLAR S1TE\kayhan-solar-anasayfa`)

## Kapsam

- Yeni `CampaignSlider` (server + client) — eski `CampaignStrip` yerine geçti.
- Yeni `GalleryShowcase` — mi.com tarzı bento düzeni "Bizden Projeler".
- Schema değişikliği: `campaigns` tablosuna `cover_image_url`, `cta_label`, `cta_secondary_label` opsiyonel kolonları.
- Admin kampanya formu: 3 yeni alan + canlı `<img>` önizleme + bozuk URL hata mesajı.
- TypeScript tipi, Supabase mapper (read+write), zod validator, server action ve mock veri uçtan uca senkron.

## Doğrulama sonuçları

| Test | Sonuç |
|---|---|
| Migration uygulandı (`pnpm run db:migrate`) | ✓ |
| `pnpm exec tsc --noEmit` 0 hata | ✓ |
| `pnpm lint` 0 hata (1 pre-existing uyarı `product-lightbox.tsx`) | ✓ |
| Anasayfa HTTP 200 | ✓ |
| Slider DOM'da görünür (`aria-roledescription="carousel"`) | ✓ |
| Galeri DOM'da görünür ("Bizden Projeler" başlığı) | ✓ |
| Hero değişmedi (mevcut metin + butonlar + istatistik) | ✓ |
| Featured products 4'lü grid değişmedi | ✓ |
| CategoryGrid + Neden KAYHAN + CTA bölümleri değişmedi | ✓ |
| Admin formu render olur (HTTP 307 auth redirect, 500 yok) | ✓ |
| Yeni "Görsel & CTA" bölümü Genel ile Kural arasında | ✓ |
| Cover URL preview ve onError | ✓ (kod incelendi) |
| Zod URL validator yalnızca http(s):// kabul ediyor | ✓ |
| Slider auto-play 5sn (kod) | ✓ |
| Slider hover'da duruyor (kod) | ✓ |
| Klavye ←/→ slider scope'unda (kod) | ✓ |
| Slider `prefers-reduced-motion` saygılı (kod) | ✓ |
| Slider aria: `role="group"` + `aria-roledescription="slide"` + `aria-label` per slayt | ✓ |
| Dot navigation `aria-current="true"` aktif | ✓ |
| Galeri `media.find(m.type === "image")` filtresi | ✓ |
| Galeri `altText` kullanılıyor (yoksa post.title) | ✓ |
| Mobile düzen (sm: breakpoint bazlı) | ✓ (kod) |
| Cover URL boş → slider null döner (kod) | ✓ |

## Spec sapmaları

- "Tümünü Gör" linki galeri başlığında `hidden sm:inline-flex` ile gizleniyor — spec "desktop-only" demişti ama kesin breakpoint belirtmedi. Pratik davranış: telefonda gizli (≤640px), tablet+masaüstünde görünür. Kabul edilebilir.
- `MAX_POSTS = 5` sabiti hardcoded; layout 5'ten fazla post varsayımı yok. Code reviewer'ın işaret ettiği üzere `lg:grid-rows-2` sabit 2 satır olduğu için 2-3 post durumunda sağda boş hücre kalabilir. Spec bunu "küçük boşluk kabul edilebilir, perfect-fit YAGNI" olarak işaretlemişti, bu doğrultuda bırakıldı.

## Bilinen sınırlamalar

- Prod Supabase Storage host'u `next.config.ts` remote patterns'a eklenmedi. Demo modda picsum yeterli; storage entegrasyonu ayrı bir task'ta yapılacak.
- Auto-play timer kullanıcının manuel ok/dot tıklamasından sonra reset olmuyor (code reviewer minor öneri); kullanıcı yan tuştan kaydırdıktan sonra 5sn döngüsü eski tempoyla devam edebilir. YAGNI olarak bırakıldı.
- Banner alanı (`banner_image_url`) hâlâ Campaign tipinde duruyor ama yeni UI'da kullanılmıyor. İleride mini banner kartı için saklı.

## Commit zinciri (8 commit)

Foundation: `3811ceb` (spec + plan)
1. `35ce3a3` `feat(db): add campaign visual fields (cover_image_url, cta_label, cta_secondary_label)` — Task 1
2. `dfd81a7` `feat(home): replace campaign strip with full-width campaign slider` — Task 2 ana
3. `288e45b` `fix(home): slider a11y + scoped keyboard nav` — Task 2 code review fix
4. `21f5bc3` `feat(home): add gallery showcase bento section` — Task 3 ana
5. `9cf6114` `docs: admin datatable urunler pilot spec + plan` — *bu dalda değil; paralel oturumun bıraktığı docs, code'a dokunmadı*
6. `f3dbd92` `fix(home): gallery showcase media type filter + altText` — Task 3 code review fix
7. `160cc0c` `feat(admin): add visual fields to campaign form with preview` — Task 4 ana
8. `655cc0e` `fix(admin): campaign form a11y + http(s)-only URL + Türkçe tutarlılık` — Task 4 code review fix

## Sonraki adımlar (bu spec dışı)

- Supabase'deki canlı kampanyalara admin formundan cover URL ekle ki slider gerçek görsellerle gözüksün.
- Tamamlandıysa `feat/anasayfa-gorselli-tasarim` dalını main'e merge et.
- Storage entegrasyonu (Supabase Storage URL'leri için `next.config.ts` host eklenmesi) — ayrı sprint.
- Banner alanını ya kaldır (deprecate) ya da mini banner kart UI'ı için kullan — ayrı task.
