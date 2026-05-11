import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { repo } from "@/lib/data";

export const metadata: Metadata = {
  title: "Galeri ve Projeler",
  description:
    "Tamamladığımız güneş enerjisi kurulumlarından örnekler ve referanslar.",
};

export default async function GalleryPage() {
  const posts = await repo.listGalleryPosts();

  return (
    <Container className="py-10 lg:py-14">
      <header className="flex flex-col gap-2 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Galeri ve Projeler
        </h1>
        <p className="max-w-2xl text-muted">
          Konut, tarım ve işletme için tamamladığımız sistemlerden örnekler.
          Detaylı proje sayfaları Faz 4&apos;te eklenecek.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/galeri/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-1 hover:border-lime-primary hover:shadow-xl hover:shadow-lime-primary/10"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-elevated">
              {post.media[0] && (
                <Image
                  src={post.media[0].url}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {post.systemPowerKw && (
                <div className="absolute right-3 top-3 rounded-md bg-lime-primary px-2 py-0.5 text-xs font-bold text-black">
                  {post.systemPowerKw} kW
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <h2 className="text-base font-semibold tracking-tight">
                {post.title}
              </h2>
              <p className="line-clamp-2 text-sm text-muted">
                {post.description}
              </p>
              {post.location && (
                <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-subtle">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {post.location}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </Container>
  );
}
