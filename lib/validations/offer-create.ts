// lib/validations/offer-create.ts
import { z } from "zod";

export const offerCreateSchema = z.object({
  fullName: z.string().min(3, "Ad soyad zorunlu").max(120),
  phone: z
    .string()
    .regex(/^[0-9+\s()-]{10,20}$/, "Geçerli bir telefon numarası girin"),
  email: z
    .string()
    .email("Geçerli e-posta girin")
    .optional()
    .or(z.literal("")),
  city: z.string().min(2, "İl seçin"),
  district: z.string().min(2, "İlçe yazın").max(80),
  installationLocation: z.enum(["roof", "land", "other"]),
  installationAddress: z
    .string()
    .min(5, "Kurulum adresini açıklayın")
    .max(500),
  appliances: z
    .array(
      z.object({
        name: z.string().min(2, "Cihaz adı"),
        powerW: z.coerce.number().nonnegative().optional(),
        voltage: z.coerce.number().nonnegative().optional(),
      }),
    )
    .default([]),
  detailedDescription: z
    .string()
    .min(10, "En az 10 karakter")
    .max(2000, "En fazla 2000 karakter"),
});

export type OfferCreateInput = z.infer<typeof offerCreateSchema>;
