import { Trash2 } from "lucide-react";

import { deleteKnowledgeAction } from "@/app/(admin)/kayhan-yonetim/actions/ai-knowledge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listChunks } from "@/lib/ai-knowledge/repository";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function AIKnowledgeList() {
  const chunks = await listChunks();

  const groups = new Map<string, typeof chunks>();
  for (const c of chunks) {
    const existing = groups.get(c.title) ?? [];
    existing.push(c);
    groups.set(c.title, existing);
  }

  if (groups.size === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-elevated p-10 text-center text-sm text-muted">
        Henüz bilgi tabanı içeriği yok.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {Array.from(groups.entries()).map(([title, items]) => (
        <li
          key={title}
          className="space-y-2 rounded-2xl border border-border bg-surface p-4"
        >
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-subtle">
                {items.length} parça · son eklenen {formatDate(items[0].createdAt)}
              </p>
            </div>
            <Badge tone="lime">{items[0].sourceType}</Badge>
          </header>
          <details className="text-xs text-muted">
            <summary className="cursor-pointer text-foreground">
              İçeriği göster
            </summary>
            <ul className="mt-2 space-y-2">
              {items.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-elevated p-3"
                >
                  <p className="flex-1 whitespace-pre-wrap text-foreground">
                    {c.content}
                  </p>
                  <form action={deleteKnowledgeAction.bind(null, c.id)}>
                    <Button type="submit" variant="ghost" size="sm" aria-label="Parçayı sil">
                      <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}
