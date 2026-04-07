import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.number(),
  specKey: z.string().optional(),
  qty: z.number().int().positive(),
});

const receiptInfoSchema = z.object({
  buyer: z.string().trim().optional().default(""),
  taxId: z.string().trim().regex(/^\d{8}$/, "統一編號需為 8 碼數字"),
  address: z.string().trim().optional().default(""),
  needDateStamp: z.boolean().optional().default(false),
});

export const submitOrderSchema = z.object({
  lineName: z.string().min(1, "姓名不能為空"),
  phone: z.string().optional().or(z.literal("")),
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
  receiptInfo: receiptInfoSchema.optional(),
  transferTargetAccount: z.string().optional(),
  transferAccountLast5: z.string().optional().refine(
    (v: string | undefined) => !v || /^\d{5}$/.test(v),
    "帳號末五碼應為5位數字",
  ),
});

export const quoteOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "購物車是空的"),
  deliveryMethod: z.enum([
    "delivery",
    "home_delivery",
    "seven_eleven",
    "family_mart",
    "in_store",
  ]).optional(),
  paymentMethod: z.enum(["cod", "linepay", "transfer"]).optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "缺少訂單編號"),
  status: z.enum([
    "pending",
    "processing",
    "shipped",
    "completed",
    "cancelled",
  ]),
  paymentStatus: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingProvider: z.string().optional(),
  trackingUrl: z.string().optional(),
});

export const deleteOrderSchema = z.object({
  orderId: z.string().min(1, "缺少訂單編號"),
});

export const batchUpdateOrderStatusSchema = z.object({
  orderIds: z.array(z.string().min(1, "缺少訂單編號")).min(
    1,
    "請至少選擇一筆訂單",
  )
    .max(200, "單次最多處理 200 筆"),
  status: z.enum([
    "pending",
    "processing",
    "shipped",
    "completed",
    "cancelled",
  ]),
  paymentStatus: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingProvider: z.string().optional(),
  trackingUrl: z.string().optional(),
});

export const batchDeleteOrdersSchema = z.object({
  orderIds: z.array(z.string().min(1, "缺少訂單編號")).min(
    1,
    "請至少選擇一筆訂單",
  )
    .max(200, "單次最多處理 200 筆"),
});
