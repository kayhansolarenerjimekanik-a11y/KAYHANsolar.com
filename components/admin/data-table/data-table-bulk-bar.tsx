// components/admin/data-table/data-table-bulk-bar.tsx
"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BulkAction } from "./types";

interface Props<T> {
  selected: T[];
  actions: BulkAction<T>[];
  onClear: () => void;
}

export function DataTableBulkBar<T>({ selected, actions, onClear }: Props<T>) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<BulkAction<T> | null>(null);

  if (selected.length === 0) return null;

  const run = async (action: BulkAction<T>) => {
    setPending(action.id);
    try {
      await action.run(selected);
      onClear();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      toast.error(`İşlem başarısız: ${msg}`);
    } finally {
      setPending(null);
      setConfirmFor(null);
    }
  };

  return (
    <>
      <div className="sticky bottom-4 z-20 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5 shadow-lg">
        <span className="text-sm font-medium tabular-nums">
          {selected.length} seçili
        </span>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md p-1 text-muted hover:bg-elevated"
          aria-label="Seçimi temizle"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.id}
                type="button"
                size="sm"
                variant={a.variant === "danger" ? "danger" : "outline"}
                disabled={pending !== null}
                onClick={() => (a.confirm ? setConfirmFor(a) : run(a))}
              >
                {Icon && <Icon className="h-4 w-4" strokeWidth={2.2} />}
                {a.label}
              </Button>
            );
          })}
        </div>
      </div>

      {confirmFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="text-base font-semibold">{confirmFor.confirm!.title}</h3>
            <p className="mt-2 text-sm text-muted">
              {confirmFor.confirm!.description(selected.length)}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmFor(null)}
                disabled={pending !== null}
              >
                Vazgeç
              </Button>
              <Button
                type="button"
                variant={confirmFor.variant === "danger" ? "danger" : "primary"}
                size="sm"
                onClick={() => run(confirmFor)}
                disabled={pending !== null}
                className={cn(pending === confirmFor.id && "opacity-70")}
              >
                {confirmFor.confirm!.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
