"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SpecsEditorProps {
  name: string;
  initial: Record<string, string>;
}

export function SpecsEditor({ name, initial }: SpecsEditorProps) {
  const [rows, setRows] = useState<Array<[string, string]>>(
    Object.entries(initial ?? {}),
  );

  const add = () => setRows((r) => [...r, ["", ""]]);
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateKey = (i: number, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? [v, row[1]] : row)));
  const updateVal = (i: number, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? [row[0], v] : row)));

  const asObject = Object.fromEntries(rows.filter(([k]) => k.trim()));

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(asObject)} />
      {rows.map(([k, v], i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            placeholder="Özellik (örn. Güç)"
            value={k}
            onChange={(e) => updateKey(i, e.target.value)}
          />
          <Input
            placeholder="Değer (örn. 550W)"
            value={v}
            onChange={(e) => updateVal(i, e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Kaldır"
            onClick={() => remove(i)}
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" strokeWidth={2.2} />
        Özellik Ekle
      </Button>
    </div>
  );
}
