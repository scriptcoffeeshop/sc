import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.number(),
  specKey: z.string().optional(),
  qty: z.number().int().positive(),
});

const receiptInfoSchema = z.object({
  buyer: z.string().trim().optional().default(""),
  taxId: z.string().trim().optional().default("").refine(
    (value) => value === "" || /^\d{8}$/.test(value),
    "統一編號需為 8 碼數字",
  ),
  address: z.string().trim().optional().default(""),
  needDateStamp: z.boolean().optional().default(false),
});

const boolLikeOptionalSchema = z.union([z.boolean(), z.string(), z.number()])
  .optional().transform((value: unknown) => {
    if (value === undefined) return undefined;
    return value === true || value === "true" || value === 1 || value === "1";
  });

const lineFlexMessageSchema = z.object({
  type: z.literal("flex"),
  altText: z.string().trim().min(1, "Flex altText 不能為空"),
  contents: z.record(z.string(), z.unknown()),
});

const paymentStatusValues = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
] as const;

const paymentStatusSchema = z.union([
  z.enum(paymentStatusValues),
  z.literal(""),
]);

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
  paymentMethod: z.enum(["cod", "linepay", "jkopay", "transfer"]),
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
  idempotencyKey: z.string().trim().max(120, "重複送單識別碼過長").optional(),
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
  paymentMethod: z.enum(["cod", "linepay", "jkopay", "transfer"]).optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "缺少訂單編號"),
  status: z.enum([
    "pending",
    "processing",
    "shipped",
    "delivered",
    "completed",
    "failed",
    "cancelled",
  ]),
  cancelReason: z.string().optional(),
  paymentStatus: paymentStatusSchema.optional(),
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
    "delivered",
    "completed",
    "failed",
    "cancelled",
  ]),
  paymentStatus: paymentStatusSchema.optional(),
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

export const sendLineFlexMessageSchema = z.object({
  orderId: z.string().trim().min(1, "缺少訂單編號"),
  to: z.string().trim().min(1, "缺少 LINE 目標 ID").optional(),
  flexMessage: lineFlexMessageSchema,
  notificationDisabled: boolLikeOptionalSchema,
});

export const sendOrderEmailSchema = z.object({
  orderId: z.string().trim().min(1, "缺少訂單編號"),
  mode: z.enum([
    "confirmation",
    "processing",
    "shipping",
    "delivered",
    "completed",
    "failed",
    "cancelled",
  ])
    .optional(),
});
