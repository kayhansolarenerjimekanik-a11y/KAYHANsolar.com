"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Turnstile } from "@/components/security/turnstile";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { applyCampaigns } from "@/lib/campaigns";
import { turkishCities } from "@/lib/mock/data";
import { formatPrice } from "@/lib/utils";
import { buildOrderWhatsAppLink } from "@/lib/whatsapp";
import { useCart } from "@/store/cart";
import type { Campaign, SiteSettings } from "@/types";
import type { ShippingAddress } from "@/types/cart";

const SHIPPING_THRESHOLD = 50000;
const SHIPPING_COST = 500;

interface CartViewProps {
  settings: SiteSettings;
  campaigns: Campaign[];
  productCategoryById: Record<string, string>;
}

export function CartView({
  settings,
  campaigns,
  productCategoryById,
}: CartViewProps) {
  const items = useCart((s) => s.items);
  const isHydrated = useCart((s) => s.isHydrated);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const calc = useMemo(
    () =>
      applyCampaigns(
        {
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            hasFreeShipping: i.hasFreeShipping,
          })),
          productCategoryById,
          baseShippingCost: SHIPPING_COST,
          freeShippingThreshold: SHIPPING_THRESHOLD,
        },
        campaigns,
      ),
    [items, campaigns, productCategoryById],
  );

  const { register, handleSubmit, formState } = useForm<ShippingAddress>({
    mode: "onBlur",
  });

  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    const link = buildOrderWhatsAppLink(
      settings.whatsappNumber,
      items,
      calc.total - calc.shippingCost,
      data,
    );
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            name: i.name,
            brand: i.brand,
            price: i.price,
            quantity: i.quantity,
            imageUrl: i.imageUrl,
          })),
          subtotal: calc.subtotal,
          shippingCost: calc.shippingCost,
          total: calc.total,
          discountAmount: calc.totalDiscount,
          appliedCampaignIds: calc.appliedCampaigns.map((a) => a.campaignId),
          customerName: data.fullName,
          customerPhone: data.phone,
          shippingAddress: {
            city: data.city,
            district: data.district,
            detailedAddress: data.detailedAddress,
          },
          captchaToken,
        }),
      });
      if (!res.ok) {
        console.warn("[cart] order persistence returned status", res.status);
      }
    } catch (err) {
      console.warn("[cart] order persistence failed; opening WhatsApp anyway", err);
    } finally {
      window.open(link, "_blank", "noopener,noreferrer");
      setSubmitting(false);
    }
  });

  if (!isHydrated) {
    return (
      <Container className="py-14">
        <div className="h-8 w-40 animate-pulse rounded-md bg-elevated" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-elevated"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-elevated" />
        </div>
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-14 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-elevated">
          <ShoppingBag className="h-7 w-7 text-muted" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sepetiniz boş</h1>
        <p className="max-w-md text-muted">
          Henüz sepete ürün eklemediniz. Mağazaya göz atarak başlayabilirsiniz.
        </p>
        <Link href="/magaza">
          <Button size="lg">Mağazaya Git</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-10 lg:py-14">
      <header className="flex flex-col gap-2 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Sepet
        </h1>
        <p className="text-muted">
          {items.length} ürün — sipariş WhatsApp üzerinden tamamlanır.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-3 sm:p-4"
            >
              <Link
                href={`/urun/${item.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-elevated sm:h-28 sm:w-28"
              >
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col justify-between gap-2">
                <div>
                  {item.brand && (
                    <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                      {item.brand}
                    </p>
                  )}
                  <Link
                    href={`/urun/${item.slug}`}
                    className="line-clamp-2 text-sm font-semibold hover:text-lime-dark dark:hover:text-lime-primary"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {formatPrice(item.price)} / adet
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-xl border border-border">
                    <button
                      type="button"
                      aria-label="Azalt"
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity - 1)
                      }
                      className="grid h-9 w-9 place-items-center rounded-l-xl text-muted hover:text-foreground"
                    >
                      <Minus className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Arttır"
                      disabled={item.quantity >= item.stockQuantity}
                      onClick={() =>
                        updateQuantity(item.productId, item.quantity + 1)
                      }
                      className="grid h-9 w-9 place-items-center rounded-r-xl text-muted hover:text-foreground disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-muted hover:text-danger"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2.2} />
                      Kaldır
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="text-base font-semibold tracking-tight">
              Sipariş Özeti
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Ara Toplam</dt>
                <dd className="font-medium tabular-nums">
                  {formatPrice(calc.subtotal)}
                </dd>
              </div>

              {calc.appliedCampaigns.length > 0 && (
                <div className="space-y-2 rounded-xl bg-lime-primary/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-lime-dark dark:text-lime-primary">
                    Uygulanan Kampanyalar
                  </p>
                  {calc.appliedCampaigns.map((a) => (
                    <div
                      key={a.campaignId}
                      className="flex items-start justify-between gap-3"
                    >
                      <span className="text-xs font-medium text-foreground">
                        {a.title}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-success">
                        {a.freeShipping && a.discountAmount === 0
                          ? "Kargo bedava"
                          : `−${formatPrice(a.discountAmount)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <dt className="text-muted">Kargo</dt>
                <dd className="font-medium tabular-nums">
                  {calc.shippingCost === 0 ? (
                    <span className="text-success">Bedava</span>
                  ) : (
                    formatPrice(calc.shippingCost)
                  )}
                </dd>
              </div>

              {calc.shippingCost > 0 && calc.subtotal < SHIPPING_THRESHOLD && (
                <p className="rounded-lg bg-elevated px-3 py-2 text-xs text-muted">
                  {formatPrice(SHIPPING_THRESHOLD - calc.subtotal)} daha
                  alışveriş yapın, kargo bedava olsun.
                </p>
              )}

              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt>Toplam</dt>
                <dd className="tabular-nums">{formatPrice(calc.total)}</dd>
              </div>
            </dl>

            {!showAddressForm ? (
              <Button
                variant="primary"
                size="lg"
                className="mt-5 w-full"
                onClick={() => setShowAddressForm(true)}
              >
                Siparişi Tamamla
              </Button>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">
                    Ad Soyad
                  </label>
                  <input
                    {...register("fullName", { required: true, minLength: 3 })}
                    className="h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    {...register("phone", { required: true, minLength: 10 })}
                    placeholder="05XX XXX XX XX"
                    className="h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted">İl</label>
                    <select
                      {...register("city", { required: true })}
                      className="h-10 w-full rounded-lg border border-border bg-elevated px-2 text-sm text-foreground focus:border-lime-primary focus:outline-none"
                    >
                      <option value="">Seçin</option>
                      {turkishCities.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted">
                      İlçe
                    </label>
                    <input
                      {...register("district", { required: true })}
                      className="h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground focus:border-lime-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted">
                    Adres
                  </label>
                  <textarea
                    {...register("detailedAddress", {
                      required: true,
                      minLength: 10,
                    })}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-lime-primary focus:outline-none"
                  />
                </div>
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onToken={(t) => setCaptchaToken(t)}
                  onExpire={() => setCaptchaToken(null)}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!formState.isValid || submitting}
                >
                  {submitting ? "Gönderiliyor..." : "WhatsApp ile Siparişi Tamamla"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAddressForm(false)}
                >
                  Geri
                </Button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-elevated p-4 text-xs text-muted">
            <span className="font-semibold text-foreground">Ödeme akışı:</span>{" "}
            Sipariş onayı ve ödeme detayları WhatsApp üzerinden tamamlanır.
          </div>
        </div>
      </div>
    </Container>
  );
}
