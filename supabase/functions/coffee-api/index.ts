// ============================================
// 咖啡豆訂購系統 — Supabase Edge Function (Hono Router)
// ============================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import { ALLOWED_REDIRECT_ORIGINS } from "./utils/config.ts";
import { parseRequestData } from "./utils/request.ts";
import { extractAuth, type AuthResult } from "./utils/auth.ts";

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
  jkoPayInquiry,
  jkoPayRefund,
  jkoPayResult,
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

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitStore {
  buckets: Map<string, RateLimitBucket>;
  lastCleanupAt: number;
  maxBuckets: number;
}

// ============ 簡易 IP Rate Limiter ============
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQ = 100;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 10000;
const RATE_LIMIT_MAX_BUCKETS = 5000;
const ACTION_RATE_LIMIT_MAX_BUCKETS = 5000;
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: RATE_LIMIT_MAX_REQ,
  windowMs: RATE_LIMIT_WINDOW_MS,
};
const SUBMIT_ORDER_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 5 * 60 * 1000,
};
const PAYMENT_ACTION_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 12,
  windowMs: 5 * 60 * 1000,
};
const AUTH_ACTION_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 5 * 60 * 1000,
};
const globalRateLimitStore: RateLimitStore = {
  buckets: new Map(),
  lastCleanupAt: 0,
  maxBuckets: RATE_LIMIT_MAX_BUCKETS,
};
const actionRateLimitStore: RateLimitStore = {
  buckets: new Map(),
  lastCleanupAt: 0,
  maxBuckets: ACTION_RATE_LIMIT_MAX_BUCKETS,
};

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

function cleanupRateLimitBuckets(
  buckets: Map<string, RateLimitBucket>,
  now: number,
  maxBuckets: number,
) {
  for (const [key, value] of buckets.entries()) {
    if (now > value.resetTime) buckets.delete(key);
  }

  if (buckets.size <= maxBuckets) return;

  const overflow = buckets.size - maxBuckets;
  let removed = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    removed++;
    if (removed >= overflow) break;
  }
}

function consumeRateLimit(
  store: RateLimitStore,
  key: string,
  config: RateLimitConfig,
  now: number,
): number | null {
  if (
    now - store.lastCleanupAt >= RATE_LIMIT_CLEANUP_INTERVAL_MS ||
    store.buckets.size > store.maxBuckets
  ) {
    cleanupRateLimitBuckets(store.buckets, now, store.maxBuckets);
    store.lastCleanupAt = now;
  }

  const record = store.buckets.get(key);
  if (!record || now > record.resetTime) {
    store.buckets.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return null;
  }

  record.count++;
  if (record.count <= config.maxRequests) return null;

  return Math.max(1, Math.ceil((record.resetTime - now) / 1000));
}

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return await next();

  const now = Date.now();
  const ip = getClientIp(c.req.raw);
  const retryAfterSec = consumeRateLimit(
    globalRateLimitStore,
    ip,
    DEFAULT_RATE_LIMIT,
    now,
  );
  if (retryAfterSec !== null) {
    c.header("Retry-After", String(retryAfterSec));
    return c.json(
      { success: false, error: "您的請求過於頻繁，請稍後再試" },
      429,
    );
  }

  await next();
});

// ============ Action 路由對應表 ============
// 將所有 ?action=xxx 映射到對應的處理函式
// 這是核心的路由分派機制，取代了原本的 switch...case
type ActionHandler = (
  data: Record<string, unknown>,
  req: Request,
) => Promise<unknown>;

type AccessLevel = "public" | "authenticated" | "admin";
type HttpMethod = "GET" | "POST";

interface ActionConfig {
  handler: ActionHandler;
  access: AccessLevel;
  methods?: readonly HttpMethod[];
  rateLimit?: RateLimitConfig;
  audit?: boolean;
}

interface WrappedActionContext {
  action: string;
  actionConfig: ActionConfig;
  auth: AuthResult | null;
}

class ActionRequestError extends Error {
  status: number;
  headers: Record<string, string>;

  constructor(
    status: number,
    message: string,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ActionRequestError";
    this.status = status;
    this.headers = headers;
  }
}

const POST_ONLY = ["POST"] as const;

function publicAction(
  handler: ActionHandler,
  options: Omit<ActionConfig, "handler" | "access"> = {},
): ActionConfig {
  return { handler, access: "public", ...options };
}

