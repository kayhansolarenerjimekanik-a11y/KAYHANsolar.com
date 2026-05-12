# Ürün Detay Sayfası UX/Dönüşüm İyileştirmeleri

**Tarih:** 2026-05-12
**Hedef:** `app/(public)/urun/[slug]/page.tsx` ve `components/shop/` altındaki UX/dönüşüm eksiklerini gidermek.
**Yaklaşım:** Dosya-bazlı 3 sub-phase (B planı). Her sub-phase ayrı commit; bağımlı dosyalar tek commit içinde gider.

---

## 1. Amaç ve Kapsam

### Çözülen sorunlar

1. **Galeri** — tıklayınca büyütme yok, klavye navigasyonu yok, mobil swipe yok, thumbnail grid 5+ medyada bozulur.
2. **AddToCart** — sepete eklenmiş ürünün durumu sayfada görünmüyor (kullanıcı tekrar tekrar ekler), WhatsApp "Hemen Satın Al" linkinde adet bilgisi yok.
3. **Sayfa-seviye** — mobilde scroll'da CTA kaybolur (her zaman ulaşılabilir buy kanalı yok), paylaşım butonu yok.

### Hariç tutulanlar

- Yorum/puan sistemi, FAQ blokları, sekme yapısı, trust signal blokları (kargo süresi, garanti, iade) — sonraki tur.
- Master Fix planındaki diğer bug grupları (D mapper, E privacy, F production prep) — bu spec dışı.

---

## 2. Mimari Özet

| Sub-phase | Değişen dosyalar | Yeni dosyalar | Etki alanı |
|---|---|---|---|
| **B1: Galeri** | `components/shop/product-gallery.tsx` | `components/shop/product-lightbox.tsx` | İzole |
| **B2: AddToCart** | `components/shop/add-to-cart.tsx`, `lib/whatsapp.ts` | — | Cart store okuma + WhatsApp link |
| **B3: Sayfa-seviye** | `app/(public)/urun/[slug]/page.tsx` | `components/shop/mobile-buy-bar.tsx`, `components/shop/share-actions.tsx` | Page kompozisyonu |

