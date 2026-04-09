// ============================================
// 咖啡豆訂購系統 — Supabase Edge Function (Hono Router)
// ============================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import { ALLOWED_REDIRECT_ORIGINS } from "./utils/config.ts";
import { parseRequestData } from "./utils/request.ts";
import { extractAuth } from "./utils/auth.ts";

// ============ API 模組 ============
import {
  customerLineLogin,
  getLineLoginUrl,
  handleAdminLogin,
} from "./api/auth.ts";

import { getUserProfile, updateUserProfile } from "./api/profile.ts";

import {
  batchDeleteOrders,
  batchUpdateOrderStatus,
  deleteOrder,
  getMyOrders,
  getOrders,
  sendOrderEmail,
  submitOrder,
  updateOrderStatus,
} from "./api/orders.ts";
import { quoteOrder } from "./api/quote.ts";

import {
  linePayCancel,
  linePayConfirm,
  linePayRefund,
  updateTransferInfo,
} from "./api/payments.ts";

import {
  getInitData,
  getSettings,
  updateSettingsAction,
  uploadAsset,
} from "./api/settings.ts";

import {
  addProduct,
  deleteProduct,
  getProducts,
  reorderProduct,
  reorderProductsBulk,
  updateProduct,
} from "./api/products.ts";

import {
  addCategory,
  deleteCategory,
  getCategories,
  reorderCategory,
  updateCategory,
} from "./api/categories.ts";

import {
  addPromotion,
  deletePromotion,
  getPromotions,
  reorderPromotionsBulk,
  updatePromotion,
} from "./api/promotions.ts";

import {
  addFormField,
  deleteFormField,
  getFormFields,
  getFormFieldsAdmin,
  reorderFormFields,
  updateFormField,
} from "./api/form-fields.ts";

import {
  addBankAccount,
  deleteBankAccount,
  getBankAccounts,
  reorderBankAccounts,
  updateBankAccount,
} from "./api/bank-accounts.ts";

import {
  addToBlacklist,
  getBlacklist,
  getUsers,
  removeFromBlacklist,
  updateUserRole,
} from "./api/users.ts";

import {
  createPcscMapSession,
  createStoreMapSession,
  getStoreList,
  getStoreSelection,
  handlePcscMapCallback,
  handleStoreMapCallback,
} from "./api/stores.ts";

import { sendLineFlexMessage, testEmail } from "./api/misc.ts";

import { validate } from "./utils/validate.ts";
import { lineLoginSchema, transferInfoSchema } from "./schemas/auth.ts";
import {
  batchDeleteOrdersSchema,
  batchUpdateOrderStatusSchema,
  deleteOrderSchema,
  quoteOrderSchema,
  sendLineFlexMessageSchema,
  sendOrderEmailSchema,
  submitOrderSchema,
  updateOrderStatusSchema,
} from "./schemas/order.ts";
import { updateUserProfileSchema } from "./schemas/profile.ts";
import {
  addBankAccountSchema,
  addFormFieldSchema,
  categorySchema,
  deleteBankAccountSchema,
  deleteByIdSchema,
  deleteFormFieldSchema,
  productSchema,
  promotionSchema,
  reorderIdsSchema,
  reorderProductSchema,
  updateBankAccountSchema,
  updateFormFieldSchema,
  updateSettingsSchema,
} from "./schemas/settings.ts";
import {
  addToBlacklistSchema,
  removeFromBlacklistSchema,
  updateUserRoleSchema,
} from "./schemas/users.ts";

// ============ 建立 Hono 應用程式 ============
const app = new Hono();

// CORS 中介層
app.use(
  "*",
  cors({
    origin: (origin: string) => {
      if (ALLOWED_REDIRECT_ORIGINS.includes(origin)) return origin;
      return ALLOWED_REDIRECT_ORIGINS[0] || "*";
    },
    allowHeaders: ["authorization", "x-client-info", "apikey", "content-type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

// ============ 簡易 IP Rate Limiter ============
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQ = 100;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10000;
const RATE_LIMIT_MAX_BUCKETS = 5000;
let lastRateLimitCleanupAt = 0;

function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const xRealIp = req.headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;

  const forwarded = req.headers.get("x-forwarded-for");
  const firstForwardedIp = forwarded?.split(",")[0]?.trim();
  if (firstForwardedIp) return firstForwardedIp;

  return "unknown";
}

function cleanupRateLimitMap(now: number) {
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) rateLimitMap.delete(key);
  }

  if (rateLimitMap.size <= RATE_LIMIT_MAX_BUCKETS) return;

  const overflow = rateLimitMap.size - RATE_LIMIT_MAX_BUCKETS;
  let removed = 0;
  for (const key of rateLimitMap.keys()) {
    rateLimitMap.delete(key);
    removed++;
    if (removed >= overflow) break;
  }
}

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return await next();

  const now = Date.now();
  if (
    now - lastRateLimitCleanupAt >= RATE_LIMIT_CLEANUP_INTERVAL_MS ||
    rateLimitMap.size > RATE_LIMIT_MAX_BUCKETS
  ) {
    cleanupRateLimitMap(now);
    lastRateLimitCleanupAt = now;
  }

  const ip = getClientIp(c.req.raw);
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  } else {
    record.count++;
    if (record.count > RATE_LIMIT_MAX_REQ) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((record.resetTime - now) / 1000),
      );
      c.header("Retry-After", String(retryAfterSec));
      return c.json(
        { success: false, error: "您的請求過於頻繁，請稍後再試" },
        429,
      );
    }
  }

  await next();
});

