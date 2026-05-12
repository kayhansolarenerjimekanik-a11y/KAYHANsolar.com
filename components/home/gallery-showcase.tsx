import { ArrowRight, MapPin, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { repo } from "@/lib/data";

const MAX_POSTS = 5;

export async function GalleryShowcase() {
  const posts = await repo.listGalleryPosts({ onlyActive: true });
  const featured = posts
    .filter((p) => p.isFeatured)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, MAX_POSTS);

  if (featured.length === 0) return null;

  return (
    <section className="border-t border-border">
      <Container className="py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Bizden Projeler
            </h2>
            <p className="mt-2 text-muted">
              Türkiye genelinde tamamladığımız güneş enerjisi kurulumları.
            </p>
          </div>
          <Link
            href="/galeri"
            className="hidden items-center gap-1 text-sm font-medium text-foreground hover:text-lime-dark sm:inline-flex dark:hover:text-lime-primary"
          >
            Tümünü Gör
            <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:grid-rows-2 lg:[grid-auto-flow:dense]">
          {featured.map((post, i) => {
            const cover = post.media.find((m) => m.type === "image");
            const big = i === 0;
            return (
              <Link
                key={post.id}
                href={`/galeri/${post.slug}`}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-elevated transition-transform hover:-translate-y-0.5 ${
                  big ? "lg:col-span-2 lg:row-span-2" : ""
                }`}
              >
                <div className={`relative ${big ? "aspect-[4/3] lg:aspect-auto lg:h-full" : "aspect-[4/3]"}`}>
                  {cover ? (
                    <Image
                      src={cover.url}
                      alt={cover.altText ?? post.title}
                      fill
                      sizes={big ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 1024px) 100vw, 33vw"}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-black/70 text-white/60 text-sm">
                      {post.title}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity group-hover:from-black/90" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className={`font-semibold tracking-tight text-white ${big ? "text-xl sm:text-2xl" : "text-base"}`}>
                    {post.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/85">
                    {post.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" strokeWidth={2.2} />
                        {post.location}
                      </span>
                    )}
                    {post.systemPowerKw && (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3" strokeWidth={2.2} />
                        {post.systemPowerKw} kW
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
