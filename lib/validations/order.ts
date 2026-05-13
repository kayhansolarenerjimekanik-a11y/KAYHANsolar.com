import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  imageUrl: z.string().optional(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  shippingCost: z.number().nonnegative(),
  total: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  appliedCampaignIds: z.array(z.string()),
  customerName: z.string().min(3),
  customerPhone: z.string().min(10),
  customerEmail: z.string().email().optional(),
  shippingAddress: z.object({
    city: z.string().min(1),
    district: z.string().min(1),
    detailedAddress: z.string().min(10),
  }),
  captchaToken: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
