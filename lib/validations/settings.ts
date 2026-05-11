import { z } from "zod";

export const settingsInputSchema = z.object({
  contactPhone: z.string().min(7, "Geçerli telefon girin"),
  contactEmail: z.string().email(),
  whatsappNumber: z.string().regex(/^\d{10,15}$/, "Yalnızca rakam, ülke kodu dahil"),
  addressCity: z.string().min(2),
  addressFull: z.string().min(5),
  addressMapsUrl: z.string().url().optional().or(z.literal("")),
  socialInstagram: z.string().url().optional().or(z.literal("")),
  socialFacebook: z.string().url().optional().or(z.literal("")),
  socialYoutube: z.string().url().optional().or(z.literal("")),
  socialTwitter: z.string().url().optional().or(z.literal("")),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
