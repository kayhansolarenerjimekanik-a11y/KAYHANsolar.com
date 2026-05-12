import { ArrowLeft, CalendarDays, MapPin, Zap } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { repo } from "@/lib/data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await repo.listGalleryPosts({ onlyActive: true });
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await repo.getGalleryPostBySlug(slug);
  if (!post) return { title: "Proje bulunamadı" };
  return {
    title: post.title,
    description:
      post.description ?? `${post.location ?? "Türkiye"} — ${post.title}`,
    openGraph: {
      title: post.title,
      description: post.description,
      images: post.media[0]?.url ? [{ url: post.media[0].url }] : undefined,
    },
  };
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function GalleryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await repo.getGalleryPostBySlug(slug);
  if (!post) notFound();

  return (
    <Container className="py-10 lg:py-14">
      <Link
        href="/galeri"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
        Galeriye dön
      </Link>

      <header className="mt-4 max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          {post.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" strokeWidth={2.2} />
              {post.location}
            </span>
          )}
          {post.installationDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" strokeWidth={2.2} />
              {formatDate(post.installationDate)}
            </span>
          )}
          {post.systemPowerKw !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-lime-primary/15 px-2 py-0.5 text-xs font-semibold text-lime-dark dark:text-lime-primary">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.4} />
              {post.systemPowerKw} kW
            </span>
          )}
        </div>
        {post.description && (
          <p className="text-base leading-relaxed text-muted">
            {post.description}
          </p>
        )}
      </header>

      {post.media.length > 0 && (
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {post.media.map((m) => (
            <div
              key={m.id}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-elevated"
            >
              {m.type === "image" ? (
                <Image
                  src={m.url}
                  alt={m.altText ?? post.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <video
                  src={m.url}
                  controls
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          ))}
        </section>
      )}

      <section className="mt-16 rounded-3xl border border-border bg-surface p-8 sm:p-12">
        <div className="grid items-center gap-6 sm:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Benzer bir sistem ister misiniz?
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted">
              Saha ölçümü ve teklif tamamen ücretsiz. Cihaz listenizi
              paylaşmanız yeterli, gerisini biz hesaplayalım.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <Link href="/teklif-al">
              <Button size="lg" variant="primary">
                Teklif Al
              </Button>
            </Link>
            <Link href="/iletisim">
              <Button size="lg" variant="outline">
                İletişim
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Container>
  );
}