**Sıra:** B1 → B2 → B3 (B3 hem AddToCart hem Gallery'yi sayfada saracak).

**Ortak ilkeler:**
- Hydration güvenliği: `useCart` okuyan her yer `isHydrated` fallback'i ile başlar.
- Yeni component'ler `"use client"`.
- Mevcut tasarım dili korunur: `lime-primary`, `rounded-2xl`, `border-border`, `bg-surface`.
- `lib/mock/data.ts` import edilmez; `mockSiteSettings` kullanılmaz.

---

## 3. Sub-phase B1: Galeri Rework

### 3.1 Değişen: `components/shop/product-gallery.tsx`

**Yeni state:**
```ts
const [activeIndex, setActiveIndex] = useState(0);
const [lightboxOpen, setLightboxOpen] = useState(false);
```

**Davranış değişiklikleri:**

1. **Ana görsele tıklama** → `setLightboxOpen(true)`. Ana görsel container'ı `<button>` veya `role="button" tabIndex={0}` yapılır.
2. **Touch swipe (ana görsel):** `onTouchStart` ile başlangıç X yakalanır, `onTouchEnd`'de delta > 50px → `setActiveIndex((i) => Math.min(media.length - 1, i + 1))` (sola swipe) veya `Math.max(0, i - 1)` (sağa swipe).
3. **Klavye:** Ana görsel container `tabIndex={0}`, `onKeyDown` ile `ArrowLeft` / `ArrowRight` aktif index değiştirir.
4. **Thumbnail listesi:** `grid grid-cols-5` yerine `flex gap-2 overflow-x-auto snap-x snap-mandatory` (yatay scroll). Her thumbnail `min-w-[80px] snap-start`. Aktif thumbnail border-lime-primary aynen kalır.
5. **Video media:** lightbox açıldığında `e.target.tagName === "VIDEO"` ise klavye okları yutulmaz (video kendi seek kontrolünü yapar).

### 3.2 Yeni: `components/shop/product-lightbox.tsx`

**Sorumluluk:** Tam ekran modal — galeri medyasını büyük gösterir, klavye + swipe + kapatma.

**Props:**
```ts
interface ProductLightboxProps {
  media: ProductMedia[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
  productName: string;
}
```

**Yapı:**
- `"use client"`.
- Render: `isOpen === false` → null.
- Container: `fixed inset-0 z-50 bg-black/90`, `role="dialog"` + `aria-modal="true"` + `aria-label={productName}`.
- İçerik:
  - **Kapat butonu** (sağ üst, X ikonu) — ilk açılışta focus alır.
  - **Görsel/video** (merkezi, max-width 90vw, max-height 80vh, `object-contain`).
  - **Prev/Next butonları** (sol/sağ ortada, mobilde de görünür, `bg-black/40 rounded-full p-3`).
  - **Sayaç** (alt orta, `aria-live="polite"`): `{activeIndex + 1} / {media.length}`.
- Klavye: `Escape` → `onClose`. `ArrowLeft` / `ArrowRight` → `onActiveIndexChange`. (Video aktifken oklar yutulmaz — bkz. 3.1.5.)
- Touch swipe: ana galeride olduğu gibi.
- Açıldığında `document.body.style.overflow = "hidden"`; kapanışta restore. Mevcut header/shop-view ile aynı kalıp.
- Cleanup: `useEffect` return ile listener'lar ve body style temizlenir.

**Edge case'ler:**
- `media.length === 0` → lightbox açılmaz (galeri tıklama kapatılmaz, çünkü tıklanacak görsel zaten yok).
- `media.length === 1` → prev/next butonlar gizlenir, sayaç gizlenir.

### 3.3 Test akışı (manuel)

1. **Tek görsel:** thumbnail satırı yok. Ana görsele tıklayınca lightbox açılır, prev/next gizli, sayaç gizli.
2. **6 görselli ürün:** thumbnail satırı yatay scroll. Ana görsele tıkla → lightbox.
3. **Lightbox klavye:** sol/sağ ok navigate, Escape kapat.
4. **Lightbox swipe (DevTools touch):** sola swipe ileri.
5. **Ana galeri swipe (mobil emulasyon):** thumbnail tıklamadan sola/sağa kaydırınca aktif index değişir.
6. **Klavye, ana görselde:** Tab ile odaklan, sol/sağ ok aktif index değiştirir.
7. **Video media:** lightbox'ta video controls görünür, video focusedken oklar seek yapar (modal navigation tetiklenmez).
8. **Scroll restore:** lightbox kapanınca arka sayfa scroll çalışır.

---

## 4. Sub-phase B2: AddToCart + WhatsApp

### 4.1 Değişen: `lib/whatsapp.ts`

`buildQuickOrderLink` imzası — geriye uyumlu opsiyonel parametre:

```ts
export function buildQuickOrderLink(
  whatsappNumber: string,
  productName: string,
  price: number,
  quantity: number = 1,
): string
```

**Mesaj template:**
- `quantity === 1` → mevcut: `Merhaba, "{name}" ({price}) ürününü sipariş etmek istiyorum.`
- `quantity > 1` → `Merhaba, "{name}" ürününden {quantity} adet (toplam {quantity * price}) sipariş etmek istiyorum.`

`buildOrderWhatsAppLink` (multi-item) değişmez; başka çağrı yerleri yok.

### 4.2 Değişen: `components/shop/add-to-cart.tsx`

**Üç mod:**

| Koşul | Mod |
|---|---|
| `product.stockQuantity === 0` | **A: Tükendi** (mevcut `NotifyWhenAvailable`, dokunulmaz) |
| `isHydrated && existingQuantity > 0` | **C: Sepette Var** (YENİ) |
| else | **B: Sepete Ekle** (mevcut, minor değişiklik) |

**Cart store okuma — primitive selectors:**
```ts
const existingQuantity = useCart((s) =>
  s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
);
const isHydrated = useCart((s) => s.isHydrated);
const updateQuantity = useCart((s) => s.updateQuantity);
const removeItem = useCart((s) => s.removeItem);
const addItem = useCart((s) => s.addItem); // mevcut, kalır
```

**Hydration akışı:** `isHydrated === false` iken Mod B render edilir (SSR ile aynı). Hydration tamamlanınca `existingQuantity > 0` ise Mod C'ye geçilir. İlk frame klik kayıt etmez, kullanıcı yanlış aksiyona basamaz.

**Mod B (Sepete Ekle) — tek değişiklik:**
- `buildQuickOrderLink(..., quantity)` çağrısına state'deki `quantity` geçirilir.

**Mod C (Sepette Var) — yeni UI:**

```
┌──────────────────────────────────────────────────┐
│  Sepetinizde: {n} adet                           │
│  [−]  [ {n} ]  [+]      [ Sepete Git → ]         │
│                                                  │
│  [ Hemen Satın Al ({n} adet) ]                   │
│                                                  │
│  Sepetten çıkar                                  │
└──────────────────────────────────────────────────┘
```

- **Stepper:** `−` ve `+` butonları.
  - `+` → `updateQuantity(productId, existingQuantity + 1)`. Max `product.stockQuantity` (store zaten clamp eder, ama UI'da disabled state için biz de kontrol ederiz).
  - `−` → 2+ adette `updateQuantity(productId, existingQuantity - 1)`. 1 adetteyken `−` butonu → `removeItem(productId)` + toast "Sepetten çıkarıldı" (kullanıcının niyeti net olduğu için).
- **"Sepete Git"** secondary button → `<Link href="/sepet">`.
- **"Hemen Satın Al"** primary/secondary → `buildQuickOrderLink(..., existingQuantity)` ile WhatsApp URL'i. Yeni sekmede açılır.
- **"Sepetten çıkar"** küçük text button (alt orta) → `removeItem(productId)` + toast "{name} sepetten çıkarıldı".

**Edge case'ler:**

1. **Cart cached, admin stok düşürmüş** (`existingQuantity > product.stockQuantity`):
   - Mod C'ye girer.
   - Stepper `+` disabled.
   - Üstte uyarı text: `Stok güncellendi — maks. {product.stockQuantity} adet.`
   - İdeal: hydration sonrası `useEffect` ile `updateQuantity(productId, product.stockQuantity)` ile otomatik clamp + toast "Adet stok seviyesine güncellendi". Sessiz veri kaybı olmaması için **toast şart**.
2. **Tam stok dolu** (`existingQuantity === product.stockQuantity`): `+` disabled, ek metin yok.
3. **Sepetten çıkarıldıktan sonra**: `existingQuantity` 0 olur → re-render → Mod B'ye otomatik geçer.

### 4.3 Test akışı (manuel)

1. Stokta ürünü ana sayfadan veya mağazadan sepete ekle → `/urun/[slug]` git → **Mod C** görünür, adet doğru.
2. Mod C'de `+` → adet artar, `−` → azalır.
3. Mod C'de 1 adettey­ken `−` → ürün sepetten silinir, **Mod B**'ye dönüş.
4. "Sepetten çıkar" linki → silinir + toast.
5. Mod C'de "Hemen Satın Al" → açılan WhatsApp URL'inde decoded text'te "{n} adet" görünür.
6. Mod B'de adet 3 seç → "Hemen Satın Al" → "3 adet" görünmeli.
7. Stok 2 olan ürünü 2 adet ekle → tekrar gel → Mod C'de `+` disabled.
8. Admin panelden stok 1'e düşür → Mod C'de uyarı text + adet 1'e otomatik clamp + toast.
9. SSR check: `view-source` veya Network → ilk HTML'de Mod B render edilmiş olmalı (hydration sonrası Mod C'ye geçer).

---

## 5. Sub-phase B3: Sayfa-seviye (Sticky CTA + Share)

### 5.1 Yeni: `components/shop/mobile-buy-bar.tsx`

**Sorumluluk:** Mobilde fixed bottom bar — ana CTA card görünmüyorken kullanıcıya kalıcı bir buy kanalı.

**Props:**
```ts
interface MobileBuyBarProps {
  product: Product;
  targetSelector: string; // "#buy-section"
}
```

**Render koşulu:** `"use client"`, `lg:hidden` (mobile only).

**Görünürlük mantığı (3 katman):**

1. **Stok yok** (`product.stockQuantity === 0`) → bar hiç render edilmez.
2. **Ana CTA card görünür** (IntersectionObserver) → bar `translate-y-full` (gizli).
3. **Body scroll-locked** (`document.body.style.overflow === "hidden"`) → bar gizli (mobil menü, search-dialog, cart-drawer açıkken çakışmasın).

**Layout:**
```
┌────────────────────────────────────────────────┐
│  ₺12.450               [ Sepete Ekle ]         │  ← Mod B
│  veya                                          │
│  Sepette 2 adet        [ Sepete Git → ]        │  ← Mod C
└────────────────────────────────────────────────┘
```

**Aksiyon:**
- **Mod B (sepette yok):** Buton "Sepete Ekle" → ana CTA'ya scroll (`document.querySelector(targetSelector)?.scrollIntoView({ behavior: "smooth", block: "center" })`). Adet bypass etmez — kullanıcı seçim yapar.
- **Mod C (sepette var):** Buton "Sepete Git →" → `<Link href="/sepet">`.

**Cart store okuma:** `add-to-cart.tsx` ile aynı pattern (primitive selector, hydration check). Hydration olmadan Mod B varsayılır.

**Stil:**
```
fixed bottom-0 inset-x-0 z-40
border-t border-border bg-surface/95 backdrop-blur
px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]
transition-transform duration-200
```

**IntersectionObserver kurulumu (`useEffect`):**
- `target = document.querySelector(targetSelector)`.
- `target` yoksa erken çık (bar her zaman göster — bu fallback, gerçekte olmamalı).
- `new IntersectionObserver((entries) => setCtaVisible(entries[0].isIntersecting), { threshold: 0.3 })`.
- Cleanup: `observer.disconnect()`.

**MutationObserver kurulumu (body lock detection):**
- `new MutationObserver(() => setBodyLocked(document.body.style.overflow === "hidden"))`.
- `observer.observe(document.body, { attributes: true, attributeFilter: ["style"] })`.
- Cleanup: `observer.disconnect()`.
- İlk render'da bir kez kontrol et (`useEffect` mount'ta).

