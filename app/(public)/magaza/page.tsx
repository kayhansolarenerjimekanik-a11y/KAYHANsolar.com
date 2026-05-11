import type { Metadata } from "next";
import { Suspense } from "react";

import { ShopView } from "@/components/shop/shop-view";

export const metadata: Metadata = {
  title: "Mağaza",
  description:
    "Güneş panelleri, bataryalar, inverterler, aydınlatma ve paket sistemler.",
};

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopFallback />}>
      <ShopView />
    </Suspense>
  );
}

function ShopFallback() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-14 sm:px-6 lg:px-8">
      <div className="h-8 w-32 animate-pulse rounded-md bg-elevated" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-2xl border border-border bg-elevated"
          />
        ))}
      </div>
    </div>
  );
}