function authenticatedAction(
  handler: ActionHandler,
  options: Omit<ActionConfig, "handler" | "access"> = {},
): ActionConfig {
  return { handler, access: "authenticated", ...options };
}

function adminAction(
  handler: ActionHandler,
  options: Omit<ActionConfig, "handler" | "access"> = {},
): ActionConfig {
  return { handler, access: "admin", ...options };
}

const actionMap: Record<string, ActionConfig> = {
  // ====== 公開 API ======
  getProducts: publicAction(async () => await getProducts()),
  getCategories: publicAction(async () => await getCategories()),
  getSettings: publicAction(async (_data, req) => {
    const a = await extractAuth(req);
    return await getSettings(a?.isAdmin || false);
  }),
  getInitData: publicAction(async (_data, req) => {
    const a = await extractAuth(req);
    return await getInitData(a?.isAdmin || false);
  }),
  getPromotions: publicAction(async () => await getPromotions()),
  getFormFields: publicAction(async () => await getFormFields(false)),
  getBankAccounts: publicAction(async () => await getBankAccounts()),
  getLineLoginUrl: publicAction((data) =>
    Promise.resolve(getLineLoginUrl(data.redirectUri as string))),
  customerLineLogin: publicAction(async (data) => {
    const v = await validate(lineLoginSchema, data);
    return await customerLineLogin(v.code, v.redirectUri);
  }, { methods: POST_ONLY, rateLimit: AUTH_ACTION_RATE_LIMIT }),
  lineLogin: publicAction(async (data) => {
    const v = await validate(lineLoginSchema, data);
    return await handleAdminLogin(v.code, v.redirectUri);
  }, { methods: POST_ONLY, rateLimit: AUTH_ACTION_RATE_LIMIT }),
  getStoreList: publicAction(async (data) =>
    await getStoreList(data.cvsType as string)),
  createStoreMapSession: publicAction(async (data) =>
    await createStoreMapSession(
      (data.deliveryMethod as string) || "",
      (data.clientUrl as string) || "",
    ),
  { methods: POST_ONLY }),
  getStoreSelection: publicAction(async (data) =>
    await getStoreSelection(data.token as string)),
  storeMapCallback: publicAction(async (data) =>
    await handleStoreMapCallback(data)),
  quoteOrder: publicAction(async (data) => {
    const v = await validate(quoteOrderSchema, data);
    return await quoteOrder(v);
  }, { methods: POST_ONLY }),
  createPcscMapSession: publicAction(async (data) =>
    await createPcscMapSession(
      (data.clientUrl as string) || "",
    ),
  { methods: POST_ONLY }),
  pcscMapCallback: publicAction(async (data) => await handlePcscMapCallback(data)),
  linePayConfirm: publicAction(async (data) => await linePayConfirm(data), {
    rateLimit: PAYMENT_ACTION_RATE_LIMIT,
  }),
  linePayCancel: publicAction(async (data, req) => await linePayCancel(data, req), {
    rateLimit: PAYMENT_ACTION_RATE_LIMIT,
  }),
  jkoPayResult: publicAction(async (data, req) => await jkoPayResult(data, req), {
    rateLimit: PAYMENT_ACTION_RATE_LIMIT,
  }),

  // ====== 需登入 ======
  submitOrder: authenticatedAction(async (data, req) => {
    const v = await validate(submitOrderSchema, data);
    return await submitOrder(v, req);
  }, { methods: POST_ONLY, rateLimit: SUBMIT_ORDER_RATE_LIMIT }),
  getMyOrders: authenticatedAction(async (_data, req) => await getMyOrders(req)),
  getUserProfile: authenticatedAction(async (data, req) =>
    await getUserProfile(data, req)),
  updateUserProfile: authenticatedAction(async (data, req) => {
    const v = await validate(updateUserProfileSchema, data);
    return await updateUserProfile(v, req);
  }, { methods: POST_ONLY }),
  updateTransferInfo: authenticatedAction(async (data, req) => {
    const v = await validate(transferInfoSchema, data);
    return await updateTransferInfo(v, req);
  }, { methods: POST_ONLY, rateLimit: PAYMENT_ACTION_RATE_LIMIT }),
  jkoPayInquiry: authenticatedAction(async (data, req) =>
    await jkoPayInquiry(data, req), { rateLimit: PAYMENT_ACTION_RATE_LIMIT }),
  verifyAdmin: authenticatedAction(async (_data, req) => {
    const a = await extractAuth(req);
    return a
      ? { success: true, isAdmin: a.isAdmin, role: a.role, message: "OK" }
      : { success: false, isAdmin: false, message: "請先登入" };
  }),

  // ====== 需管理員 ======
  getFormFieldsAdmin: adminAction(async (_data, req) =>
    await getFormFieldsAdmin(req)),
  getOrders: adminAction(async (_data, req) => await getOrders(req)),
  addPromotion: adminAction(async (data, req) => {
    const v = await validate(promotionSchema, data);
    return await addPromotion(v, req);
  }, { methods: POST_ONLY }),
  updatePromotion: adminAction(async (data, req) => {
    const v = await validate(promotionSchema, data);
    return await updatePromotion(v, req);
  }, { methods: POST_ONLY }),
  deletePromotion: adminAction(async (data, req) => {
    const v = await validate(deleteByIdSchema, data);
    return await deletePromotion(v, req);
  }, { methods: POST_ONLY }),
  reorderPromotionsBulk: adminAction(async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderPromotionsBulk(v, req);
  }, { methods: POST_ONLY }),
  addProduct: adminAction(async (data, req) => {
    const v = await validate(productSchema, data);
    return await addProduct(v, req);
  }, { methods: POST_ONLY }),
  updateProduct: adminAction(async (data, req) => {
    const v = await validate(productSchema, data);
    return await updateProduct(v, req);
  }, { methods: POST_ONLY }),
  deleteProduct: adminAction(async (data, req) => {
    const v = await validate(deleteByIdSchema, data);
    return await deleteProduct(v, req);
  }, { methods: POST_ONLY }),
  reorderProduct: adminAction(async (data, req) => {
    const v = await validate(reorderProductSchema, data);
    return await reorderProduct(v, req);
  }, { methods: POST_ONLY }),
  reorderProductsBulk: adminAction(async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderProductsBulk(v, req);
  }, { methods: POST_ONLY }),
  addCategory: adminAction(async (data, req) => {
    const v = await validate(categorySchema, data);
    return await addCategory(v, req);
  }, { methods: POST_ONLY }),
  updateCategory: adminAction(async (data, req) => {
    const v = await validate(categorySchema, data);
    return await updateCategory(v, req);
  }, { methods: POST_ONLY }),
  deleteCategory: adminAction(async (data, req) => {
    const v = await validate(deleteByIdSchema, data);
    return await deleteCategory(v, req);
  }, { methods: POST_ONLY }),
  reorderCategory: adminAction(async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderCategory(v, req);
  }, { methods: POST_ONLY }),
  updateSettings: adminAction(async (data, req) => {
    const v = await validate(updateSettingsSchema, data);
    return await updateSettingsAction(v, req);
  }, { methods: POST_ONLY }),
  updateOrderStatus: adminAction(async (data, req) => {
    const v = await validate(updateOrderStatusSchema, data);
    return await updateOrderStatus(v, req);
  }, { methods: POST_ONLY }),
  sendOrderEmail: adminAction(async (data, req) => {
    const v = await validate(sendOrderEmailSchema, data);
    return await sendOrderEmail(v, req);
  }, { methods: POST_ONLY }),
  batchUpdateOrderStatus: adminAction(async (data, req) => {
    const v = await validate(batchUpdateOrderStatusSchema, data);
    return await batchUpdateOrderStatus(v, req);
  }, { methods: POST_ONLY }),
  deleteOrder: adminAction(async (data, req) => {
    const v = await validate(deleteOrderSchema, data);
    return await deleteOrder(v, req);
  }, { methods: POST_ONLY }),
  batchDeleteOrders: adminAction(async (data, req) => {
    const v = await validate(batchDeleteOrdersSchema, data);
    return await batchDeleteOrders(v, req);
  }, { methods: POST_ONLY }),
  getUsers: adminAction(async (_data, req) => await getUsers(req)),
  updateUserRole: adminAction(async (data, req) => {
    const v = await validate(updateUserRoleSchema, data);
    return await updateUserRole(v, req);
  }, { methods: POST_ONLY }),
  getBlacklist: adminAction(async (_data, req) => await getBlacklist(req)),
  addToBlacklist: adminAction(async (data, req) => {
    const v = await validate(addToBlacklistSchema, data);
    return await addToBlacklist(v, req);
  }, { methods: POST_ONLY }),
  removeFromBlacklist: adminAction(async (data, req) => {
    const v = await validate(removeFromBlacklistSchema, data);
    return await removeFromBlacklist(v, req);
  }, { methods: POST_ONLY }),
  testEmail: adminAction(async (data, req) => await testEmail(data, req), {
    methods: POST_ONLY,
  }),
  sendLineFlexMessage: adminAction(async (data, req) => {
    const v = await validate(sendLineFlexMessageSchema, data);
    return await sendLineFlexMessage(v, req);
  }, { methods: POST_ONLY }),
  addFormField: adminAction(async (data, req) => {
    const v = await validate(addFormFieldSchema, data);
    return await addFormField(v, req);
  }, { methods: POST_ONLY }),
  updateFormField: adminAction(async (data, req) => {
    const v = await validate(updateFormFieldSchema, data);
    return await updateFormField(v, req);
  }, { methods: POST_ONLY }),
  deleteFormField: adminAction(async (data, req) => {
    const v = await validate(deleteFormFieldSchema, data);
    return await deleteFormField(v, req);
  }, { methods: POST_ONLY }),
  reorderFormFields: adminAction(async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderFormFields(v, req);
  }, { methods: POST_ONLY }),
  uploadAsset: adminAction(async (data, req) => await uploadAsset(data, req), {
    methods: POST_ONLY,
  }),
  linePayRefund: adminAction(async (data, req) => await linePayRefund(data, req), {
    methods: POST_ONLY,
    rateLimit: PAYMENT_ACTION_RATE_LIMIT,
  }),
  jkoPayRefund: adminAction(async (data, req) => await jkoPayRefund(data, req), {
    methods: POST_ONLY,
    rateLimit: PAYMENT_ACTION_RATE_LIMIT,
  }),
  addBankAccount: adminAction(async (data, req) => {
    const v = await validate(addBankAccountSchema, data);
    return await addBankAccount(v, req);
  }, { methods: POST_ONLY }),
  updateBankAccount: adminAction(async (data, req) => {
    const v = await validate(updateBankAccountSchema, data);
    return await updateBankAccount(v, req);
  }, { methods: POST_ONLY }),
  deleteBankAccount: adminAction(async (data, req) => {
    const v = await validate(deleteBankAccountSchema, data);
    return await deleteBankAccount(v, req);
  }, { methods: POST_ONLY }),
  reorderBankAccounts: adminAction(async (data, req) => {
    const v = await validate(reorderIdsSchema, data);
    return await reorderBankAccounts(v, req);
  }, { methods: POST_ONLY }),
};

