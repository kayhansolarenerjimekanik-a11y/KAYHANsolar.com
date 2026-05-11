import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { Container } from "@/components/ui/container";
import { mockProducts } from "@/lib/mock/data";

export function FeaturedProducts() {
  const featured = mockProducts.filter((p) => p.isFeatured).slice(0, 8);

  return (
    <section className="border-t border-border">
      <Container className="py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Öne Çıkan Ürünler
            </h2>
            <p className="mt-2 text-muted">
              Müşterilerimizin en çok tercih ettiği ürünler.
            </p>
          </div>
          <Link
            href="/magaza"
            className="hidden items-center gap-1 text-sm font-medium text-foreground hover:text-lime-dark sm:inline-flex dark:hover:text-lime-primary"
          >
            Tümünü Gör
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
