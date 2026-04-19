// @ts-ignore: 取消 Deno import 在 IDE 找不到模組的問題
import { z } from "zod";

const positiveIdSchema = z.coerce.number().int().positive("ID 必須為正整數");
const optionalTrimmed = z.string().optional().transform((v: unknown) =>
  typeof v === "string" ? v.trim() : v
);
const optionalBoolSchema = z.union([z.boolean(), z.string(), z.number()])
  .optional().transform((v: unknown) => {
    if (v === undefined) return undefined;
    return v === true || v === "true" || v === 1 || v === "1";
  });

export const productSchema = z.object({
  id: positiveIdSchema.optional(),
  category: z.string().trim().min(1, "分類不能為空"),
  name: z.string().trim().min(1, "商品名稱不能為空"),
  description: optionalTrimmed,
  price: z.coerce.number().nonnegative(),
  weight: optionalTrimmed,
  origin: optionalTrimmed,
  roastLevel: optionalTrimmed,
  specs: optionalTrimmed,
  imageUrl: optionalTrimmed,
  enabled: optionalBoolSchema,
});

export const categorySchema = z.object({
  id: positiveIdSchema.optional(),
  name: z.string().trim().min(1, "分類名稱不能為空"),
});

export const settingSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]).transform((
    v: unknown,
  ) => v === null ? "" : String(v)),
);

export const updateSettingsSchema = z.object({
  settings: settingSchema,
});

export const promotionSchema = z.object({
  id: positiveIdSchema.optional(),
  name: z.string().trim().min(1, "活動名稱不能為空"),
  type: z.string().default("bundle"),
  targetProductIds: z.any().optional(), // 保留相容
  targetItems: z.any().optional(),
  minQuantity: z.coerce.number().min(1).default(1),
  discountType: z.enum(["percent", "amount"]),
  discountValue: z.coerce.number().min(0),
  enabled: optionalBoolSchema,
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

export const reorderIdsSchema = z.object({
  ids: z.array(positiveIdSchema).min(1, "缺少排序資料"),
});

export const reorderProductSchema = z.object({
  id: positiveIdSchema,
  direction: z.enum(["top", "bottom", "up", "down"], {
    error: "direction 無效",
  }),
});

export const deleteByIdSchema = z.object({
  id: positiveIdSchema,
});

export const addFormFieldSchema = z.object({
  section: optionalTrimmed,
  fieldKey: z.string().trim().min(1, "欄位識別碼不能為空"),
  label: z.string().trim().min(1, "欄位名稱不能為空"),
  fieldType: optionalTrimmed,
  placeholder: optionalTrimmed,
  options: optionalTrimmed,
  required: optionalBoolSchema,
  enabled: optionalBoolSchema,
  deliveryVisibility: z.union([z.string(), z.null()]).optional(),
});

export const updateFormFieldSchema = z.object({
  id: positiveIdSchema,
  label: z.string().trim().min(1, "欄位名稱不能為空").optional(),
  fieldType: z.string().trim().min(1, "欄位類型不能為空").optional(),
  placeholder: optionalTrimmed,
  options: optionalTrimmed,
  required: optionalBoolSchema,
  enabled: optionalBoolSchema,
  section: z.string().trim().min(1, "section 不能為空").optional(),
  deliveryVisibility: z.union([z.string(), z.null()]).optional(),
}).refine(
  (data: Record<string, unknown>) => Object.keys(data).some((k) => k !== "id"),
  {
    message: "沒有可更新的欄位",
  },
);

export const deleteFormFieldSchema = z.object({
  id: positiveIdSchema,
});

export const addBankAccountSchema = z.object({
  bankCode: z.string().trim().min(1, "缺少銀行代碼"),
  bankName: z.string().trim().min(1, "缺少銀行名稱"),
  accountNumber: z.string().trim().min(1, "缺少帳號"),
  accountName: optionalTrimmed,
});

export const updateBankAccountSchema = z.object({
  id: positiveIdSchema,
  bankCode: z.string().trim().min(1, "bankCode 不能為空").optional(),
  bankName: z.string().trim().min(1, "bankName 不能為空").optional(),
  accountNumber: z.string().trim().min(1, "accountNumber 不能為空").optional(),
  accountName: optionalTrimmed,
  enabled: optionalBoolSchema,
}).refine(
  (data: Record<string, unknown>) => Object.keys(data).some((k) => k !== "id"),
  {
    message: "沒有可更新的欄位",
  },
);

export const deleteBankAccountSchema = z.object({
  id: positiveIdSchema,
});
