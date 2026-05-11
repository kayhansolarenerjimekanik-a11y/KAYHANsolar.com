import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { repo } from "@/lib/data";
import { formatPrice } from "@/lib/utils";

export default async function AdminProductListPage() {
  const [products, categories] = await Promise.all([
    repo.listProducts(),
    repo.listCategories(),
  ]);
  const categoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ürünler</h1>
          <p className="mt-1 text-sm text-muted">{products.length} ürün</p>
        </div>
        <Link href="/kayhan-yonetim/urunler/yeni">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Ürün
          </Button>
        </Link>
      </header>

      <Table>
        <THead>
          <TR>
            <TH className="w-16">Görsel</TH>
            <TH>Ürün</TH>
            <TH className="hidden md:table-cell">Kategori</TH>
            <TH className="text-right">Fiyat</TH>
            <TH className="text-right">Stok</TH>
            <TH className="hidden sm:table-cell">Durum</TH>
            <TH className="w-32 text-right">İşlem</TH>
          </TR>
        </THead>
        <TBody>
          {products.map((p) => (
            <TR key={p.id}>
              <TD>
                <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-elevated">
                  {p.media[0]?.url && (
                    <Image
                      src={p.media[0].url}
                      alt={p.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  )}
                </div>
              </TD>
              <TD>
                <Link
                  href={`/kayhan-yonetim/urunler/${p.id}`}
                  className="font-medium hover:text-lime-dark dark:hover:text-lime-primary"
                >
                  {p.name}
                </Link>
                {p.brand && (
                  <p className="text-xs text-subtle">{p.brand}</p>
                )}
              </TD>
              <TD className="hidden md:table-cell text-muted">
                {categoryName(p.categoryId)}
              </TD>
              <TD className="text-right tabular-nums">
                {formatPrice(p.currentPrice)}
              </TD>
              <TD className="text-right tabular-nums">
                {p.stockQuantity === 0 ? (
                  <span className="text-danger">0</span>
                ) : p.stockQuantity <= p.lowStockThreshold ? (
                  <span className="text-warning">{p.stockQuantity}</span>
                ) : (
                  p.stockQuantity
                )}
              </TD>
              <TD className="hidden sm:table-cell">
                {p.isActive ? (
                  <Badge tone="success">Aktif</Badge>
                ) : (
                  <Badge tone="neutral">Pasif</Badge>
                )}
              </TD>
              <TD>
                <ProductRowActions productId={p.id} productName={p.name} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
