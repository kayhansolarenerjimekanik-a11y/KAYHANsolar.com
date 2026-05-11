import type { MetadataRoute } from "next";

import { repo } from "@/lib/data";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kayhansolar.com";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  "",
  "/magaza",
  "/teklif-al",
  "/galeri",
  "/hakkimizda",
  "/sss",
  "/iletisim",
  "/kvkk",
  "/gizlilik",
  "/cerez-politikasi",
  "/mesafeli-satis",
  "/iade",
].map((path) => ({
  url: `${SITE_URL}${path}`,
  lastModified: new Date(),
  changeFrequency: "weekly",
  priority: path === "" ? 1.0 : 0.5,
}));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, gallery] = await Promise.all([
    repo.listProducts(),
    repo.listGalleryPosts(),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.isActive)
    .map((p) => ({
      url: `${SITE_URL}/urun/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const galleryRoutes: MetadataRoute.Sitemap = gallery.map((g) => ({
    url: `${SITE_URL}/galeri/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...STATIC_ROUTES, ...productRoutes, ...galleryRoutes];
}