**Render kararı:**
```ts
const hidden = ctaVisible || bodyLocked || product.stockQuantity === 0;
return (
  <div
    className={cn(
      "fixed bottom-0 inset-x-0 z-40 ... transition-transform duration-200",
      hidden ? "translate-y-full" : "translate-y-0",
    )}
    aria-hidden={hidden}
  >
    {/* içerik */}
  </div>
);
```

### 5.2 Yeni: `components/shop/share-actions.tsx`

**Sorumluluk:** Ürün paylaşımı — native share (varsa) + link kopyala + WhatsApp paylaş.

**Props:**
```ts
interface ShareActionsProps {
  productName: string;
  url: string; // absolute URL, ör: https://kayhansolar.com/urun/...
}
```

**Render:**

```
Paylaş:  [📤 Paylaş]   [📋 Linki Kopyala]   [💬 WhatsApp]
          (native)
```

- **Native share butonu**: sadece `typeof navigator !== "undefined" && "share" in navigator` true ise render edilir. Tıklama → `navigator.share({ title: productName, url }).catch(() => {})` (user cancel sessizce yutulur).
- **Linki Kopyala**: `navigator.clipboard.writeText(url)` + toast "Link kopyalandı". `clipboard` yoksa buton gizlenir (HTTPS varsayımı altında problem değil).
- **WhatsApp**: `<Link href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">` — `whatsappShareUrl = ``https://wa.me/?text=${encodeURIComponent(`${productName} — ${url}`)}` ``.

