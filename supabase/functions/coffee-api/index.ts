// ============================================
// 咖啡豆訂購系統 — Supabase Edge Function (Hono Router)
// ============================================

import { Hono } from "npm:hono@3.12.0";
import { cors } from "npm:hono@3.12.0/cors";
import { ALLOWED_REDIRECT_ORIGINS } from "./utils/config.ts";
import { parseRequestData } from "./utils/request.ts";
import { extractAuth } from "./utils/auth.ts";

// ============ API 模組 ============
import {
  customerLineLogin,
  getLineLoginUrl,
  handleAdminLogin,
} from "./api/auth.ts";

import {
  deleteOrder,
  getMyOrders,
  getOrders,
  submitOrder,
  updateOrderStatus,
} from "./api/orders.ts";

import {
  linePayCancel,
  linePayConfirm,
  linePayRefund,
  updateTransferInfo,
} from "./api/payments.ts";

import {
  addBankAccount,
  addCategory,
  addFormField,
  addProduct,
  addPromotion,
  deleteBankAccount,
  deleteCategory,
  deleteFormField,
  deleteProduct,
  deletePromotion,
  getBankAccounts,
  getCategories,
  getFormFields,
  getFormFieldsAdmin,
  getInitData,
  getProducts,
  getPromotions,
  getSettings,
  reorderCategory,
  reorderFormFields,
  reorderProduct,
  reorderProductsBulk,
  reorderPromotionsBulk,
  updateBankAccount,
  updateCategory,
  updateFormField,
  updateProduct,
  updatePromotion,
  updateSettingsAction,
  uploadSiteIcon,
} from "./api/settings.ts";

import {
  addToBlacklist,
  getBlacklist,
  getUsers,
  removeFromBlacklist,
  updateUserRole,
} from "./api/users.ts";

import {
  createStoreMapSession,
  getStoreList,
  getStoreSelection,
  handleStoreMapCallback,
} from "./api/stores.ts";

import { testEmail } from "./api/misc.ts";

import { validate } from "./utils/validate.ts";
import { lineLoginSchema, transferInfoSchema } from "./schemas/auth.ts";
import { submitOrderSchema, updateOrderStatusSchema } from "./schemas/order.ts";
import {
  categorySchema,
  productSchema,
  promotionSchema,
  updateSettingsSchema,
} from "./schemas/settings.ts";

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
  getSettings: async () => await getSettings(),
  getInitData: async () => await getInitData(),
  getPromotions: async () => await getPromotions(),
  getFormFields: async () => await getFormFields(false),
  getBankAccounts: async () => await getBankAccounts(),
  getLineLoginUrl: (data) => Promise.resolve(getLineLoginUrl(data.redirectUri as string)),
  customerLineLogin: async (data) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(lineLoginSchema, data)) as any;
    return await customerLineLogin(v.code, v.redirectUri);
  },
  lineLogin: async (data) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(lineLoginSchema, data)) as any;
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
  linePayConfirm: async (data) => await linePayConfirm(data),
  linePayCancel: async (data, req) => await linePayCancel(data, req),

  // ====== 需登入 ======
  submitOrder: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(submitOrderSchema, data)) as any;
    return await submitOrder(v, req);
  },
  getMyOrders: async (_data, req) => await getMyOrders(req),
  updateTransferInfo: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(transferInfoSchema, data)) as any;
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
    // deno-lint-ignore no-explicit-any
    const v = (await validate(promotionSchema, data)) as any;
    return await addPromotion(v, req);
  },
  updatePromotion: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(promotionSchema, data)) as any;
    return await updatePromotion(v, req);
  },
  deletePromotion: async (data, req) => await deletePromotion(data, req),
  reorderPromotionsBulk: async (data, req) =>
    await reorderPromotionsBulk(data, req),
  addProduct: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(productSchema, data)) as any;
    return await addProduct(v, req);
  },
  updateProduct: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(productSchema, data)) as any;
    return await updateProduct(v, req);
  },
  deleteProduct: async (data, req) => await deleteProduct(data, req),
  reorderProduct: async (data, req) => await reorderProduct(data, req),
  reorderProductsBulk: async (data, req) =>
    await reorderProductsBulk(data, req),
  addCategory: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(categorySchema, data)) as any;
    return await addCategory(v, req);
  },
  updateCategory: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(categorySchema, data)) as any;
    return await updateCategory(v, req);
  },
  deleteCategory: async (data, req) => await deleteCategory(data, req),
  reorderCategory: async (data, req) => await reorderCategory(data, req),
  updateSettings: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(updateSettingsSchema, data)) as any;
    return await updateSettingsAction(v, req);
  },
  updateOrderStatus: async (data, req) => {
    // deno-lint-ignore no-explicit-any
    const v = (await validate(updateOrderStatusSchema, data)) as any;
    return await updateOrderStatus(v, req);
  },
  deleteOrder: async (data, req) => await deleteOrder(data, req),
  getUsers: async (data, req) => await getUsers(data, req),
  updateUserRole: async (data, req) => await updateUserRole(data, req),
  getBlacklist: async (_data, req) => await getBlacklist(req),
  addToBlacklist: async (data, req) => await addToBlacklist(data, req),
  removeFromBlacklist: async (data, req) =>
    await removeFromBlacklist(data, req),
  testEmail: async (data, req) => await testEmail(data, req),
  addFormField: async (data, req) => await addFormField(data, req),
  updateFormField: async (data, req) => await updateFormField(data, req),
  deleteFormField: async (data, req) => await deleteFormField(data, req),
  reorderFormFields: async (data, req) => await reorderFormFields(data, req),
  uploadSiteIcon: async (data, req) => await uploadSiteIcon(data, req),
  linePayRefund: async (data, req) => await linePayRefund(data, req),
  addBankAccount: async (data, req) => await addBankAccount(data, req),
  updateBankAccount: async (data, req) => await updateBankAccount(data, req),
  deleteBankAccount: async (data, req) => await deleteBankAccount(data, req),
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
