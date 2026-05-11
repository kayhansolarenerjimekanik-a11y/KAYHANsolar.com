import { z } from "zod";

export const personalSchema = z.object({
  fullName: z.string().min(3, "Ad soyad zorunlu").max(120),
  city: z.string().min(2, "İl seçin"),
  district: z.string().min(2, "İlçe yazın").max(80),
  phone: z
    .string()
    .regex(/^[0-9+\s()-]{10,20}$/, "Geçerli bir telefon numarası girin"),
  email: z.string().email("Geçerli e-posta girin").optional().or(z.literal("")),
});

export const locationSchema = z.object({
  installationLocation: z.enum(["roof", "land", "other"]),
  installationAddress: z.string().min(5, "Kurulum adresini açıklayın").max(500),
  media: z
    .array(
      z.object({
        type: z.enum(["image", "video", "document"]),
        url: z.string().url("Geçerli URL girin"),
      }),
    )
    .max(7, "En fazla 7 medya"),
});

export const systemSchema = z.object({
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
    .min(20, "En az 20 karakterlik bir açıklama yazın")
    .max(2000, "En fazla 2000 karakter"),
});

export const confirmSchema = z.object({
  kvkkAccepted: z
    .literal(true, { message: "KVKK aydınlatma metnini onaylayın" }),
});

export const finalSubmitSchema = personalSchema
  .and(locationSchema)
  .and(systemSchema)
  .and(confirmSchema);

export type PersonalInput = z.infer<typeof personalSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type SystemInput = z.infer<typeof systemSchema>;
