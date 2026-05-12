# Admin Panel — DataTable Deseni (Ürünler Pilot) — Tasarım Dökümanı

**Tarih:** 2026-05-12
**Durum:** Onaylandı, plan yazımına hazır
**Kapsam:** Yeniden kullanılabilir `<DataTable>` + `<PageHeader>` deseni; pilot olarak yalnızca `urunler` listesi dönüştürülür. Diğer 6 liste sayfası kapsam dışı.

---

## 1. Hedefler

Mevcut admin paneli listeleri (Ürünler, Teklifler, Siparişler, Kampanyalar, Bildirimler, Galeri, Stok Bildirimleri) düz `<Table>` render ediyor; arama, filtre, sıralama, sayfalama ve toplu işlem yok. Tasarım her yerde el ile kuruluyor, boş/loading/error durumları tutarsız.

Bu spec şu eksikleri **sadece Ürünler için pilot** olarak kapatıyor:

1. **Yeniden kullanılabilir DataTable deseni** — her liste sayfasında tekrar yazılan toolbar + tablo + pagination + bulk bar.
2. **Arama** — ad/marka/slug üzerinden 300ms debounce ile.
3. **Filtre** — kategori (dropdown), durum (sekme), stok durumu (chip).
4. **Sıralama** — kolon başlığına tıklayarak isim/fiyat/stok/tarih.
5. **Toplu işlem** — aktif yap / pasif yap / sil.
6. **Sayfalama** — sayfa başı 25 sabit, URL'de `?sayfa=N`.
7. **URL-yansımalı filtre durumu** — yenileme, link paylaşımı, geri/ileri.
8. **Tutarlı durumlar** — boş (filtresiz/filtreli), loading skeleton, error retry.
9. **Page-header bileşeni** — başlık + alt başlık + birincil aksiyon slot'u.