function shouldAuditAction(actionConfig: ActionConfig): boolean {
  if (typeof actionConfig.audit === "boolean") return actionConfig.audit;
  return actionConfig.access !== "public" ||
    Boolean(actionConfig.methods?.includes("POST"));
}

function resolveActionName(data: Record<string, unknown>): string {
  return String(data.action || "getProducts").trim() || "getProducts";
}

function enforceActionMethod(
  action: string,
  actionConfig: ActionConfig,
  req: Request,
) {
  if (!actionConfig.methods || actionConfig.methods.length === 0) return;

  const method = req.method.toUpperCase();
  if (actionConfig.methods.includes(method as HttpMethod)) return;

  throw new ActionRequestError(
    405,
    `${action} 僅允許 ${actionConfig.methods.join("/")} 請求`,
    { "Allow": actionConfig.methods.join(", ") },
  );
}

async function resolveActionAuth(
  actionConfig: ActionConfig,
  req: Request,
): Promise<AuthResult | null> {
  if (actionConfig.access === "public") return null;
  return await extractAuth(req);
}

function enforceActionAccess(
  actionConfig: ActionConfig,
  auth: AuthResult | null,
) {
  if (actionConfig.access === "public") return;
  if (!auth) throw new ActionRequestError(401, "請先登入");
  if (actionConfig.access === "admin" && !auth.isAdmin) {
    throw new ActionRequestError(401, "權限不足");
  }
}

