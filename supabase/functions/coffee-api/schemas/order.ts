import { z } from "https://deno.land/x/zod/mod.ts";

export const orderItemSchema = z.object({
  productId: z.number(),
  specKey: z.string().optional(),
  qty: z.number().int().positive(),
});

export const submitOrderSchema = z.object({
  lineName: z.string().min(1, "姓名不能為空"),
  phone: z.string().min(8, "電話號碼格式不正確"),
  email: z.string().email("Email 格式不正確").optional().or(z.literal("")),
  items: z.array(orderItemSchema).min(1, "購物車是空的"),
  deliveryMethod: z.enum([
    "delivery",
    "home_delivery",
    "seven_eleven",
    "family_mart",
    "in_store",
  ]),
  paymentMethod: z.enum(["cod", "linepay", "transfer"]),
  city: z.string().optional(),
  district: z.string().optional(),
  address: z.string().optional(),
  storeId: z.string().optional(),
  storeName: z.string().optional(),
  storeAddress: z.string().optional(),
  note: z.string().optional(),
  customFields: z.string().optional(),
  transferTargetAccount: z.string().optional(),
  transferAccountLast5: z.string().optional().refine(
    (v: string | undefined) => !v || /^\d{5}$/.test(v),
    "帳號末五碼應為5位數字",
  ),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  paymentStatus: z.string().optional(),
  trackingNumber: z.string().optional(),
});
