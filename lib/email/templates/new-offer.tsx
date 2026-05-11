import type { Offer } from "@/lib/data/types";

export function renderNewOfferEmail(offer: Offer): string {
  const appliances =
    offer.appliances.length === 0
      ? "—"
      : offer.appliances
          .map((a) => (a.powerW ? `${a.name} (${a.powerW}W)` : a.name))
          .join(", ");

  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Yeni Teklif</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#c7ff00;color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">K</div>
        <strong style="font-size:16px;">KAYHAN Solar Yönetim</strong>
      </div>
      <h1 style="margin:0 0 16px 0;font-size:20px;">Yeni Teklif Talebi</h1>
      <p style="margin:0 0 16px 0;color:#475569;">${escape(offer.fullName)} adlı müşteriden yeni bir teklif geldi.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#94a3b8;width:140px;">Telefon</td><td>${escape(offer.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">E-posta</td><td>${escape(offer.email ?? "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">İl / İlçe</td><td>${escape(offer.city)} / ${escape(offer.district)}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Kurulum yeri</td><td>${offer.installationLocation === "roof" ? "Çatı" : offer.installationLocation === "land" ? "Arazi" : "Diğer"}</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;vertical-align:top;">Cihazlar</td><td>${escape(appliances)}</td></tr>
      </table>
      <div style="margin-top:16px;padding:16px;background:#f1f5f9;border-radius:12px;font-size:14px;white-space:pre-wrap;">${escape(offer.detailedDescription)}</div>
      <div style="margin-top:24px;">
        <a href="${siteUrl()}/kayhan-yonetim/teklifler/${offer.id}" style="display:inline-block;padding:12px 20px;background:#c7ff00;color:#000;text-decoration:none;border-radius:10px;font-weight:600;">Yönetim Panelinde Aç</a>
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
