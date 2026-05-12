import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

export default async function AdminProductListPage() {
  const [products, categories] = await Promise.all([
    repo.listProducts(),
    repo.listCategories(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ürünler"
        subtitle={`${products.length} ürün`}
        action={
          <Link href="/kayhan-yonetim/urunler/yeni">
            <Button size="sm">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              Yeni Ürün
            </Button>
          </Link>
        }
      />
      <ProductsTable allRows={products} categories={categories} />
    </div>
  );
}
