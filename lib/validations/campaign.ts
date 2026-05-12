import { z } from "zod";

export const campaignInputSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  title: z.string().min(3, "Başlık zorunlu"),
  description: z.string().optional(),
  bannerImageUrl: z.string().url().optional().or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  ctaLabel: z.string().max(40).optional().or(z.literal("")),
  ctaSecondaryLabel: z.string().max(40).optional().or(z.literal("")),
  ruleType: z.enum([
    "percent_off",
    "buy_x_get_y_discount",
    "bundle_discount",
    "free_shipping",
    "fixed_amount_off",
  ]),
  ruleConfig: z.record(z.string(), z.unknown()).default({}),
  applicableTo: z.enum(["all", "category", "product"]).default("all"),
  targetIds: z.array(z.string()).default([]),
  startDate: z.string().datetime({ offset: true }).or(z.string().min(8)),
  endDate: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
  displayOnHomepage: z.coerce.boolean().default(false),
  displayPriority: z.coerce.number().int().default(0),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;
