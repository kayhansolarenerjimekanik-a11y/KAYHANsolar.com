export function renderStockBackEmail({
  productName,
  productUrl,
}: {
  productName: string;
  productUrl: string;
}): string {
  return `<!doctype html>
<html lang="tr">
  <head><meta charset="utf-8" /><title>Stoğa Geri Geldi</title></head>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#c7ff00;color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">K</div>
        <strong style="font-size:16px;">KAYHAN Solar</strong>
      </div>
      <h1 style="margin:0 0 16px 0;font-size:22px;">İyi haber!</h1>
      <p style="margin:0 0 16px 0;color:#475569;line-height:1.5;">
        Stoğa girmesini beklediğiniz <strong>${escape(productName)}</strong>
        ürünü artık satın alınabilir durumda.
      </p>
      <div style="margin-top:24px;">
        <a href="${escape(productUrl)}" style="display:inline-block;padding:12px 24px;background:#c7ff00;color:#000;text-decoration:none;border-radius:10px;font-weight:600;">Ürünü Görüntüle</a>
      </div>
      <p style="margin-top:32px;font-size:12px;color:#94a3b8;">
        Bu e-postayı KAYHAN Solar bildirim aboneliğinizi alarak alıyorsunuz.
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
