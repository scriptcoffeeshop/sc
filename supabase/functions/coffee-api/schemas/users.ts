import { z } from "zod";

export const updateUserRoleSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
  newRole: z.enum(["USER", "ADMIN"], {
    error: "newRole 只能是 USER 或 ADMIN",
  }),
});

export const addToBlacklistSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
  reason: z.string().trim().max(200, "封鎖原因過長").optional(),
});

export const removeFromBlacklistSchema = z.object({
  targetUserId: z.string().trim().min(1, "缺少 targetUserId"),
});
