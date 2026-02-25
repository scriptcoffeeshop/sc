import { z } from "https://deno.land/x/zod/mod.ts";

export const productSchema = z.object({
  id: z.number().optional(),
  category: z.string(),
  name: z.string().min(1, "商品名稱不能為空"),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  weight: z.string().optional(),
  origin: z.string().optional(),
  roastLevel: z.string().optional(),
  specs: z.string().optional(),
  imageUrl: z.string().optional(),
  enabled: z.union([z.boolean(), z.string()]).optional().transform((
    v: boolean | string,
  ) => v === true || v === "true"),
});

export const categorySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "分類名稱不能為空"),
});

export const settingSchema = z.record(z.string());

export const updateSettingsSchema = z.object({
  settings: settingSchema,
});

export const promotionSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "活動名稱不能為空"),
  type: z.string().default("bundle"),
  targetProductIds: z.any().optional(), // 保留相容
  targetItems: z.any().optional(),
  minQuantity: z.number().min(1).default(1),
  discountType: z.string(),
  discountValue: z.number().min(0),
  enabled: z.union([z.boolean(), z.string()]).optional().transform((
    v: boolean | string,
  ) => v === true || v === "true"),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});
