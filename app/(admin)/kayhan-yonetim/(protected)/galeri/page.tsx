import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { deleteGalleryAction } from "@/app/(admin)/kayhan-yonetim/actions/gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { repo } from "@/lib/data";

export default async function AdminGalleryPage() {
  const posts = await repo.listGalleryPosts();
  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Galeri / Projeler</h1>
          <p className="mt-1 text-sm text-muted">{posts.length} proje</p>
        </div>
        <Link href="/kayhan-yonetim/galeri/yeni">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Yeni Proje
          </Button>
        </Link>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <div className="relative aspect-[4/3] bg-elevated">
              {p.media[0]?.url && (
                <Image
                  src={p.media[0].url}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              )}
              {p.isFeatured && (
                <div className="absolute right-3 top-3">
                  <Badge tone="lime">Öne Çıkan</Badge>
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <p className="text-sm font-semibold">{p.title}</p>
              {p.location && (
                <p className="text-xs text-muted">{p.location}</p>
              )}
              <div className="flex items-center justify-end">
                <form action={deleteGalleryAction.bind(null, p.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    <Trash2 className="h-3.5 w-3.5 text-danger" strokeWidth={2.2} />
                    Sil
                  </Button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