function enforceActionRateLimit(
  action: string,
  actionConfig: ActionConfig,
  req: Request,
  auth: AuthResult | null,
) {
  if (!actionConfig.rateLimit) return;

  const scope = auth?.userId || getClientIp(req);
  const retryAfterSec = consumeRateLimit(
    actionRateLimitStore,
    `${action}:${scope}`,
    actionConfig.rateLimit,
    Date.now(),
  );
  if (retryAfterSec === null) return;

  throw new ActionRequestError(
    429,
    "操作過於頻繁，請稍後再試",
    { "Retry-After": String(retryAfterSec) },
  );
}

function extractAuditError(result: unknown): string {
  if (!result || typeof result !== "object" || Array.isArray(result)) return "";
  if (!("error" in result)) return "";
  return String(result.error || "").trim();
}

function isAuditSuccess(result: unknown, status: number): boolean {
  if (status >= 400) return false;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return status < 400;
  }
  if (!("success" in result)) return status < 400;
  return result.success !== false;
}

function logActionAudit(params: {
  action: string;
  actionConfig: ActionConfig | null;
  req: Request;
  auth: AuthResult | null;
  status: number;
  durationMs: number;
  success: boolean;
  error?: string;
}) {
  const record = {
    ts: new Date().toISOString(),
    action: params.action,
    access: params.actionConfig?.access || "unknown",
    method: params.req.method,
    ip: getClientIp(params.req),
    userId: params.auth?.userId || "",
    role: params.auth?.role || "",
    isAdmin: params.auth?.isAdmin || false,
    status: params.status,
    durationMs: params.durationMs,
    success: params.success,
    error: String(params.error || "").trim(),
  };
  const payload = `[audit] ${JSON.stringify(record)}`;
  if (params.status >= 500) {
    console.error(payload);
    return;
  }
  if (!params.success || params.status >= 400) {
    console.warn(payload);
    return;
  }
  console.info(payload);
}

