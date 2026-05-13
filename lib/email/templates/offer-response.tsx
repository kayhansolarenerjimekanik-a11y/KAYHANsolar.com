// lib/email/templates/offer-response.tsx
import { calculateSystem } from "@/lib/solar-calculator";
import { formatPrice } from "@/lib/utils";
import type { Offer } from "@/lib/data/types";

export function renderOfferResponseEmail(
  offer: Offer,
  adminResponse: string,
): string {
  const calc = calculateSystem(
    offer.appliances.map((a) => ({ name: a.name, powerW: a.powerW })),
  );

  const calcRows =
    calc.totalPowerW === 0
      ? ""
      : `
      <h2 style="margin:24px 0 12px;font-size:16px;">Sistem Tahmini</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;">
        <tr><td style="padding:6px 0;color:#94a3b8;width:160px;">Toplam Güç</td><td>${calc.totalPowerW.toLocaleString("tr-TR")} W</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Günlük Tüketim</td><td>${calc.dailyEnergyKwh.toFixed(1)} kWh</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Aylık Tüketim</td><td>${calc.monthlyEnergyKwh.toFixed(0)} kWh</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Önerilen Panel (550W)</td><td>${calc.panelCount} adet</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Önerilen İnverter</td><td>${calc.recommendedInverterKw} kW</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Önerilen Batarya (48V)</td><td>${calc.recommendedBatteryAh} Ah</td></tr>
        <tr><td style="padding:6px 0;color:#94a3b8;">Kabataslak Yatırım</td><td><strong>${escape(formatPrice(calc.roughCostTry))}</strong></td></tr>
      </table>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Bu tahmin saha keşfi sonrasında kesinleşecektir. ±%10 değişebilir.</p>`;

  const waLink = waUrl(offer.fullName);
  const waButton = waLink
    ? `<a href="${waLink}" style="display:inline-block;padding:12px 20px;background:#25d366;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">WhatsApp'tan İletişime Geç</a>`
    : "";

  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Teklif Yanıtınız</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#c7ff00;color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">K</div>
        <strong style="font-size:16px;">KAYHAN Solar</strong>
      </div>

      <h1 style="margin:0 0 8px;font-size:22px;">Teklif Yanıtınız Hazır</h1>
      <p style="margin:0 0 20px;color:#475569;">Sayın ${escape(offer.fullName)}, aşağıda teklifiniz için hazırladığımız yanıt yer alıyor.</p>

      <div style="padding:20px;background:#f1f5f9;border-radius:12px;white-space:pre-wrap;font-size:14px;line-height:1.6;">${escape(adminResponse)}</div>

      ${calcRows}

      <div style="margin-top:28px;display:flex;flex-wrap:wrap;gap:10px;">
        ${waButton}
        <a href="${siteUrl()}/magaza" style="display:inline-block;padding:12px 20px;background:#c7ff00;color:#000;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Mağazamızı İncele</a>
      </div>

      <hr style="margin:32px 0 16px;border:none;border-top:1px solid #e2e8f0;" />
      <p style="margin:0;font-size:12px;color:#64748b;">Bu e-posta KAYHAN Solar teklif değerlendirme süreciniz kapsamında gönderilmiştir. KVKK aydınlatma metnimize <a href="${siteUrl()}/kvkk" style="color:#475569;">${siteUrl()}/kvkk</a> adresinden ulaşabilirsiniz.</p>
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

function waUrl(fullName: string): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!raw) return null;
  const phone = raw.replace(/\D/g, "");
  if (!phone) return null;
  const text = encodeURIComponent(
    `Merhaba, ${fullName}. Teklifimle ilgili görüşmek istiyorum.`,
  );
  return `https://wa.me/${phone}?text=${text}`;
}
