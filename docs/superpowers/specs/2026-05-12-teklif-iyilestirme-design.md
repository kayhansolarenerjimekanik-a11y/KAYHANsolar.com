# Teklif Akışı İyileştirme — Tasarım Dökümanı

**Tarih:** 2026-05-12
**Durum:** Onaylandı, plan yazımına hazır
**Kapsam:** 6 adımlı `/teklif-al` wizard'ı + admin teklif modülü

---

## 1. Hedefler

Mevcut teklif akışı uçtan uca çalışıyor (Supabase canlı, Resend admin bildirimi atıyor). Bu spec şu beş eksiği kapatıyor:

1. **`step-success` zenginleştirme** — sade onay ekranını "ne olacak şimdi" diyen, eylem yönlendirici bir ekrana çevirmek.
2. **Wizard UX cilası** — adım sayacı ("Adım X/5") + mevcut localStorage restore'un olduğu gibi bırakılması.
3. **Admin yanıt → müşteri emaili** — admin "Yanıtlandı" durumuna geçip yanıt yazınca müşteriye otomatik email.
4. **Manuel teklif oluşturma** — telefonla gelen müşteri için admin tarafında tek sayfa form.
5. **Manuel kayıt sonrası bilgi emaili** — müşteri email'i varsa "kaydınız alındı" bildirimi.

