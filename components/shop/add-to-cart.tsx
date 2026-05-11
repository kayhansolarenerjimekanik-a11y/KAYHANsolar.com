"use client";

import { Bell, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { mockSiteSettings } from "@/lib/mock/data";
import { buildQuickOrderLink } from "@/lib/whatsapp";
import { useCart } from "@/store/cart";
import type { Product } from "@/types";

interface AddToCartProps {
  product: Product;
}

export function AddToCart({ product }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((s) => s.addItem);
  const inStock = product.stockQuantity > 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: product.currentPrice,
      imageUrl: product.media[0]?.url,
      stockQuantity: product.stockQuantity,
      quantity,
    });
    toast.success("Sepete eklendi", {
      description: `${quantity} × ${product.name}`,
      action: {
        label: "Sepete Git",
        onClick: () => {
          window.location.href = "/sepet";
        },
      },
    });
  };

  const handleNotifyRequest = () => {
    toast.success("Bilgilendirme talebiniz alındı", {
      description:
        "Demo modda — gerçek entegrasyon eklendiğinde e-posta veya bildirim alacaksınız.",
    });
  };

  const whatsappLink = buildQuickOrderLink(
    mockSiteSettings.whatsappNumber,
    product.name,
    product.currentPrice,
  );

  if (!inStock) {
    return (
      <div className="space-y-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <p className="text-sm font-medium text-foreground">
          Bu ürün şu anda tükenmiş durumda.
        </p>
        <p className="text-xs text-muted">
          Stoklar yenilendiğinde size bildirim gönderelim mi?
        </p>
        <Button variant="primary" size="md" onClick={handleNotifyRequest}>
          <Bell className="h-4 w-4" strokeWidth={2.4} />
          Gelince Haber Ver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Adet:</span>
        <div className="inline-flex items-center rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Azalt"
            className="grid h-10 w-10 place-items-center rounded-l-xl text-muted hover:text-foreground disabled:opacity-40"
          >
            <Minus className="h-4 w-4" strokeWidth={2.2} />
          </button>
          <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuantity((q) => Math.min(product.stockQuantity, q + 1))
            }
            disabled={quantity >= product.stockQuantity}
            aria-label="Arttır"
            className="grid h-10 w-10 place-items-center rounded-r-xl text-muted hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="primary" size="lg" onClick={handleAddToCart}>
          <ShoppingCart className="h-4 w-4" strokeWidth={2.4} />
          Sepete Ekle
        </Button>
        <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="lg" className="w-full">
            Hemen Satın Al
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted">
        &quot;Hemen Satın Al&quot; WhatsApp üzerinden tamamlanır.
      </p>
    </div>
  );
}
