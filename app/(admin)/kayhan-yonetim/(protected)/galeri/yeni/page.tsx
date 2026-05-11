import Link from "next/link";

import { GalleryCreateForm } from "@/components/admin/gallery-form";

export default function NewGalleryPostPage() {
  return (
    <div className="space-y-6">
      <header>
        <Link href="/kayhan-yonetim/galeri" className="text-xs text-muted hover:text-foreground">
          ← Galeriye dön
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Yeni Proje</h1>
      </header>
      <GalleryCreateForm />
    </div>
  );
}
