import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/shop/add-to-cart";
import { ProductCard } from "@/components/shop/product-card";
import { ProductBadgeChip } from "@/components/shop/product-badge";
import { ProductGallery } from "@/components/shop/product-gallery";
import { StockStatus } from "@/components/shop/stock-status";
import { Container } from "@/components/ui/container";
import { ProductJsonLd } from "@/components/seo/product-jsonld";
import { repo } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { recordEvent } from "@/lib/analytics/repository";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const products = await repo.listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await repo.getProductBySlug(slug);
  if (!product) return { title: "Ürün bulunamadı" };
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      images: product.media[0]?.url
        ? [{ url: product.media[0].url, alt: product.name }]
        : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await repo.getProductBySlug(slug);
  if (!product) notFound();

  // Best-effort analytics — never throws.
  recordEvent({
    type: "product_view",
    pageUrl: `/urun/${product.slug}`,
    productId: product.id,
  }).catch(() => {
    /* analytics must never break the page */
  });

  const categories = await repo.listCategories();
  const category = categories.find((c) => c.id === product.categoryId);
  const hasDiscount =
    product.compareAtPrice && product.compareAtPrice > product.currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compareAtPrice! - product.currentPrice) /
          product.compareAtPrice!) *
          100,
      )
    : 0;

  const allProducts = await repo.listProducts();
  const related = allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        p.categoryId === product.categoryId &&
        p.isActive,
    )
    .slice(0, 4);

  return (
    <Container className="py-8 lg:py-14">
      <ProductJsonLd
        product={product}
        url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com"}/urun/${product.slug}`}
      />
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-muted"
      >
        <Link href="/" className="hover:text-foreground">
          Ana
        </Link>
        <ChevronRight className="h-3 w-3" strokeWidth={2.2} />
        <Link href="/magaza" className="hover:text-foreground">
          Mağaza
        </Link>
        {category && (
          <>
            <ChevronRight className="h-3 w-3" strokeWidth={2.2} />
            <Link
              href={`/magaza?kategori=${category.slug}`}
              className="hover:text-foreground"
            >
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" strokeWidth={2.2} />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <ProductGallery media={product.media} productName={product.name} />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {product.brand && (
              <p className="text-xs font-medium uppercase tracking-wider text-subtle">
                {product.brand}
              </p>
            )}
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {product.name}
            </h1>
            <p className="text-sm text-muted">{product.shortDescription}</p>

            {product.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {product.badges.map((badge) => (
                  <ProductBadgeChip key={badge} badge={badge} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold tracking-tight">
                {formatPrice(product.currentPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-subtle line-through">
                    {formatPrice(product.compareAtPrice!)}
                  </span>
                  <span className="rounded-md bg-danger px-1.5 py-0.5 text-xs font-bold text-white">
                    −%{discountPercent}
                  </span>
                </>
              )}
            </div>
            <div className="mt-2">
              <StockStatus
                stockQuantity={product.stockQuantity}
                lowStockThreshold={product.lowStockThreshold}
              />
            </div>
            <div className="mt-5">
              <AddToCart product={product} />
            </div>
          </div>

          {product.technicalSpecs &&
            Object.keys(product.technicalSpecs).length > 0 && (
              <div className="rounded-2xl border border-border bg-surface">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-sm font-semibold tracking-tight">
                    Teknik Özellikler
                  </h2>
                </div>
                <dl className="divide-y divide-border">
                  {Object.entries(product.technicalSpecs).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
                    >
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
        </div>
      </div>

      {product.longDescription && (
        <section className="mt-16 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">
            Detaylı Açıklama
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
            {product.longDescription}
          </p>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight">
            Benzer Ürünler
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
