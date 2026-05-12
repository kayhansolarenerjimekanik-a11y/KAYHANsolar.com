"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface Props {
  message?: string;
}

export function DataTableError({ message }: Props) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-danger/10 text-danger">
        <AlertTriangle className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <p className="text-sm font-semibold text-foreground">Bir hata oluştu</p>
      {message && <p className="text-sm text-muted">{message}</p>}
      <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
        <RefreshCcw className="h-4 w-4" strokeWidth={2.2} />
        Yeniden Dene
      </Button>
    </div>
  );
}
