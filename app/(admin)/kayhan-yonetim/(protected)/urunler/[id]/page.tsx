import Link from "next/link";
import { notFound } from "next/navigation";

import { updateProductAction } from "@/app/(admin)/kayhan-yonetim/actions/products";
import { ProductForm } from "@/components/admin/product-form";
import { repo } from "@/lib/data";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditPageProps) {
  const { id } = await params;
  const [product, categories, allLabels] = await Promise.all([
    repo.getProductById(id),
    repo.listCategories(),
    repo.listProductLabels(),
  ]);
  if (!product) notFound();

  const boundUpdate = updateProductAction.bind(null, id);

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
          Ürünü Düzenle
        </h1>
        <p className="mt-1 text-xs text-subtle">
          ID: <code className="font-mono">{product.id}</code>
        </p>
      </header>
      <ProductForm
        initial={product}
        categories={categories}
        allLabels={allLabels}
        action={boundUpdate}
        submitLabel="Değişiklikleri Kaydet"
      />
    </div>
  );
}
