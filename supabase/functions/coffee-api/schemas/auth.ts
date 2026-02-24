import { z } from 'https://deno.land/x/zod/mod.ts'

export const lineLoginSchema = z.object({
    code: z.string().min(1, '授權碼不能為空'),
    redirectUri: z.string().url('無效的 redirectUri'),
})

export const transferInfoSchema = z.object({
    orderId: z.string().min(1),
    last5: z.string().length(5).regex(/^\d+$/, '必須是5位數字'),
})
