import type { Product } from "@/types";

interface Props {
  product: Product;
  url: string;
}

export function ProductJsonLd({ product, url }: Props) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.id,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    image: product.media
      .filter((m) => m.type === "image")
      .map((m) => m.url),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "TRY",
      price: product.currentPrice,
      availability:
        product.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
