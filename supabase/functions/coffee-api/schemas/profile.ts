import { z } from "zod";
import { optionalEmailSchema } from "./email.ts";

const optionalTrimmed = z.string().optional().transform((v: unknown) =>
  typeof v === "string" ? v.trim() : v
);

export const updateUserProfileSchema = z.object({
  phone: optionalTrimmed,
  email: optionalEmailSchema,
  defaultCity: optionalTrimmed,
  defaultDistrict: optionalTrimmed,
  defaultAddress: optionalTrimmed,
  defaultDeliveryMethod: optionalTrimmed,
  defaultStoreId: optionalTrimmed,
  defaultStoreName: optionalTrimmed,
  defaultStoreAddress: optionalTrimmed,
  defaultPaymentMethod: z.union([
    z.enum(["cod", "linepay", "jkopay", "transfer"]),
    z.literal(""),
  ]).optional(),
  defaultTransferAccountLast5: z.union([
    z.string().regex(/^\d{5}$/, "匯款帳號末五碼格式不正確"),
    z.literal(""),
  ]).optional(),
  defaultCustomFields: z.union([
    z.string(),
    z.record(z.string(), z.unknown()),
  ]).optional(),
  defaultReceiptInfo: z.union([
    z.string(),
    z.record(z.string(), z.unknown()),
  ]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "沒有提供要更新的欄位",
});
