import { z } from "zod";

const mediaSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["image", "video", "pdf"]),
  url: z.string().url("Geçerli bir URL girin"),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  altText: z.string().optional(),
});

export const productInputSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug en az 2 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içermeli"),
  name: z.string().min(2, "Ürün adı zorunlu"),
  shortDescription: z.string().min(5, "Kısa açıklama zorunlu").max(160),
  longDescription: z.string().optional(),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(320).optional(),
  technicalSpecs: z.record(z.string(), z.string()).optional(),
  categoryId: z.string().min(1, "Kategori seçin"),
  brand: z.string().optional(),
  supplierUrl: z.string().url().optional().or(z.literal("")),
  supplierPrice: z.coerce.number().nonnegative().optional(),
  markupPercentage: z.coerce.number().min(0).max(500).optional(),
  currentPrice: z.coerce.number().positive("Fiyat 0'dan büyük olmalı"),
  compareAtPrice: z.coerce.number().positive().optional(),
  stockQuantity: z.coerce.number().int().nonnegative(),
  lowStockThreshold: z.coerce.number().int().min(0).default(3),
  isActive: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
  isNewArrival: z.coerce.boolean().default(false),
  hasFreeShipping: z.coerce.boolean().default(false),
  warrantyYears: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.union([z.literal(null), z.number().int().min(0).max(20)]),
  ).default(null),
  media: z.array(mediaSchema).min(1, "En az 1 görsel ekleyin"),
});

export type ProductInput = z.infer<typeof productInputSchema>;