function wrapHandler(
  handler: (
    data: Record<string, unknown>,
    req: Request,
    context: WrappedActionContext,
  ) => Promise<unknown>,
  options?: { parseBody?: boolean },
) {
  return async (
    c: {
      req: { raw: Request };
      json: (data: unknown, status?: number) => Response;
      header: (name: string, value: string) => void;
    },
  ) => {
    const req = c.req.raw;
    const startedAt = Date.now();
    let action = "unknown";
    let actionConfig: ActionConfig | null = null;
    let auth: AuthResult | null = null;

    try {
      const url = new URL(req.url);
      const data = options?.parseBody !== false
        ? await parseRequestData(req, url)
        : Object.fromEntries(url.searchParams);
      action = resolveActionName(data);
      actionConfig = actionMap[action] || null;
      if (!actionConfig) {
        throw new ActionRequestError(404, `未知的操作: ${action}`);
      }

      enforceActionMethod(action, actionConfig, req);
      auth = await resolveActionAuth(actionConfig, req);
      enforceActionRateLimit(action, actionConfig, req, auth);
      enforceActionAccess(actionConfig, auth);

      const result = await handler(data, req, { action, actionConfig, auth });
      const status = result instanceof Response ? result.status : 200;
      if (shouldAuditAction(actionConfig)) {
        logActionAudit({
          action,
          actionConfig,
          req,
          auth,
          status,
          durationMs: Date.now() - startedAt,
          success: isAuditSuccess(result, status),
          error: extractAuditError(result),
        });
      }
      if (result instanceof Response) return result;
      return c.json(result);
    } catch (error) {
      let status = 500;
      let headers: Record<string, string> = {};
      let message = String(error).replace(/^Error:\s*/, "");

      if (error instanceof ActionRequestError) {
        status = error.status;
        headers = error.headers;
        message = error.message;
      } else if (
        message.includes("登入") || message.includes("權限") ||
        message.includes("Token") || message.includes("無效")
      ) {
        status = 401;
      }

      for (const [name, value] of Object.entries(headers)) {
        c.header(name, value);
      }

      if (!actionConfig || shouldAuditAction(actionConfig)) {
        logActionAudit({
          action,
          actionConfig,
          req,
          auth,
          status,
          durationMs: Date.now() - startedAt,
          success: false,
          error: message,
        });
      }

      return c.json({ success: false, error: message }, status);
    }
  };
}

// ============ 主路由：?action=xxx 相容模式 ============
// 前端（訂購頁 + 管理後台）都使用 ?action=xxx 呼叫，
// 為了 100% 向下相容，我們使用萬用路由統一處理。
app.all(
  "/*",
  wrapHandler(async (data, req, context) => {
    return await context.actionConfig.handler(data, req);
  }),
);

// ============ 匯出 ============
export default app;
