"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  type CategoryActionState,
} from "@/app/(admin)/kayhan-yonetim/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
}

const initial: CategoryActionState = {};

export function CategoryManager({ categories }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          Yeni Kategori
        </Button>
      </div>

      {creating && (
        <CreateForm onDone={() => setCreating(false)} />
      )}

      <ul className="space-y-2">
        {categories.map((c) =>
          editing === c.id ? (
            <EditRow
              key={c.id}
              category={c}
              onDone={() => setEditing(null)}
            />
          ) : (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted">
                  /{c.slug} {c.description ? `· ${c.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(c.id)}
                  aria-label={`${c.name} düzenle`}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                </Button>
                <form action={deleteCategoryAction.bind(null, c.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    aria-label={`${c.name} sil`}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
                  </Button>
                </form>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(
    createCategoryAction,
    initial,
  );

  return (
    <form
      action={async (fd) => {
        await action(fd);
        if (!state.error) onDone();
      }}
      className="space-y-3 rounded-2xl border border-lime-primary/40 bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Yeni Kategori</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDone}
          aria-label="Kapat"
        >
          <X className="h-4 w-4" strokeWidth={2.2} />
        </Button>
      </div>
      <FormFields />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Kaydediliyor..." : "Ekle"}
      </Button>
    </form>
  );
}

function EditRow({ category, onDone }: { category: Category; onDone: () => void }) {
  const [state, action, pending] = useActionState<CategoryActionState, FormData>(
    updateCategoryAction.bind(null, category.id),
    initial,
  );

  return (
    <li>
      <form
        action={async (fd) => {
          await action(fd);
          if (!state.error) onDone();
        }}
        className="space-y-3 rounded-2xl border border-lime-primary/40 bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Düzenle</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDone}
            aria-label="Kapat"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </Button>
        </div>
        <FormFields initial={category} />
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Kaydediliyor..." : "Güncelle"}
        </Button>
      </form>
    </li>
  );
}

function FormFields({ initial }: { initial?: Category }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="name">Ad</Label>
        <Input id="name" name="name" required defaultValue={initial?.name ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required defaultValue={initial?.slug ?? ""} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="description">Açıklama</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="displayOrder">Sıralama</Label>
        <Input
          id="displayOrder"
          name="displayOrder"
          type="number"
          step="1"
          defaultValue={initial?.displayOrder ?? 0}
        />
      </div>
    </div>
  );
}
