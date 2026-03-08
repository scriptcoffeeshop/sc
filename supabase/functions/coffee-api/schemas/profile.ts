import { z } from "zod";

const optionalTrimmed = z.string().optional().transform((v) =>
  typeof v === "string" ? v.trim() : v
);

export const updateUserProfileSchema = z.object({
  phone: optionalTrimmed,
  email: z.union([z.string().email("Email 格式不正確"), z.literal("")])
    .optional(),
  defaultCity: optionalTrimmed,
  defaultDistrict: optionalTrimmed,
  defaultAddress: optionalTrimmed,
  defaultDeliveryMethod: optionalTrimmed,
  defaultStoreId: optionalTrimmed,
  defaultStoreName: optionalTrimmed,
  defaultStoreAddress: optionalTrimmed,
  defaultCustomFields: z.union([
    z.string(),
    z.record(z.unknown()),
  ]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "沒有提供要更新的欄位",
});
