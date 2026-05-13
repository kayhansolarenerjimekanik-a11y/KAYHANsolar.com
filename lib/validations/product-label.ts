import { z } from "zod";

export const productLabelColors = ["lime", "red", "yellow", "blue", "purple", "gray"] as const;

export const labelInputSchema = z.object({
  name: z.string().trim().min(2, "En az 2 karakter").max(30, "En fazla 30 karakter"),
  color: z.enum(productLabelColors),
});

export type LabelInput = z.infer<typeof labelInputSchema>;
