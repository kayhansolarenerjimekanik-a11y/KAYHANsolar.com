// app/(admin)/kayhan-yonetim/(protected)/urunler/error.tsx
"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Urunler sayfasi hatasi:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ürünler</h1>
      </header>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-10 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-danger/10 text-danger">
          <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <p className="text-sm font-semibold text-foreground">Ürünler yüklenirken bir hata oluştu</p>
        <p className="text-sm text-muted">{error.message || "Bilinmeyen hata"}</p>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          <RefreshCcw className="h-4 w-4" strokeWidth={2.2} />
          Yeniden Dene
        </Button>
      </div>
    </div>
  );
}
