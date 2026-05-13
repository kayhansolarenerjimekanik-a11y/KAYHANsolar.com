import Link from "next/link";

import { createProductAction } from "@/app/(admin)/kayhan-yonetim/actions/products";
import { ProductForm } from "@/components/admin/product-form";
import { repo } from "@/lib/data";

export default async function NewProductPage() {
  const [categories, allLabels] = await Promise.all([
    repo.listCategories(),
    repo.listProductLabels(),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/kayhan-yonetim/urunler"
          className="text-xs text-muted hover:text-foreground"
        >
          ← Ürünlere dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Yeni Ürün
        </h1>
      </header>
      <ProductForm
        categories={categories}
        allLabels={allLabels}
        action={createProductAction}
        submitLabel="Ürünü Kaydet"
      />
    </div>
  );
}
