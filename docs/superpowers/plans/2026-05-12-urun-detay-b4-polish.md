# Ürün Detay UX — B4 Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ürün detay sayfası B1/B2/B3 sonrası final review'da kalan 5 polish maddesini tek commit olarak kapatmak.

**Architecture:** İlk turun (commit'ler `c2125e0`..`40b59e3`, main'e merged) bıraktığı küçük a11y/UX polish'leri. 4 dosyada minimal değişiklik, hepsi izole, hiçbiri davranış değişikliği değil (sadece daha iyi). Spec gerekmiyor — final review notları yeterli context.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, Tailwind v4, TypeScript 5, next/image, lucide-react.

**Referans:** Final review B3'ten — `docs/superpowers/specs/2026-05-12-urun-detay-ux-iyilestirme-design.md` parent spec'tir, B4 polish notları orada "Spec Dışı" + final reviewer "Risks for B4" bölümlerinde.

**Test stratejisi:** Test framework yok. Doğrulama = `pnpm lint` + `pnpm exec tsc --noEmit` + manuel smoke (lightbox keyboard cycling, bar disabled-button atlama, lightbox landscape görsel).

---

## Dosya Haritası

| Dosya | Durum | Madde(ler) |
|---|---|---|
| `components/shop/product-lightbox.tsx` | Modify | #1 (focus trap), #5 (Image fill + wrapper) |
| `components/shop/mobile-buy-bar.tsx` | Modify | #2 (`:not([disabled])` selector) |
| `components/shop/share-actions.tsx` | Modify | #3 (WhatsApp no-JS yorumu) |
| `components/shop/product-gallery.tsx` | Modify | #4 (gallery video `object-contain`) |

Tüm değişiklikler tek `polish(shop): ürün detay sayfası B4 a11y + UI polishi` commit'inde.

---

## Task 1: B4 Polish — 5 değişiklik tek commit

**Files:**
- Modify: `components/shop/product-lightbox.tsx`
- Modify: `components/shop/mobile-buy-bar.tsx`
- Modify: `components/shop/share-actions.tsx`
- Modify: `components/shop/product-gallery.tsx`

### Step 1: `product-lightbox.tsx` — focus trap ekle