**Scope dışı:**
- Wizard'da görsel/dosya yükleme (link yapıştırma mevcut, dosya upload başka oturum).
- PDF teklif eki üretimi.
- Production domain doğrulaması (Faz 6'ya bırakıldı; Resend sandbox `onboarding@resend.dev` ile çalışmaya devam).
- Email kuyruğu/retry altyapısı; ilk denemede başarısız olursa admin uyarı görür ve WhatsApp'a düşer.
- Müşteriye otomatik SMS bildirimi.

---

## 2. Mevcut akış (özet)

- Müşteri wizard'ı `components/offer-wizard/` altında: welcome → personal → location → system → confirm → success.
- `use-wizard-state.ts` localStorage'a sessiz kaydedip restore ediyor.
- Her adım kendi zod schema'sıyla validate ediliyor (`lib/validations/offer-wizard.ts`).
- `submitOfferAction` (`app/(public)/teklif-al/actions/submit.ts`) — Turnstile + rate-limit + `repo.createOffer` + `sendNewOfferEmail` (admin'e bildirim).
- Admin tarafı: `app/(admin)/kayhan-yonetim/(protected)/teklifler/` altında liste + `[id]` detay.
- `OfferResponseForm` sadece `repo.updateOffer` çağırıyor; müşteriye email gitmiyor.
- Email altyapısı: `lib/email/resend.ts` + `lib/email/templates/`. RESEND_API_KEY yoksa `send()` console.warn'a düşer (fail-soft).
- `solar-calculator.ts` admin detay sayfasında `OfferCalculator` ile kullanılıyor.

---

## 3. Mimari kararlar

### 3.1 Yeni ve değişen dosyalar

**Yeni dosyalar:**

```
app/(admin)/kayhan-yonetim/(protected)/teklifler/yeni/page.tsx
app/(admin)/kayhan-yonetim/actions/create-offer.ts
components/admin/offer-create-form.tsx
lib/email/templates/offer-response.tsx
lib/email/templates/offer-created.tsx
lib/validations/offer-create.ts
```

**Değişen dosyalar:**

```
components/offer-wizard/step-success.tsx           (zenginleştirme + WhatsApp + Mağaza)
components/offer-wizard/step-indicator.tsx         (Adım X/5 etiketi)
components/offer-wizard/wizard-shell.tsx           (whatsappNumber prop)
app/(public)/teklif-al/page.tsx                    (server'da settings çek, prop geç)
components/admin/offer-response-form.tsx           (dinamik buton etiketi + email durumu)
app/(admin)/kayhan-yonetim/actions/offers.ts       (responded → email tetik)
app/(admin)/kayhan-yonetim/(protected)/teklifler/page.tsx (+ Yeni Teklif tuşu)
lib/email/resend.ts                                (sendOfferResponseEmail + sendOfferCreatedEmail)
```

### 3.2 Veri akışı

```
[Müşteri wizard submit]
  └─> submitOfferAction
      └─> repo.createOffer + sendNewOfferEmail(admin)        [mevcut, değişmez]

[Admin yanıt formu kaydet]
  └─> updateOfferAction
      └─> repo.updateOffer
      └─> IF status=responded VE adminResponse VE offer.email:
           sendOfferResponseEmail(offer, adminResponse)       [YENİ]

[Admin manuel teklif]
  └─> createOfferAction
      └─> repo.createOffer
      └─> IF offer.email: sendOfferCreatedEmail(offer)        [YENİ]
      └─> redirect /kayhan-yonetim/teklifler/[id]
```

---

## 4. Müşteri tarafı detayları

### 4.1 `step-success.tsx`

Yeni iskelet:

- Üstte büyük yeşil çek (mevcut), "Teklifiniz Başarıyla İletildi" başlığı, "En geç 24 saat içinde size dönüş yapacağız" alt metni.
- **Sırada Ne Var?** bölümü, 3 numaralı madde:
  1. Ekibimiz 24 saat içinde sizi arayacak.
  2. Saha keşfi için randevu planlanacak.
  3. Detaylı teklif e-posta/WhatsApp ile size ulaşacak.
- 3 buton: **Anasayfa**, **Mağazaya Göz At** (`/magaza`), **WhatsApp'la İletişim** (site ayarındaki numara, varsa).
- Altta "Yeni bir teklif daha gönder" linki (mevcut).

WhatsApp numarası **site ayarlarından** (`repo.getSiteSettings()`) çekilir. Numara boşsa buton gizlenir.

### 4.2 Settings prop akışı

`WizardShell` client component olarak kalır; `/teklif-al/page.tsx` server tarafta settings'i çeker ve `whatsappNumber: string | null` propunu `WizardShell` → `StepSuccess` zinciri üzerinden iletir.

```tsx
// app/(public)/teklif-al/page.tsx
export default async function TeklifAlPage() {
  const settings = await repo.getSiteSettings();
  return <WizardShell whatsappNumber={settings.whatsappNumber ?? null} />;
}
```

### 4.3 `step-indicator.tsx`

Mevcut numaralı dairelerin **üstüne** küçük bir başlık satırı eklenir:

```
Adım 2/5 — Bilgiler
① ━━ ② ━━ ③ ━━ ④ ━━ ⑤
```

Sayaç hesabı: `STEP_ORDER.filter(s => s !== 'success').length` → 5. Welcome 1/5, confirm 5/5. `success` adımı zaten indicator göstermiyor.

Etiket için `STEP_LABELS[current]` kullanılır.

### 4.4 `use-wizard-state.ts`

**Dokunulmuyor.** Mevcut sessiz restore davranışı kullanıcı tercihi olarak onaylandı.

---

## 5. Admin yanıt → müşteri emaili

### 5.1 `updateOfferAction` (offers.ts) değişikliği

```ts
export interface OfferActionState {
  error?: string;
  success?: boolean;
  emailSent?: boolean;
  emailWarning?: string;
}

export async function updateOfferAction(
  id: string,
  _prev: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  await requireAdmin();
  const parsed = offerUpdateSchema.safeParse({ /* ... */ });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const offer = await repo.getOfferById(id);
  if (!offer) return { error: "Teklif bulunamadı" };

  const patch = { /* mevcut alanlar */ };
  if (parsed.data.status === "responded") {
    patch.respondedAt = new Date().toISOString();
  }
  await repo.updateOffer(id, patch);

  let emailSent = false;
  let emailWarning: string | undefined;

  const shouldEmail =
    parsed.data.status === "responded" &&
    parsed.data.adminResponse?.trim() &&
    offer.email;

  if (shouldEmail) {
    try {
      await sendOfferResponseEmail(
        { ...offer, ...patch },
        parsed.data.adminResponse!,
      );
      emailSent = true;
    } catch (err) {
      console.error("[email] offer-response failed", err);
      emailWarning = "Kayıt başarılı ama email iletilemedi";
    }
  }

  revalidatePath(`/kayhan-yonetim/teklifler/${id}`);
  revalidatePath("/kayhan-yonetim/teklifler");
  revalidatePath("/kayhan-yonetim");
  return { success: true, emailSent, emailWarning };
}
```

### 5.2 `OfferResponseForm` UI

- Form başlığının altında bilgilendirme: *"Durumu 'Yanıtlandı' yapıp kaydederseniz müşterinin e-posta adresine yanıt metni gönderilir."*
- Kaydet tuşu etiketi, status `responded` + adminResponse dolu + offer.email var ise **"Kaydet ve Email At"**, aksi halde **"Kaydet"**.
- Müşterinin email'i yoksa, status `responded` + adminResponse dolu durumunda form altında uyarı: *"Bu müşterinin e-postası yok. Yanıtı WhatsApp'tan iletin."*
- Submit sonrası state:
  - `success && emailSent` → "Kaydedildi · Email gönderildi" (yeşil).
  - `success && emailWarning` → "Kaydedildi. ⚠ Email iletilemedi" (sarı).
  - `success` (email tetiklenmedi) → "Kaydedildi" (yeşil).

### 5.3 `sendOfferResponseEmail` (resend.ts)

```ts
export async function sendOfferResponseEmail(
  offer: Offer,
  adminResponse: string,
): Promise<void> {
  const { renderOfferResponseEmail } = await import("./templates/offer-response");
  const html = renderOfferResponseEmail(offer, adminResponse);
  if (!offer.email) return;
  await send({
    to: offer.email,
    subject: "Teklif Yanıtınız — KAYHAN Solar",
    html,
  });
}
```

### 5.4 `offer-response.tsx` şablonu

Bölümler:
1. Header: KAYHAN logo + "Teklif Yanıtınız Hazır".
2. Selamlama: "Sayın {fullName}, aşağıda teklifiniz için hazırladığımız yanıt yer alıyor."
3. Yanıt metni bloğu (whitespace-pre-wrap, HTML escape zorunlu).
4. **Sistem Tahmini tablosu** (offer.appliances.length > 0 ise):
   - `calculateSystem(offer.appliances)` sonuçları: Toplam Güç, Günlük/Aylık Tüketim, Önerilen Panel, İnverter, Batarya, Kabataslak Yatırım.
   - Altında not: *"Bu tahmin saha keşfi sonrasında kesinleşecektir. ±%10 değişebilir."*
5. CTA butonları: WhatsApp (wa.me + site numarası) + Mağaza linki.
6. Footer: İletişim + KVKK ipucu.

Tüm dinamik alanlar `escape()` helper'ından geçer (XSS koruma).

### 5.5 Idempotency

Admin status'u `responded`'da bırakıp tekrar kaydederse email tekrar gider. İstenen davranış — admin yanıt metnini güncelleyip yeniden gönderebilmeli. Buton etiketi "Kaydet ve Email At" olarak görünür kalır, admin farkındadır.

---

## 6. Manuel teklif oluşturma

### 6.1 Yeni route: `/kayhan-yonetim/teklifler/yeni`

Liste sayfasının başlık satırının sağına **"+ Yeni Teklif"** birincil buton eklenir, bu rotaya gider.

### 6.2 `OfferCreateForm` (client component)

Tek sayfa form, üç bölüm halinde gruplandırılmış:

- **Müşteri:** Ad Soyad*, Telefon*, E-posta, İl* (Select), İlçe*.
- **Kurulum:** Kurulum türü (Select), Adres / detay (Textarea).
- **İhtiyaç:** Cihazlar (`ApplianceListEditor` yeniden kullanılır), Detaylı açıklama*.

Cihazlar JSON olarak hidden input ile gönderilir:

```tsx
<input type="hidden" name="appliances" value={JSON.stringify(appliances)} />
```

`useActionState` ile `createOfferAction` çağrılır. Hata → form üstünde mesaj. Başarı → server tarafta `redirect()`.

İptal tuşu liste sayfasına geri döner.

### 6.3 `createOfferAction`

`app/(admin)/kayhan-yonetim/actions/create-offer.ts` (yeni dosya). İmza ve akış 4. bölümdeki taslağa göre. Email gönderimi başarısız olursa `console.error` + sessizce devam (redirect yine yapılır).

### 6.4 `offerCreateSchema`

`lib/validations/offer-create.ts` (yeni dosya). Wizard schema'larıyla karışıklık olmaması için ayrı tutulur:

- `kvkkAccepted` alanı yok (admin için irrelevant).
- `media` alanı yok (admin manuel kayıtta görsel link almıyor).
- `detailedDescription` min 10 karakter (wizard'da 20 idi; telefondaki hızlı kayıt için daha esnek).
- Diğer alanlar wizard schema'larıyla aynı kurallar.

### 6.5 `offer-created.tsx` şablonu

Bölümler:
1. Header: KAYHAN logo + "Talebiniz Alındı".
2. "Sayın {fullName}, telefonda görüştüğümüz teklif talebiniz sistemimize kaydedildi."
3. Kısa özet: İl/İlçe, Kurulum türü, Tarih.
4. "Detaylı yanıtımız 24 saat içinde size iletilecektir."
5. CTA: WhatsApp + Anasayfa.

### 6.6 `repo.createOffer` ek alan kararı

Manuel kaydı tespit etmek için `source: "admin_manual"` gibi bir alan **eklenmiyor**. Mevcut Offer şeması sade tutulacak; ihtiyaç olursa sonra eklenir.

---

## 7. Test stratejisi

### 7.1 Statik kontroller (her görev sonu)

```
pnpm tsc --noEmit
pnpm lint
```

İkisi de sıfır hata / sıfır uyarı vermeli.

### 7.2 Manuel smoke testleri

**Müşteri akışı:**
- `/teklif-al` baştan sona doldur, success ekranını gör.
- Step indicator'da "Adım 1/5 — Başlangıç" → "Adım 5/5 — Onay" geçişi.
- Tarayıcıyı kapat/aç → kaldığı adımda devam (sessiz restore).
- Success ekranında 3 sıralı adım + 3 buton (WhatsApp varsa görünür).

**Admin yanıt akışı:**
- Detay sayfası → durumu "Yanıtlandı" yap + yanıt metni yaz → Kaydet ve Email At → Resend inbox'unda emaili gör.
- Email içeriği: yanıt metni + calculator özeti (cihaz varsa) + WhatsApp/Mağaza CTA.
- Müşteri email'i olmayan teklif: "WhatsApp kullan" uyarısı görünmeli.
- Status `in_review` + yanıt yaz → email gitmemeli.

**Manuel teklif akışı:**
- Liste sayfasında "+ Yeni Teklif" tuşu görünür.
- Form'u doldur → submit → detay sayfasına yönlen.
- Müşteri email'i dolduysa "kayıt alındı" emaili gitsin; yoksa atlansın.
- Validation hatası (boş telefon) → form üstünde hata, redirect olmaz.
- Calculator detay sayfasında doğru hesaplasın.

### 7.3 Edge case'ler

- RESEND_API_KEY env'de yok → `send()` console.warn'a düşer, hata fırlatmaz.
- Site ayarında WhatsApp numarası boş → success ekranındaki buton gizlenir.
- Cihaz listesi boş → email'de calculator bölümü görünmez.
- `<script>` payload'lı yanıt metni → email'de escape edilmiş görünür.

---

## 8. Riskler ve önlemler

| Risk | Önlem |
|---|---|
| Resend sandbox sadece doğrulanmış adreslere gönderir, müşteri test maili rastgele adres olursa görünmez | Test sırasında alıcı olarak kendi mail adresi kullanılsın. Production domain doğrulaması Faz 6'da. |
| Yanıt metni HTML escape edilmezse XSS riski | `offer-response.tsx`'in `escape()` helper'ı her dinamik alan için zorunlu. Test maddesi olarak `<script>` payload denenecek. |
| Email başarısız + DB güncel ayrışması | İstenen davranış. Admin uyarıyı görür, WhatsApp'a düşer. Retry scope dışı. |
| Manuel form cihaz JSON parse hatası | Server'da try/catch + zod parse hatası → kullanıcı dostu mesaj. |
| Step indicator sayacı tutarsızlığı | `STEP_ORDER` üzerinden hesap, sabit kural: `success` adımı sayaca dahil değil. Test maddesi var. |
| `WizardShell` prop ekleme hydration'ı bozabilir | `WizardShell` client olarak kalır, sadece `whatsappNumber: string \| null` propunu alır. Page.tsx server'da settings'i çekip prop geçer. |

---

## 9. Rollback senaryosu

- Tüm değişiklikler görev başına commit'leniyor. Hatalı görev için `git revert <sha>` o görevi geri alır, diğerleri ayakta kalır.
- DB şema değişikliği yok — sadece mevcut tabloları okuma/yazma. Migration gerekmez.
- Yeni email gönderimleri opt-in (status responded + yanıt dolu + email var). Sorun çıkarsa `sendOfferResponseEmail` çağrısını `updateOfferAction`'dan tek satırlık değişiklikle devre dışı bırakırız.

---

## 10. Demo modu uyumluluğu

- `repo.createOffer` / `repo.updateOffer` mock + supabase'te destekli.
- `sendOfferResponseEmail` / `sendOfferCreatedEmail` RESEND_API_KEY yoksa console.warn'a düşer.
- Site ayarlarında WhatsApp numarası mock data'da varsayılan dolu, demo modda da çalışır.

---

## 11. Görev sıralaması (plan'da ayrıştırılacak)

1. **Email infra** — `sendOfferResponseEmail` + `sendOfferCreatedEmail` + iki şablon dosyası.
2. **Müşteri tarafı** — step-success zenginleştirme + step-indicator etiketi + WizardShell prop akışı.
3. **Admin yanıt akışı** — `updateOfferAction` email tetik + `OfferResponseForm` UI.
4. **Manuel teklif** — validation schema + form + action + route + liste tuşu.
5. **Tam akış test + commit zinciri kapanışı.**

Her görev sonunda: `pnpm tsc --noEmit && pnpm lint` sıfır hata + manuel smoke + commit.
