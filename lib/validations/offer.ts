import { z } from "zod";

export const offerStatusSchema = z.enum([
  "new",
  "in_review",
  "responded",
  "closed",
]);

export const offerUpdateSchema = z.object({
  status: offerStatusSchema,
  adminNotes: z.string().optional(),
  adminResponse: z.string().optional(),
});

export type OfferUpdateInput = z.infer<typeof offerUpdateSchema>;
