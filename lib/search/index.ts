import "server-only";

import { repo } from "@/lib/data";
import type { Category, GalleryPost, Product } from "@/types";

export interface ProductHit {
  kind: "product";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
}

export interface CategoryHit {
  kind: "category";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface GalleryHit {
  kind: "gallery";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  imageUrl?: string;
}

export type SearchHit = ProductHit | CategoryHit | GalleryHit;

export interface SearchResults {
  query: string;
  products: ProductHit[];
  categories: CategoryHit[];
  gallery: GalleryHit[];
  totalCount: number;
}

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

function matchesProduct(p: Product, terms: string[]): boolean {
  if (!p.isActive) return false;
  const haystack = normalize(
    [p.name, p.shortDescription, p.brand]
      .filter(Boolean)
      .join(" "),
  );
  return terms.every((t) => haystack.includes(t));
}

function matchesCategory(c: Category, terms: string[]): boolean {
  const haystack = normalize(`${c.name} ${c.description ?? ""} ${c.slug}`);
  return terms.every((t) => haystack.includes(t));
}

function matchesGallery(g: GalleryPost, terms: string[]): boolean {
  const haystack = normalize(
    `${g.title} ${g.description ?? ""} ${g.location ?? ""}`,
  );
  return terms.every((t) => haystack.includes(t));
}

export async function searchCatalog(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 2) {
    return { query: q, products: [], categories: [], gallery: [], totalCount: 0 };
  }
  const terms = normalize(q)
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  if (terms.length === 0) {
    return { query: q, products: [], categories: [], gallery: [], totalCount: 0 };
  }

  const [allProducts, allCategories, allGallery] = await Promise.all([
    repo.listProducts(),
    repo.listCategories({ onlyActive: true }),
    repo.listGalleryPosts({ onlyActive: true }),
  ]);

  const products = allProducts
    .filter((p) => matchesProduct(p, terms))
    .slice(0, 8)
    .map<ProductHit>((p) => ({
      kind: "product",
      id: p.id,
      title: p.name,
      subtitle: p.brand,
      href: `/urun/${p.slug}`,
      imageUrl: p.media[0]?.url,
    }));

  const categories = allCategories
    .filter((c) => matchesCategory(c, terms))
    .slice(0, 5)
    .map<CategoryHit>((c) => ({
      kind: "category",
      id: c.id,
      title: c.name,
      subtitle: c.description,
      href: `/magaza?kategori=${c.slug}`,
    }));

  const gallery = allGallery
    .filter((g) => matchesGallery(g, terms))
    .slice(0, 5)
    .map<GalleryHit>((g) => ({
      kind: "gallery",
      id: g.id,
      title: g.title,
      subtitle: g.location,
      href: `/galeri/${g.slug}`,
      imageUrl: g.media[0]?.url,
    }));

  return {
    query: q,
    products,
    categories,
    gallery,
    totalCount: products.length + categories.length + gallery.length,
  };
}
