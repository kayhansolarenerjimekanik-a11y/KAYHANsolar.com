import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı"),
});

export type SignInInput = z.infer<typeof signInSchema>;
