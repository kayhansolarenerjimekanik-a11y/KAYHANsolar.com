import { z } from "zod";

const mediaSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["image", "video"]),
  url: z.string().url("Geçerli URL girin"),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  caption: z.string().optional(),
});

export const galleryInputSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  description: z.string().optional(),
  location: z.string().optional(),
  installationDate: z.string().optional(),
  systemPowerKw: z.coerce.number().nonnegative().optional(),
  media: z.array(mediaSchema).min(1, "En az 1 medya ekleyin"),
  isFeatured: z.coerce.boolean().default(false),
});

export type GalleryInput = z.infer<typeof galleryInputSchema>;
