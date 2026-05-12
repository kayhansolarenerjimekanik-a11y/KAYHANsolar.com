// app/(admin)/kayhan-yonetim/(protected)/urunler/loading.tsx
import { DataTableSkeleton } from "@/components/admin/data-table/data-table-skeleton";

export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      <header>
        <div className="h-7 w-32 animate-pulse rounded-md bg-elevated" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded-md bg-elevated" />
      </header>
      <div className="space-y-3">
        <div className="h-10 w-full max-w-md animate-pulse rounded-xl bg-elevated" />
        <div className="flex gap-2">
          <div className="h-9 w-40 animate-pulse rounded-xl bg-elevated" />
          <div className="h-9 w-40 animate-pulse rounded-xl bg-elevated" />
        </div>
      </div>
      <DataTableSkeleton columns={9} />
    </div>
  );
}