**Stil:** AddToCart card'ının altında, `flex flex-wrap gap-2 text-xs`. Her buton küçük outline button (`variant="outline" size="sm"`).

**Hydration:** Native share ve clipboard kontrolü `useEffect` ile mount sonrası yapılır (SSR'da default olarak link kopyala + WhatsApp render edilir, native share mount sonrası eklenir). Flicker'ı minimize etmek için: ilk render'da clipboard + WhatsApp göster, native share `isMounted && hasShare` koşuluyla mount sonrası ekle.

### 5.3 Değişen: `app/(public)/urun/[slug]/page.tsx`

**Değişiklik 1:** CTA card'a `id="buy-section"` ekle.

```tsx
<div
  id="buy-section"
  className="rounded-2xl border border-border bg-surface p-5"
>
  {/* fiyat + StockStatus + AddToCart — mevcut içerik */}
</div>
```

**Değişiklik 2:** AddToCart card'ının altına `ShareActions` ekle (sağ kolonda, specs blokundan önce):

```tsx
<ShareActions productName={product.name} url={absoluteUrl} />
```

**Değişiklik 3:** Sayfa sonuna (return'ün son child'ı olarak, `<Container>` içine) `MobileBuyBar` ekle.

```tsx
<MobileBuyBar product={product} targetSelector="#buy-section" />
```

**`absoluteUrl` refaktör:** Mevcut ProductJsonLd çağrısındaki inline URL hesaplaması bir `const absoluteUrl = ...` olarak çıkarılır, hem ProductJsonLd hem ShareActions kullanır.

### 5.4 Test akışı (manuel)

**Sticky bar:**
1. Mobilde sayfayı aç (DevTools mobile emulation).
2. CTA card görünürken (sayfa başında) → bar gizli.
3. Aşağı kaydır (CTA card görünmüyor) → bar yumuşak gelmeli.
4. Yukarı kaydır → bar gizlenmeli.
5. Mod B'de bar "Sepete Ekle" → CTA'ya smooth scroll.
6. Mod C'de bar "Sepete Git" → `/sepet`.
7. Tükendi ürün → bar hiç görünmemeli.
8. Header mobil menü aç → bar anında gizlenmeli. Kapat → tekrar görünmeli (CTA görünmezse).
9. Search dialog aç (`Ctrl+K` veya UI) → bar gizli olmalı.
10. Desktop genişlikte (lg+) → bar hiç render edilmemeli.

**Share:**
11. Desktop: native share butonu yok, "Linki Kopyala" + "WhatsApp" render.
12. Mobil (DevTools touch): native share butonu görünür (Chrome mobile flag'ine göre değişebilir).
13. "Linki Kopyala" → toast + pano'da absolute URL.
14. "WhatsApp" → `wa.me/?text=...` decoded "Ürün adı — https://...".

---

## 6. Test, Commit, Smoke Akışı

### 6.1 Sıra

```
B1 → manuel smoke → lint + typecheck → commit
B2 → manuel smoke → lint + typecheck → commit
B3 → manuel smoke → lint + typecheck → commit
```

### 6.2 Komutlar

```powershell
pnpm lint
pnpm tsc --noEmit
pnpm dev  # manuel smoke
```

### 6.3 cURL smoke

**Bu spec'te gerek yok** — üç sub-phase de client-side. API yüzeyi değişmiyor (`/api/stock-notifications`, `/api/cart-validate` vs. dokunulmuyor). `buildQuickOrderLink` imza değişikliği opsiyonel param olduğu için diğer çağrı yerlerini kırmaz.

### 6.4 Commit mesajları

- B1: `feat(shop): product gallery lightbox + swipe + keyboard nav`
- B2: `feat(shop): cart-aware add-to-cart + whatsapp quantity propagation`
- B3: `feat(shop): mobile sticky buy bar + share actions on product page`

### 6.5 Geri alma

Her commit bağımsız → tek tek `git revert` güvenli.

---

## 7. Risk Haritası

| Risk | Etki | Azaltma |
|---|---|---|
| `useCart` selector instabilitesi → infinite re-render | Yüksek | Primitive selector pattern (object dönmez). |
| Hydration mismatch (Mod B → Mod C geçişi) | Orta | İlk render her zaman Mod B; `isHydrated` flag'i. |
| IntersectionObserver eski iOS Safari (<12) | Düşük | Site zaten 12+ varsayıyor (KVKK + PWA). |
| MutationObserver body style izleme — race | Düşük | İlk render mount'ta bir kez senkron kontrol. |
| Lightbox video klavye conflict | Düşük | `e.target.tagName === "VIDEO"` ise oklar yutulmaz. |
| Sticky bar + footer çakışması (mobil) | Düşük | translate-y ile gelir/gider; padding-bottom gerekmez. |
| WhatsApp imza değişikliği başka çağrıyı kırar | Düşük | Opsiyonel param, default 1; başka çağrı yok. |

---

## 8. Spec Dışı (Sonraki Tur Adayları)

- Lightbox'ta pinch-to-zoom.
- Ürün sayfasında sekme yapısı (açıklama / specs / sss).
- "Bu ürünü beğenenler ayrıca …" — collaborative filtering (Faz 6+).
- Trust signal blokları (kargo süresi, garanti, iade politikası).
- Yorum/puan sistemi.
