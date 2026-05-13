"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ALL_LABEL_COLORS, labelColorClasses } from "@/lib/products/label-colors";
import { cn } from "@/lib/utils";
import type { ProductLabel, ProductLabelColor } from "@/types";

import type { LabelActionState } from "@/app/(admin)/kayhan-yonetim/actions/labels";

interface LabelFormProps {
  initial?: ProductLabel;
  action: (state: LabelActionState, fd: FormData) => Promise<LabelActionState>;
  submitLabel: string;
}

export function LabelForm({ initial, action, submitLabel }: LabelFormProps) {
  const [state, formAction, pending] = useActionState<LabelActionState, FormData>(
    action,
    {},
  );
  const [color, setColor] = useState<ProductLabelColor>(initial?.color ?? "lime");

  const errFor = (f: string) => state.fieldErrors?.[f];

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="name">Etiket adı</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name}
          maxLength={30}
          required
        />
        {errFor("name") && (
          <p className="text-xs text-danger">{errFor("name")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Renk</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              aria-pressed={color === c}
              className={cn(
                "h-10 w-10 rounded-md ring-2 transition-all",
                labelColorClasses(c),
                color === c ? "ring-foreground" : "ring-transparent",
              )}
            />
          ))}
        </div>
        <input type="hidden" name="color" value={color} />
        {errFor("color") && (
          <p className="text-xs text-danger">{errFor("color")}</p>
        )}
      </div>

      {state.error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/kayhan-yonetim/etiketler">
          <Button type="button" variant="outline">İptal</Button>
        </Link>
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" strokeWidth={2.4} />
          {pending ? "Kaydediliyor..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
