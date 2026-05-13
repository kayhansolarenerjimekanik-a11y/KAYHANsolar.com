import { Plus } from "lucide-react";
import Link from "next/link";

import { CustomLabelChip } from "@/components/shop/custom-label-chip";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

import { deleteLabelAction } from "@/app/(admin)/kayhan-yonetim/actions/labels";

export default async function AdminLabelsPage() {
  const labels = await repo.listProductLabels();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Özel Etiketler</h1>
          <p className="text-sm text-muted">Müşterilere yönelik pazarlama etiketleri.</p>
        </div>
        <Link href="/kayhan-yonetim/etiketler/new">
          <Button variant="primary">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Etiket
          </Button>
        </Link>
      </header>

      {labels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-elevated p-10 text-center text-sm text-muted">
          Henüz etiket eklenmemiş.
        </div>
      ) : (
        <ul className="space-y-2">
          {labels.map((label) => (
            <li
              key={label.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <CustomLabelChip label={label} />
              <div className="flex items-center gap-2">
                <Link href={`/kayhan-yonetim/etiketler/${label.id}/duzenle`}>
                  <Button type="button" variant="outline" size="sm">
                    Düzenle
                  </Button>
                </Link>
                <form action={deleteLabelAction.bind(null, label.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                  >
                    Sil
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
