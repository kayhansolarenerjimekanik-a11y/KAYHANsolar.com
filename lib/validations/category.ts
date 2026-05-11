import { z } from "zod";

export const categoryInputSchema = z.object({
  name: z.string().min(2, "Kategori adı zorunlu"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug yalnızca küçük harf, rakam ve tire içermeli"),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
  iconUrl: z.string().url().optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().default(0),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
