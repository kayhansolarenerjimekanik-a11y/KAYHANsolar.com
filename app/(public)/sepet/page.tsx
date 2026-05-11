import type { Metadata } from "next";

import { CartView } from "@/components/shop/cart-view";
import { repo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Sepet",
};

export default async function CartPage() {
  const [settings, campaigns, products] = await Promise.all([
    repo.getSettings(),
    repo.listCampaigns(),
    repo.listProducts(),
  ]);

  const productCategoryById = Object.fromEntries(
    products.map((p) => [p.id, p.categoryId]),
  );

  return (
    <CartView
      settings={settings}
      campaigns={campaigns}
      productCategoryById={productCategoryById}
    />
  );
}