Mevcut keyboard `useEffect` (B1'de eklenen, `isOpen` + ok tuşları + Escape) korunacak. Aynı `useEffect` içinde Tab ve Shift+Tab interceptor eklenecek; focus dialog içindeki 3 buton (close, prev, next) arasında cycle olur.

Tam değiştirilecek `useEffect` (klavye listener'ı — şu an "if (e.key === Escape)" başlangıçlı olan):

- [ ] **Step 1a: Klavye effect'ini güncelle**

`product-lightbox.tsx` içinde **ikinci** useEffect bloğunu (klavye listener'ı):

```tsx
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "VIDEO") return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && activeIndex > 0) {
        e.preventDefault();
        onActiveIndexChange(activeIndex - 1);
      } else if (e.key === "ArrowRight" && activeIndex < media.length - 1) {
        e.preventDefault();
        onActiveIndexChange(activeIndex + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, activeIndex, media.length, onActiveIndexChange, onClose]);
```

ile bunu değiştir:

```tsx
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "VIDEO") return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft" && activeIndex > 0) {
        e.preventDefault();
        onActiveIndexChange(activeIndex - 1);
      } else if (e.key === "ArrowRight" && activeIndex < media.length - 1) {
        e.preventDefault();
        onActiveIndexChange(activeIndex + 1);
      } else if (e.key === "Tab") {
        const dialog = closeBtnRef.current?.closest('[role="dialog"]');
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href]:not([disabled])',
          ),
        );
        if (focusables.length === 0) return;
        const active = document.activeElement as HTMLElement | null;
        const idx = active ? focusables.indexOf(active) : -1;
        if (e.shiftKey) {
          if (idx <= 0) {
            e.preventDefault();
            focusables[focusables.length - 1].focus();
          }
        } else {
          if (idx === focusables.length - 1) {
            e.preventDefault();
            focusables[0].focus();
          }
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, activeIndex, media.length, onActiveIndexChange, onClose]);
```

### Step 2: `product-lightbox.tsx` — Image fill + sized wrapper (#5)

Mevcut Image block ve onun wrapper'ı:

```tsx
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="relative max-h-[80vh] max-w-[90vw]">
          {current.type === "image" ? (
            <Image
              src={current.url}
              alt={current.altText ?? productName}
              width={1600}
              height={1600}
              className="max-h-[80vh] w-auto object-contain"
              priority
            />
          ) : current.type === "video" ? (
            <video
              src={current.url}
              poster={current.thumbnailUrl}
              controls
              className="max-h-[80vh] w-auto object-contain"
            />
          ) : null}
        </div>
      </div>
```

- [ ] **Step 2a: Bloğu değiştir**

ile değiştir:

```tsx
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="relative h-[80vh] w-[90vw]">
          {current.type === "image" ? (
            <Image
              src={current.url}
              alt={current.altText ?? productName}
              fill
              sizes="90vw"
              priority
              className="object-contain"
            />
          ) : current.type === "video" ? (
            <video
              src={current.url}
              poster={current.thumbnailUrl}
              controls
              className="h-full w-full object-contain"
            />
          ) : null}
        </div>
      </div>
```

Açıklama: Sized wrapper (`h-[80vh] w-[90vw]`) Image'a `fill` ile boyut verir; `object-contain` ile aspect korunur. Landscape görseller artık tüm genişliği kullanır, portrait olanlar tüm yüksekliği. Video aynı wrapper'ı `h-full w-full object-contain` ile doldurur, aspect korunur.

### Step 3: `mobile-buy-bar.tsx` — disabled button atlama (#2)

- [ ] **Step 3a: `scrollToBuySection` selector güncelle**

Şu fonksiyon:

```tsx
  function scrollToBuySection() {
    const section = document.querySelector<HTMLElement>(targetSelector);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget = section.querySelector<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    focusTarget?.focus({ preventScroll: true });
  }
```

ile değiştir:

```tsx
  function scrollToBuySection() {
    const section = document.querySelector<HTMLElement>(targetSelector);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusTarget = section.querySelector<HTMLElement>(
      'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusTarget?.focus({ preventScroll: true });
  }
```

Açıklama: `:not([disabled])` her bir focusable type'a eklendi. Stok 1 + adet seçici disabled durumunda Mode B'de focus boş button'a düşmez, ilk gerçek focusable'a (örn. "Sepete Ekle") düşer.

### Step 4: `share-actions.tsx` — WhatsApp no-JS yorumu (#3)

- [ ] **Step 4a: WhatsApp `<Link>` üstüne açıklayıcı yorum ekle**

Şu block:

```tsx
      <Link href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          WhatsApp
        </Button>
      </Link>
```

ile değiştir:

```tsx
      {/* Bilerek mounted gate'i YOK — saf bir <a> linki, JS olmadan da çalışmalı (progressive enhancement). */}
      <Link href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          WhatsApp
        </Button>
      </Link>
```

### Step 5: `product-gallery.tsx` — video object-contain (#4)

- [ ] **Step 5a: Video className güncelle**

Şu block (galeri ana görsel container'ı içindeki video):

```tsx
        ) : activeMedia.type === "video" ? (
          <video
            src={activeMedia.url}
            poster={activeMedia.thumbnailUrl}
            controls
            className="h-full w-full object-cover"
          />
        ) : null}
```

ile değiştir:

```tsx
        ) : activeMedia.type === "video" ? (
          <video
            src={activeMedia.url}
            poster={activeMedia.thumbnailUrl}
            controls
            className="h-full w-full object-contain"
          />
        ) : null}
```

Açıklama: Lightbox'taki video zaten `object-contain` (B1 fix `846150d`). Galerideki ana video da aynı davranışta olmalı — `object-cover` video içeriğini kırpıyor.

### Step 6: Doğrulama

- [ ] **Step 6a: Lint**

```powershell
pnpm lint
```

Expected: 0 hata (1 bilinen `returnFocusRef` warning'i kalabilir — bizim eklediğimiz değişikliklere yeni warning eklemez).

- [ ] **Step 6b: Typecheck**

```powershell
pnpm exec tsc --noEmit
```

Expected: 0 hata.

- [ ] **Step 6c: Build smoke**

```powershell
pnpm build
```

Expected: başarılı build, `urun/[slug]` SSG çalışmaya devam eder.

### Step 7: Commit

- [ ] **Step 7a: Stage + commit**

```powershell
git add components/shop/product-lightbox.tsx components/shop/mobile-buy-bar.tsx components/shop/share-actions.tsx components/shop/product-gallery.tsx
git commit -m "polish(shop): urun detay sayfasi B4 a11y + UI polishi"
```

---

## Manuel Smoke Listesi (commit sonrası kullanıcı)

1. **Lightbox focus trap:**
   - `/urun/<slug>` aç → ana görsele Tab + Enter → lightbox açılır
   - Tab basa basa: close → prev (varsa) → next (varsa) → close → ... (cycle)
   - Shift+Tab: ters yön cycle
   - Focus dışarı kaçmamalı

2. **Sticky bar disabled atlama:**
   - Stok 1 olan ürünü aç (yoksa admin'den stok 1 yap)
   - Mobil emulasyon → scroll → bar görünür
   - Bar "Sepete Ekle" tıkla → CTA'ya scroll + focus "Sepete Ekle" butonuna (disabled adet `−` butonuna değil)

3. **Lightbox landscape görsel:**
   - Landscape (yatay) bir ürün görseli aç
   - Tıkla → lightbox açılır, görsel genişliği kullanır, sığar
   - Portrait (dikey) görsel için: tüm yüksekliği kullanır

4. **Galeri video:**
   - Video media içeren ürün varsa → ana galeride video oynatılırken kırpılmadığını doğrula (object-contain, aspect korunmuş)

5. **WhatsApp paylaş (kontrol):**
   - Davranış aynı kalmalı, sadece yorum eklendi → "WhatsApp" butonu tıkla → `wa.me/?text=...` URL'i açılır

---

## Risk Notları

- **Focus trap kapsamı:** `querySelectorAll('button:not([disabled]), [href]:not([disabled])')` — close + prev + next + (varsa) media içindeki focusable. Video media için video element kendisi focusable değil (sadece controls), bu yüzden cycle'a girmiyor — doğru.
- **Image fill wrapper boyutu:** `h-[80vh] w-[90vw]` viewport-relative. Çok küçük ekranlarda (mobile portrait < 400px) görsel kareye yakın. Aspect oranı kaynak görselden gelir, sorun yok.
- **Tab focus trap & ArrowKey conflict:** Tab handler `e.key === "Tab"` else-if dalında, ok tuşları öncesindeki dallarda. Çakışma yok.
- **Geri alma:** Tek commit → `git revert <hash>` 5 madde de geri alır.

---

## Spec Dışı (sonraki tur — sonsuza dek askıda)

- `#buy-section` id collision riski (sadece quick-view modal eklenirse anlamlı, YAGNI)
- Lightbox pinch-to-zoom
- Lightbox `<dialog>` native element kullanımı (browser a11y avantajları)
- Aria-current="true" string → boolean cosmetic
- Counter `<p>` → `<div role="status">` + aria-atomic
- useCallback wrapping (premature)