**Scope dışı:**
- Teklifler/Siparişler/Kampanyalar/Bildirimler/Galeri/Stok Bildirimleri sayfalarının dönüştürülmesi (pilot başarılı olduğunda ayrı plan).
- Cmd+K global arama.
- Mobil kart-listesi görünümü (mevcut responsive hidden md:table-cell deseni korunur).
- Sayfa boyutu seçici (10/25/50/100). Sabit 25.
- Server-side veri çekimi (mimari hazır ama bu spec'te kullanılmıyor).
- Toplu kategori değiştir / toplu stok güncelle / toplu kampanya atama.

---

## 2. Mevcut akış (özet)

- `app/(admin)/kayhan-yonetim/(protected)/urunler/page.tsx` server component'i `repo.listProducts()` ve `repo.listCategories()` çağırıyor.
- Sayfa kendi `<header>` markup'ını ve `<Table>` (`components/ui/table.tsx`) ile satırları render ediyor.
- Satır aksiyonları `ProductRowActions` (`components/admin/product-row-actions.tsx`) — düzenle/aktif-pasif/sil. Bu bileşen olduğu gibi korunacak.
- Genel `app/(admin)/kayhan-yonetim/(protected)/loading.tsx` tek tip iskeleti gösteriyor (4 KPI + büyük blok).
- Per-route `loading.tsx` ve `error.tsx` yok.
- Şu an arama, filtre, sıralama, sayfalama, bulk action, URL state — hiçbiri yok.

---

## 3. Mimari kararlar

### 3.1 Yeni ve değişen dosyalar

**Yeni dosyalar:**

```
components/admin/data-table/data-table.tsx
components/admin/data-table/data-table-toolbar.tsx
components/admin/data-table/data-table-bulk-bar.tsx
components/admin/data-table/data-table-pagination.tsx
components/admin/data-table/data-table-empty.tsx
components/admin/data-table/data-table-error.tsx
components/admin/data-table/data-table-skeleton.tsx
components/admin/data-table/types.ts
components/admin/data-table/use-table-state.ts
components/admin/data-table/client-fetcher.ts
components/admin/page-header.tsx
components/admin/products-table.tsx                  (Ürünler'e özel kolon/filtre tanımları)
app/(admin)/kayhan-yonetim/(protected)/urunler/loading.tsx
app/(admin)/kayhan-yonetim/(protected)/urunler/error.tsx
app/(admin)/kayhan-yonetim/actions/products-bulk.ts  (toplu aktif/pasif/sil server action)
```

**Değişen dosyalar:**

```
app/(admin)/kayhan-yonetim/(protected)/urunler/page.tsx   (header + DataTable kullanımı)
```

**Değişmeyen dosyalar (önemli):**
- `components/ui/table.tsx` — DataTable bunun üzerine inşa edilir, değiştirilmez.
- `components/admin/product-row-actions.tsx` — kolonun "İşlem" hücresinde olduğu gibi kullanılır.
- `lib/data/*` — repo katmanına dokunulmaz; veri çekimi server component'te aynı kalır.

### 3.2 Veri akışı

```
[Sayfa açılış]
  urunler/page.tsx (server component)
    └─> repo.listProducts() + repo.listCategories()
    └─> searchParams oku → initial state
    └─> <ProductsTable allRows={...} categories={...} initialState={...} />

[Kullanıcı filtre/arama/sıralama/sayfa değişimi]
  ProductsTable (client component)
    └─> URL searchParams güncelle (router.replace, scroll: false)
    └─> useTableState hook → state yeniden hesapla
    └─> client-fetcher → allRows üzerinde filter+sort+slice
    └─> <DataTable> yeniden render

[Toplu işlem]
  bulkActionsAction (server action)
    └─> repo.updateProduct / repo.deleteProduct (her id için)
    └─> revalidatePath('/kayhan-yonetim/urunler')
    └─> toast (sonner) → "X ürün güncellendi"
```

### 3.3 Tip imzaları

```ts
// data-table/types.ts
export interface ColumnDef<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number | Date;
  className?: string;          // <td/th> ekstra sınıflar (responsive gizlemek için)
  align?: "left" | "right";
}

export interface FilterDef {
  id: string;                  // URL anahtarı (ör. "kategori")
  type: "search" | "tabs" | "chips" | "select";
  label: string;
  options?: { value: string; label: string; count?: number }[];
  // search için ek
  placeholder?: string;
  searchAccessor?: (row: any) => string;
}

export interface SortDef {
  id: string;                  // URL'de "siralama" değeri (ör. "tarih-yeni")
  label: string;
  accessor: (row: any) => string | number | Date;
  direction: "asc" | "desc";
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "danger";
  confirm?: { title: string; description: string; confirmLabel: string };
  run: (rows: T[]) => Promise<void>;
}

export interface TableState {
  q: string;
  filters: Record<string, string>;   // URL'den okunan filtre değerleri
  sort: string;                       // sortlardan seçili olanın id'si
  page: number;
}

export type Fetcher<T> = (state: TableState) => Promise<{ rows: T[]; total: number }>;
```

`<DataTable<T>>` prop'ları:

```ts
interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  filters: FilterDef[];
  sorts: SortDef[];
  defaultSort: string;             // örn. "tarih-yeni"
  fetcher: Fetcher<T>;
  pageSize?: number;               // default 25
  bulkActions?: BulkAction<T>[];
  getRowId: (row: T) => string;
  initialState: TableState;        // server'dan searchParams ile gelir
  emptyState: { icon: LucideIcon; title: string; description: string; cta?: ReactNode };
}
```

### 3.4 URL şeması

Querystring anahtarları:

| Anahtar | Tip | Örnek | Default (URL'den çıkarılır) |
|---|---|---|---|
| `q` | string | `?q=panel` | boş |
| `kategori` | string (cat-id) | `?kategori=cat-paneller` | boş = hepsi |
| `durum` | enum | `?durum=aktif` \| `pasif` \| `tumu` | `tumu` |
| `stok` | enum | `?stok=dusuk` \| `stokta` \| `tukendi` \| `hepsi` | `hepsi` |
| `siralama` | enum | `?siralama=tarih-yeni` | `tarih-yeni` (default) |
| `sayfa` | number | `?sayfa=2` | `1` |

Boş/default değerler URL'de yazılmaz. `router.replace(..., { scroll: false })` ile geçmiş kirletilmeden güncellenir.

### 3.5 Ürünler için somut tanımlar

**Kolonlar:**
| id | header | cell | sortable | className |
|---|---|---|---|---|
| `media` | "Görsel" | thumb | hayır | `w-16` |
| `name` | "Ürün" | isim + marka altı | evet (asc/desc) | — |
| `category` | "Kategori" | kategori adı | hayır | `hidden md:table-cell text-muted` |
| `price` | "Fiyat" | formatPrice | evet | `text-right tabular-nums` |
| `stock` | "Stok" | renkli sayı | evet | `text-right tabular-nums` |
| `status` | "Durum" | Badge | hayır | `hidden sm:table-cell` |
| `actions` | "İşlem" | `<ProductRowActions>` | hayır | `w-32 text-right` |

**Filtreler:**
1. `search` — `q` anahtarı, placeholder "Ürün, marka veya slug ara…", accessor `[name, brand, slug].join(" ")` (Product tipinde SKU yok, slug admin-okunabilir kimlik olarak iş görüyor).
2. `kategori` — `select` tipi, options = `[{value: "", label: "Tüm kategoriler"}, ...categories]`.
3. `durum` — `tabs` tipi, sekmeler: Tümü / Aktif / Pasif (her sekmede mevcut filtreli sonuç içindeki sayaç rozetli).
4. `stok` — `chips` tipi: Hepsi / Stokta (qty > threshold) / Düşük (0 < qty ≤ threshold) / Tükendi (qty = 0).

**Sıralamalar:**
- `isim-az` (İsim A→Z)
- `isim-za` (İsim Z→A)
- `fiyat-artan`
- `fiyat-azalan`
- `stok-artan`
- `stok-azalan`
- `tarih-yeni` ← **default**
- `tarih-eski`

**Toplu işlemler:**
- `activate` — `Aktif yap`, ikon `Eye`, confirm yok, sonuç toast.
- `deactivate` — `Pasif yap`, ikon `EyeOff`, confirm yok.
- `delete` — `Sil`, ikon `Trash2`, variant `danger`, confirm modal: "{N} ürün silinecek. Bu işlem geri alınamaz."

### 3.6 Durum desenleri

- **Boş (filtresiz):** Dashed border kart, `Package` ikonu, "Henüz ürün yok", birincil buton "Yeni Ürün Ekle" → `/kayhan-yonetim/urunler/yeni`.
- **Boş (filtreli):** Dashed border kart, "Bu kriterde ürün bulunamadı", link "Filtreleri temizle" → `router.replace("/kayhan-yonetim/urunler")`.
- **Loading skeleton:** 5 satır × kolon sayısı, `bg-elevated animate-pulse`.
- **Error:** `border-danger` kenarlı kart, `AlertTriangle` ikonu, hata mesajı, "Yeniden Dene" butonu (`router.refresh()`).

`per-route loading.tsx` aynı skeleton'u kullanır. `error.tsx` aynı error card'ı kullanır.

### 3.7 Toplu işlem sticky bar

```
+--------------------------------------------------------------+
| ☑ 3 seçili      [Temizle]     [Aktif yap] [Pasif yap] [Sil] |
+--------------------------------------------------------------+
```

- Konum: ekranın altında `sticky bottom-4 mx-auto`, geniş ekranda ortalı.
- Görünür koşul: `selectedRows.length > 0`.
- Toast: `sonner` ile başarı/hata mesajı.
- Server action sonrası `revalidatePath` → tablo otomatik tazelenir, seçim sıfırlanır.

### 3.8 Hidrasyon ve "use client"

- `ProductsTable` client component (`"use client"`).
- Server component (`urunler/page.tsx`) `searchParams`'ı parse edip `initialState` hesaplar ve client'a verir.
- `useTableState` hook'u `useSearchParams()` ile değişimleri dinler; state ile URL daima senkron.
- İlk render flicker'sız: server `initialState` ile aynı view'ı render eder, hidrasyonda fark olmaz.

---

## 4. Doğrulama (verification)

Her major adım sonunda **ve** plan tamamlandığında çalıştırılacak:

```
pnpm tsc --noEmit
pnpm lint
```

İkisi de temiz olmalı.

### 4.1 Manuel test akışı

Dev server'ı başlat (`pnpm dev`), `http://localhost:3000/kayhan-yonetim/urunler` aç:

1. **Liste yüklenir** — mevcut tüm ürünler eskisi gibi görünür.
2. **Arama** — "panel" yaz → debounce sonrası listede sadece eşleşenler.
3. **Kategori filtresi** — dropdown'dan bir kategori seç → URL'de `?kategori=...` görünür, liste filtrelenir.
4. **Durum sekmesi** — Aktif → URL'de `?durum=aktif`, sayaç doğru.
5. **Stok chip** — Düşük → URL'de `?stok=dusuk`, sadece düşük stok ürünler.
6. **Kolon sıralama** — Fiyat başlığına tıkla → URL `?siralama=fiyat-artan`, ok ikonu görünür; tekrar tıkla → `fiyat-azalan`.
7. **Sayfa değişimi** — Sonraki butonu → URL `?sayfa=2`, doğru kayıtlar.
8. **URL paylaşımı** — Mevcut URL'yi kopyala, yeni sekmede aç → aynı görünüm hidrasyon olur.
9. **Tarayıcı geri** — back tuşu → önceki filtre durumuna döner.
10. **Bulk select** — 3 ürün seç → bulk bar görünür → "Pasif yap" → toast "3 ürün güncellendi", liste yenilenir, seçim temizlenir.
11. **Bulk delete** — 1 ürün seç → "Sil" → confirm modal → onayla → toast, ürün listeden gider.
12. **Boş filtre kombinasyonu** — Arama "xyzasdf" yaz → empty (filtreli) state → "Filtreleri temizle" linki çalışır.
13. **Eski özellikler korundu mu** — Satır aksiyonu (`ProductRowActions`) düzenle/aktif-pasif/sil hâlâ çalışır.

### 4.2 Regresyon — değişmeyenler

- Mobil (DevTools, 375px) — kategori/durum kolonları `hidden md:table-cell` ile gizleniyor; dar kalan durumda mevcut `overflow-x-auto` davranışı korunur.
- Dark mode — `lime-primary` renkleri her iki temada okunaklı.
- Diğer admin sayfaları (Teklifler, Siparişler vb.) eskisi gibi açılır, etkilenmez.

---

## 5. Riskler ve azaltma

| Risk | Azaltma |
|---|---|
| `useSearchParams` + server `searchParams` arasında hidrasyon uyumsuzluğu | `initialState` server'da deterministik parse edilir; client `useTableState` aynı parse mantığını kullanır. |
| `router.replace` her tuş vuruşunda → çok fazla render | Arama 300ms debounce; diğer filtreler zaten ayrık etkileşim. |
| Toplu sil'de yanlış kayıt | Confirm modal + sunucu tarafında her id ayrı `repo.deleteProduct` (transaction değil — tek tek başarısızlık durumunda kısmi başarı toast'ta gösterilir). |
| `<DataTable>` çok jenerik yazılırsa tip kayıpları olur | Generic `<T>` korunur; `ColumnDef<T>` ve `Fetcher<T>` ile tip güvenliği. |
| Pilot diğer sayfalara genelleneceği için yanlış soyutlama | Bu spec **sadece Ürünler**'i çözer; API genelliği "use case driven" — diğer sayfalara taşırken (B Küme) API gerekirse evrilir. |

---

## 6. Pilot sonrası (bu spec dışında)

Pilot başarılı olduğunda **ayrı planlarla** yapılacak (B/C Küme'lerin parçaları olabilir):

- Teklifler, Siparişler, Kampanyalar sayfalarını DataTable'a taşı (mevcut sekme filtreleri korunur).
- Bildirimler, Galeri, Stok Bildirimleri için DataTable variant'ı (Galeri grid görünüm korunabilir, sadece toolbar paylaşılır).
- Sayfa boyutu seçici, mobil kart-listesi, CSV export, Cmd+K arama.

---

## 7. Onaylanan kararlar (özet)

1. Pilot: yalnız Ürünler. ✓
2. Mimari: hibrit — bugün client-side, `fetcher` prop ile gelecekte server-side'a açık. ✓
3. State: URL-yansımalı (`?q=&kategori=&durum=&stok=&siralama=&sayfa=`). ✓
4. Filtreler: arama (ad/marka/SKU) + kategori + durum sekme + stok chip. ✓
5. Sıralama: isim/fiyat/stok/tarih; default `tarih-yeni`. ✓
6. Toplu işlem: aktif yap / pasif yap / sil. ✓
7. Mobil: mevcut responsive korunur, kart-listesi yok. ✓
8. Sayfa boyutu: sabit 25, selector yok. ✓
9. Durumlar: tutarlı boş (filtresiz/filtreli) / skeleton loading / error retry. ✓