// ============ 共用的錯誤處理與回應包裝 ============
function wrapHandler(
  handler: (data: Record<string, unknown>, req: Request) => Promise<unknown>,
  options?: { parseBody?: boolean },
) {
  return async (
    c: {
      req: { raw: Request };
      json: (data: unknown, status?: number) => Response;
    },
  ) => {
    try {
      const req = c.req.raw;
      const url = new URL(req.url);
      const data = options?.parseBody !== false
        ? await parseRequestData(req, url)
        : Object.fromEntries(url.searchParams);
      const result = await handler(data, req);
      if (result instanceof Response) return result;
      return c.json(result);
    } catch (error) {
      const msg = String(error).replace(/^Error:\s*/, "");
      if (
        msg.includes("登入") || msg.includes("權限") ||
        msg.includes("Token") || msg.includes("無效")
      ) {
        return c.json({ success: false, error: msg }, 401);
      }
      return c.json({ success: false, error: msg });
    }
  };
}

// ============ Action 路由對應表 ============
// 將所有 ?action=xxx 映射到對應的處理函式
// 這是核心的路由分派機制，取代了原本的 switch...case
type ActionHandler = (
  data: Record<string, unknown>,
  req: Request,
) => Promise<unknown>;

const actionMap: Record<string, ActionHandler> = {
  // ====== 公開 API ======
  getProducts: async () => await getProducts(),
  getCategories: async () => await getCategories(),
  getSettings: async (_data, req) => {
    const a = await extractAuth(req);
    return await getSettings(a?.isAdmin || false);
  },
  getInitData: async (_data, req) => {
    const a = await extractAuth(req);
    return await getInitData(a?.isAdmin || false);
  },
  getPromotions: async () => await getPromotions(),
  getFormFields: async () => await getFormFields(false),
  getBankAccounts: async () => await getBankAccounts(),
  getLineLoginUrl: (data) =>
    Promise.resolve(getLineLoginUrl(data.redirectUri as string)),
  customerLineLogin: async (data) => {
    const v = await validate(lineLoginSchema, data);
    return await customerLineLogin(v.code, v.redirectUri);
  },
  lineLogin: async (data) => {
    const v = await validate(lineLoginSchema, data);
    return await handleAdminLogin(v.code, v.redirectUri);
  },
  getStoreList: async (data) => await getStoreList(data.cvsType as string),
  createStoreMapSession: async (data) =>
    await createStoreMapSession(
      (data.deliveryMethod as string) || "",
      (data.clientUrl as string) || "",
    ),
  getStoreSelection: async (data) =>
    await getStoreSelection(data.token as string),
  storeMapCallback: async (data) => await handleStoreMapCallback(data),
  quoteOrder: async (data) => {
    const v = await validate(quoteOrderSchema, data);
    return await quoteOrder(v);
  },
  createPcscMapSession: async (data) =>
    await createPcscMapSession(
      (data.clientUrl as string) || "",
    ),
  pcscMapCallback: async (data) => await handlePcscMapCallback(data),
  linePayConfirm: async (data) => await linePayConfirm(data),
  linePayCancel: async (data, req) => await linePayCancel(data, req),

  // ====== 需登入 ======
  submitOrder: async (data, req) => {
    const v = await validate(submitOrderSchema, data);
    return await submitOrder(v, req);
  },
  getMyOrders: async (_data, req) => await getMyOrders(req),
  getUserProfile: async (data, req) => await getUserProfile(data, req),
  updateUserProfile: async (data, req) => {
    const v = await validate(updateUserProfileSchema, data);
    return await updateUserProfile(v, req);
  },
  updateTransferInfo: async (data, req) => {
    const v = await validate(transferInfoSchema, data);
    return await updateTransferInfo(v, req);
  },
  verifyAdmin: async (_data, req) => {
    const a = await extractAuth(req);
    return a
      ? { success: true, isAdmin: a.isAdmin, role: a.role, message: "OK" }
      : { success: false, isAdmin: false, message: "請先登入" };
  },

  // ====== 需管理員 ======
  getFormFieldsAdmin: async (_data, req) => await getFormFieldsAdmin(req),
  getOrders: async (_data, req) => await getOrders(req),
  addPromotion: async (data, req) => {
    const v = await validate(promotionSchema, data);
    return await addPromotion(v, req);
  },
  updatePromotion: async (data, req) => {
    const v = await validate(promotionSchema, data);
    return await updatePromotion(v, req);
  },
  deletePromotion: async (data, req) => {
    const v = await validate(deleteByIdSchema, data);
    return await deletePromotion(v, req);
  },
  reorderPromotionsBulk: async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderPromotionsBulk(v, req);
  },
  addProduct: async (data, req) => {
    const v = await validate(productSchema, data);
    return await addProduct(v, req);
  },
  updateProduct: async (data, req) => {
    const v = await validate(productSchema, data);
    return await updateProduct(v, req);
  },
  deleteProduct: async (data, req) => {
    const v = await validate(deleteByIdSchema, data);
    return await deleteProduct(v, req);
  },
  reorderProduct: async (data, req) => {
    const v = await validate(reorderProductSchema, data);
    return await reorderProduct(v, req);
  },
  reorderProductsBulk: async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderProductsBulk(v, req);
  },
  addCategory: async (data, req) => {
    const v = await validate(categorySchema, data);
    return await addCategory(v, req);
  },
  updateCategory: async (data, req) => {
    const v = await validate(categorySchema, data);
    return await updateCategory(v, req);
  },
  deleteCategory: async (data, req) => {
    const v = await validate(deleteByIdSchema, data);
    return await deleteCategory(v, req);
  },
  reorderCategory: async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderCategory(v, req);
  },
  updateSettings: async (data, req) => {
    const v = await validate(updateSettingsSchema, data);
    return await updateSettingsAction(v, req);
  },
  updateOrderStatus: async (data, req) => {
    const v = await validate(updateOrderStatusSchema, data);
    return await updateOrderStatus(v, req);
  },
  sendOrderEmail: async (data, req) => {
    const v = await validate(sendOrderEmailSchema, data);
    return await sendOrderEmail(v, req);
  },
  batchUpdateOrderStatus: async (data, req) => {
    const v = await validate(batchUpdateOrderStatusSchema, data);
    return await batchUpdateOrderStatus(v, req);
  },
  deleteOrder: async (data, req) => {
    const v = await validate(deleteOrderSchema, data);
    return await deleteOrder(v, req);
  },
  batchDeleteOrders: async (data, req) => {
    const v = await validate(batchDeleteOrdersSchema, data);
    return await batchDeleteOrders(v, req);
  },
  getUsers: async (_data, req) => await getUsers(req),
  updateUserRole: async (data, req) => {
    const v = await validate(updateUserRoleSchema, data);
    return await updateUserRole(v, req);
  },
  getBlacklist: async (_data, req) => await getBlacklist(req),
  addToBlacklist: async (data, req) => {
    const v = await validate(addToBlacklistSchema, data);
    return await addToBlacklist(v, req);
  },
  removeFromBlacklist: async (data, req) => {
    const v = await validate(removeFromBlacklistSchema, data);
    return await removeFromBlacklist(v, req);
  },
  testEmail: async (data, req) => await testEmail(data, req),
  sendLineFlexMessage: async (data, req) => {
    const v = await validate(sendLineFlexMessageSchema, data);
    return await sendLineFlexMessage(v, req);
  },
  addFormField: async (data, req) => {
    const v = await validate(addFormFieldSchema, data);
    return await addFormField(v, req);
  },
  updateFormField: async (data, req) => {
    const v = await validate(updateFormFieldSchema, data);
    return await updateFormField(v, req);
  },
  deleteFormField: async (data, req) => {
    const v = await validate(deleteFormFieldSchema, data);
    return await deleteFormField(v, req);
  },
  reorderFormFields: async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderFormFields(v, req);
  },
  uploadAsset: async (data, req) => await uploadAsset(data, req),
  linePayRefund: async (data, req) => await linePayRefund(data, req),
  addBankAccount: async (data, req) => {
    const v = await validate(addBankAccountSchema, data);
    return await addBankAccount(v, req);
  },
  updateBankAccount: async (data, req) => {
    const v = await validate(updateBankAccountSchema, data);
    return await updateBankAccount(v, req);
  },
  deleteBankAccount: async (data, req) => {
    const v = await validate(deleteBankAccountSchema, data);
    return await deleteBankAccount(v, req);
  },
  reorderBankAccounts: async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderBankAccounts(v, req);
  },
};

// ============ 主路由：?action=xxx 相容模式 ============
// 前端（訂購頁 + 管理後台）都使用 ?action=xxx 呼叫，
// 為了 100% 向下相容，我們使用萬用路由統一處理。
app.all(
  "/*",
  wrapHandler(async (data, req) => {
    const action = (data.action as string) || "getProducts";
    const handler = actionMap[action];
    if (!handler) {
      return { success: false, error: `未知的操作: ${action}` };
    }
    return await handler(data, req);
  }),
);

// ============ 匯出 ============
export default app;
