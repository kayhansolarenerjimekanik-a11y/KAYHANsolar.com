import type { Order } from "@/lib/data/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  whatsapp_sent: "İletişim aşamasında",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoya verildi",
  delivered: "Teslim edildi",
  cancelled: "İptal",
};

export function renderOrderStatusEmail(order: Order): string {
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Sipariş Durumu</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 8px 0;font-size:22px;">Sipariş ${escape(order.orderNumber)}</h1>
      <p style="color:#475569;margin:0 0 24px 0;">Durum güncellendi.</p>
      <div style="padding:16px 20px;background:#c7ff00;color:#000;border-radius:12px;font-weight:600;font-size:18px;">
        ${escape(statusLabel)}
      </div>
      <p style="margin-top:24px;font-size:14px;color:#475569;">
        Sorularınız için bizimle iletişime geçebilirsiniz.
      </p>
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
