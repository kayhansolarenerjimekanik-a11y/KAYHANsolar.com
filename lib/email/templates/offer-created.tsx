// lib/email/templates/offer-created.tsx
import type { Offer } from "@/lib/data/types";

export function renderOfferCreatedEmail(offer: Offer): string {
  const installationLabel =
    offer.installationLocation === "roof"
      ? "Çatı"
      : offer.installationLocation === "land"
        ? "Arazi"
        : "Diğer";

  const createdAt = new Date(offer.createdAt).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Talebiniz Alındı</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#c7ff00;color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">K</div>
        <strong style="font-size:16px;">KAYHAN Solar</strong>
      </div>

      <h1 style="margin:0 0 8px;font-size:22px;">Talebiniz Alındı</h1>
      <p style="margin:0 0 20px;color:#475569;">Sayın ${escape(offer.fullName)}, telefonda görüştüğümüz teklif talebiniz sistemimize kaydedildi.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#94a3b8;width:160px;">İl / İlçe</td><td>${escape(offer.city)} / ${escape(offer.district)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Kurulum yeri</td><td>${installationLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Kayıt tarihi</td><td>${escape(createdAt)}</td></tr>
      </table>

      <p style="margin:24px 0 0;color:#475569;">Detaylı yanıtımız 24 saat içinde size iletilecektir.</p>

      <div style="margin-top:24px;">
        <a href="${siteUrl()}" style="display:inline-block;padding:12px 20px;background:#c7ff00;color:#000;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Anasayfaya Git</a>
      </div>
    </div>
  </body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";
}
