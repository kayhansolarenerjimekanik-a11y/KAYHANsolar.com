// components/admin/data-table/data-table-pagination.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export function DataTablePagination({ page, total, pageSize, onChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted">
      <span className="tabular-nums">
        Sayfa <span className="font-semibold text-foreground">{page}</span> / {pageCount} ·{" "}
        <span className="tabular-nums">{total}</span> kayıt
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
          Önceki
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onChange(Math.min(pageCount, page + 1))}
        >
          Sonraki
          <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
        </Button>
      </div>
    </div>
  );
}
