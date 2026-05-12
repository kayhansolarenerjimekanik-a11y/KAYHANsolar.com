import type { CartItem, ShippingAddress } from "@/types/cart";

import { formatPrice } from "./utils";

export function buildOrderWhatsAppLink(
  whatsappNumber: string,
  items: CartItem[],
  subtotal: number,
  address?: ShippingAddress,
  note?: string,
): string {
  const lines: string[] = [
    "Merhaba KAYHAN Solar,",
    "",
    "Aşağıdaki ürünleri sipariş etmek istiyorum:",
    "",
  ];

  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name} — ${item.quantity} adet × ${formatPrice(
        item.price,
      )}`,
    );
  });

  lines.push("", `*Ara Toplam:* ${formatPrice(subtotal)}`, "");

  if (address) {
    lines.push("*Teslimat Bilgileri:*");
    lines.push(`Ad Soyad: ${address.fullName}`);
    lines.push(`Telefon: ${address.phone}`);
    lines.push(`İl/İlçe: ${address.city} / ${address.district}`);
    lines.push(`Adres: ${address.detailedAddress}`);
    lines.push("");
  }

  if (note?.trim()) {
    lines.push("*Not:*");
    lines.push(note.trim());
    lines.push("");
  }

  lines.push("Teşekkürler.");

  const text = encodeURIComponent(lines.join("\n"));
  const clean = whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${text}`;
}

export function buildQuickOrderLink(
  whatsappNumber: string,
  productName: string,
  price: number,
  quantity: number = 1,
): string {
  const lines =
    quantity > 1
      ? [
          `Merhaba, "${productName}" ürününden ${quantity} adet (toplam ${formatPrice(
            price * quantity,
          )}) sipariş etmek istiyorum.`,
        ]
      : [
          `Merhaba, "${productName}" (${formatPrice(price)}) ürününü sipariş etmek istiyorum.`,
        ];
  const text = encodeURIComponent(lines.join("\n"));
  const clean = whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${text}`;
}
