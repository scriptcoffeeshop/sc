import { z } from "zod";

const adminPermissionKeys = [
  "orders",
  "products",
  "categories",
  "promotions",
  "settings",
  "checkoutSettings",
  "iconLibrary",
  "formfields",
  "users",
  "blacklist",
] as const;

const adminPermissionsSchema = z.record(z.string(), z.boolean()).transform(
  (value) => {
    const allowed = new Set<string>(adminPermissionKeys);
    return Object.fromEntries(
      Object.entries(value).filter(([key, enabled]) =>
        allowed.has(key) && enabled === true
      ),
    );
  },
);

export const updateUserRoleSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
  newRole: z.enum(["USER", "ADMIN"], {
    error: "newRole 只能是 USER 或 ADMIN",
  }),
});

export const updateUserAdminNoteSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
  adminNote: z.string().max(2000, "備註最多 2000 字").optional().default(""),
});

export const updateUserPermissionsSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
  adminPermissions: adminPermissionsSchema,
});

export const deleteUserSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
});

export const addToBlacklistSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
  reason: z.string().trim().max(200, "封鎖原因過長").optional(),
});

export const removeFromBlacklistSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
});
