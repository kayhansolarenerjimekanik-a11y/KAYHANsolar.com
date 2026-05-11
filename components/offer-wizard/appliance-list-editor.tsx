"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WizardAppliance } from "@/types/offer-wizard";

interface Props {
  items: WizardAppliance[];
  onChange: (items: WizardAppliance[]) => void;
}

export function ApplianceListEditor({ items, onChange }: Props) {
  const add = () =>
    onChange([...items, { name: "", powerW: undefined, voltage: undefined }]);
  const remove = (idx: number) =>
    onChange(items.filter((_, i) => i !== idx));
  const update = (idx: number, patch: Partial<WizardAppliance>) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-elevated p-4 text-sm text-muted">
          Henüz cihaz eklemediniz. Eklemek isterseniz aşağıdan ekleyebilirsiniz.
          Bilmediğiniz değerleri boş bırakabilirsiniz; ekibimiz hesaplamayı
          tamamlar.
        </p>
      )}

      {items.map((it, i) => (
        <div
          key={i}
          className="grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-[1fr_140px_140px_auto]"
        >
          <Input
            placeholder="Cihaz (örn. Buzdolabı)"
            value={it.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Güç (W)"
            value={it.powerW ?? ""}
            onChange={(e) =>
              update(i, {
                powerW: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Voltaj (V)"
            value={it.voltage ?? ""}
            onChange={(e) =>
              update(i, {
                voltage: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cihazı kaldır"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" strokeWidth={2.2} />
        Cihaz Ekle
      </Button>
    </div>
  );
}
