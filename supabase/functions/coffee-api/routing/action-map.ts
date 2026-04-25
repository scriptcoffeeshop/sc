import {
  customerLineLogin,
  getLineLoginUrl,
  handleAdminLogin,
} from "../api/auth.ts";
import {
  addBankAccount,
  deleteBankAccount,
  getBankAccounts,
  reorderBankAccounts,
  updateBankAccount,
} from "../api/bank-accounts.ts";
import {
  addCategory,
  deleteCategory,
  getCategories,
  reorderCategory,
  updateCategory,
} from "../api/categories.ts";
import { sendLineFlexMessage, testEmail } from "../api/misc.ts";
import {
  batchDeleteOrders,
  batchUpdateOrderStatus,
  deleteOrder,
  getMyOrders,
  getOrders,
  sendOrderEmail,
  submitOrder,
  updateOrderStatus,
} from "../api/orders.ts";
import {
  jkoPayInquiry,
  jkoPayRefund,
  jkoPayResult,
  linePayCancel,
  linePayConfirm,
  linePayRefund,
  updateTransferInfo,
} from "../api/payments.ts";
import { getUserProfile, updateUserProfile } from "../api/profile.ts";
import {
  addProduct,
  deleteProduct,
  getProducts,
  reorderProduct,
  reorderProductsBulk,
  updateProduct,
} from "../api/products.ts";
import {
  addPromotion,
  deletePromotion,
  getPromotions,
  reorderPromotionsBulk,
  updatePromotion,
} from "../api/promotions.ts";
import { quoteOrder } from "../api/quote.ts";
import {
  getInitData,
  getSettings,
  updateSettingsAction,
  uploadAsset,
} from "../api/settings.ts";
import {
  createPcscMapSession,
  createStoreMapSession,
  getStoreList,
  getStoreSelection,
  handlePcscMapCallback,
  handleStoreMapCallback,
} from "../api/stores.ts";
import {
  addToBlacklist,
  deleteUser,
  getBlacklist,
  getUsers,
  removeFromBlacklist,
  updateUserAdminNote,
  updateUserPermissions,
  updateUserRole,
} from "../api/users.ts";
import { lineLoginSchema, transferInfoSchema } from "../schemas/auth.ts";
import {
  batchDeleteOrdersSchema,
  batchUpdateOrderStatusSchema,
  deleteOrderSchema,
  quoteOrderSchema,
  sendLineFlexMessageSchema,
  sendOrderEmailSchema,
  submitOrderSchema,
  updateOrderStatusSchema,
} from "../schemas/order.ts";
import { updateUserProfileSchema } from "../schemas/profile.ts";
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
} from "../schemas/settings.ts";
import {
  addToBlacklistSchema,
  deleteUserSchema,
  removeFromBlacklistSchema,
  updateUserAdminNoteSchema,
  updateUserPermissionsSchema,
  updateUserRoleSchema,
} from "../schemas/users.ts";
import {
  type AdminPermissionKey,
  type AuthResult,
  canAccessAdminPermission,
  extractAuth,
} from "../utils/auth.ts";
import {
  AUTH_ACTION_RATE_LIMIT,
  PAYMENT_ACTION_RATE_LIMIT,
  SUBMIT_ORDER_RATE_LIMIT,
} from "../utils/rate-limit-config.ts";
import { validate } from "../utils/validate.ts";
import type { z } from "zod";
import {
  addFormField,
  deleteFormField,
  getFormFields,
  getFormFieldsAdmin,
  reorderFormFields,
  updateFormField,
} from "../api/form-fields.ts";
import type { JsonRecord } from "../utils/json.ts";
import type { RateLimitConfig } from "../utils/rate-limit.ts";

export type ActionHandler = (
  data: JsonRecord,
  req: Request,
) => Promise<unknown>;
type ValidatedActionHandler<T extends z.ZodTypeAny> = (
  data: z.infer<T>,
  req: Request,
) => Promise<unknown>;

export type AccessLevel = "public" | "authenticated" | "admin";
export type HttpMethod = "GET" | "POST";

export interface ActionConfig {
  handler: ActionHandler;
  access: AccessLevel;
  methods?: readonly HttpMethod[];
  rateLimit?: RateLimitConfig;
  audit?: boolean;
  permission?: AdminPermissionKey | readonly AdminPermissionKey[];
}
type ActionOptions = Omit<ActionConfig, "handler" | "access">;

export interface WrappedActionContext {
  action: string;
  actionConfig: ActionConfig;
  auth: AuthResult | null;
}

export class ActionRequestError extends Error {
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
const MAP_SESSION_METHODS = ["GET", "POST"] as const;

function publicAction(
  handler: ActionHandler,
  options: ActionOptions = {},
): ActionConfig {
  return { handler, access: "public", ...options };
}

function authenticatedAction(
  handler: ActionHandler,
  options: ActionOptions = {},
): ActionConfig {
  return { handler, access: "authenticated", ...options };
}

function adminAction(
  handler: ActionHandler,
  options: ActionOptions = {},
): ActionConfig {
  return { handler, access: "admin", ...options };
}

function validatedAction<T extends z.ZodTypeAny>(
  schema: T,
  handler: ValidatedActionHandler<T>,
): ActionHandler {
  return async (data, req) => {
    const validData = await validate(schema, data);
    return await handler(validData, req);
  };
}

function withPostMethod(options: ActionOptions = {}): ActionOptions {
  return { ...options, methods: POST_ONLY };
}

function publicPost<T extends z.ZodTypeAny>(
  schema: T,
  handler: ValidatedActionHandler<T>,
  options: ActionOptions = {},
): ActionConfig {
  return publicAction(
    validatedAction(schema, handler),
    withPostMethod(options),
  );
}

function authPost<T extends z.ZodTypeAny>(
  schema: T,
  handler: ValidatedActionHandler<T>,
  options: ActionOptions = {},
): ActionConfig {
  return authenticatedAction(
    validatedAction(schema, handler),
    withPostMethod(options),
  );
}

function adminPost<T extends z.ZodTypeAny>(
  schema: T,
  handler: ValidatedActionHandler<T>,
  options: ActionOptions = {},
): ActionConfig {
  return adminAction(validatedAction(schema, handler), withPostMethod(options));
}

const ANY_SETTINGS_PERMISSION = [
  "settings",
  "checkoutSettings",
  "iconLibrary",
] as const satisfies readonly AdminPermissionKey[];

export const actionMap: Record<string, ActionConfig> = {
  getProducts: publicAction(async () => await getProducts()),
  getCategories: publicAction(async () => await getCategories()),
  getSettings: publicAction(async (_data, req) => {
    const auth = await extractAuth(req);
    return await getSettings(auth?.isAdmin || false);
  }),
  getInitData: publicAction(async (_data, req) => {
    const auth = await extractAuth(req);
    return await getInitData(auth?.isAdmin || false);
  }),
  getPromotions: publicAction(async () => await getPromotions()),
  getFormFields: publicAction(async () => await getFormFields(false)),
  getBankAccounts: publicAction(async () => await getBankAccounts()),
  getLineLoginUrl: publicAction((data) =>
    Promise.resolve(getLineLoginUrl(data.redirectUri as string))
  ),
  customerLineLogin: publicPost(
    lineLoginSchema,
    async (validData) =>
      await customerLineLogin(validData.code, validData.redirectUri),
    { rateLimit: AUTH_ACTION_RATE_LIMIT },
  ),
  lineLogin: publicPost(
    lineLoginSchema,
    async (validData) =>
      await handleAdminLogin(validData.code, validData.redirectUri),
    { rateLimit: AUTH_ACTION_RATE_LIMIT },
  ),
  getStoreList: publicAction(async (data) =>
    await getStoreList(data.cvsType as string)
  ),
  createStoreMapSession: publicAction(
    async (data) =>
      await createStoreMapSession(
        (data.deliveryMethod as string) || "",
        (data.clientUrl as string) || "",
      ),
    { methods: MAP_SESSION_METHODS },
  ),
  getStoreSelection: publicAction(async (data) =>
    await getStoreSelection(data.token as string)
  ),
  storeMapCallback: publicAction(async (data) =>
    await handleStoreMapCallback(data)
  ),
  quoteOrder: publicPost(
    quoteOrderSchema,
    async (validData) => await quoteOrder(validData),
  ),
  createPcscMapSession: publicAction(
    async (data) =>
      await createPcscMapSession((data.clientUrl as string) || ""),
    { methods: MAP_SESSION_METHODS },
  ),
  pcscMapCallback: publicAction(async (data) =>
    await handlePcscMapCallback(data)
  ),
  linePayConfirm: publicAction(async (data) => await linePayConfirm(data), {
    rateLimit: PAYMENT_ACTION_RATE_LIMIT,
  }),
  linePayCancel: publicAction(
    async (data, req) => await linePayCancel(data, req),
    { rateLimit: PAYMENT_ACTION_RATE_LIMIT },
  ),
  jkoPayResult: publicAction(
    async (data, req) => await jkoPayResult(data, req),
    { rateLimit: PAYMENT_ACTION_RATE_LIMIT },
  ),
  submitOrder: authPost(
    submitOrderSchema,
    submitOrder,
    { rateLimit: SUBMIT_ORDER_RATE_LIMIT },
  ),
  getMyOrders: authenticatedAction(async (_data, req) =>
    await getMyOrders(req)
  ),
  getUserProfile: authenticatedAction(async (data, req) =>
    await getUserProfile(data, req)
  ),
  updateUserProfile: authPost(
    updateUserProfileSchema,
    updateUserProfile,
  ),
  updateTransferInfo: authPost(
    transferInfoSchema,
    updateTransferInfo,
    { rateLimit: PAYMENT_ACTION_RATE_LIMIT },
  ),
  jkoPayInquiry: authenticatedAction(
    async (data, req) => await jkoPayInquiry(data, req),
    { rateLimit: PAYMENT_ACTION_RATE_LIMIT },
  ),
  verifyAdmin: authenticatedAction(async (_data, req) => {
    const auth = await extractAuth(req);
    return auth
      ? {
        success: true,
        isAdmin: auth.isAdmin,
        role: auth.role,
        adminPermissions: auth.adminPermissions,
        message: "OK",
      }
      : { success: false, isAdmin: false, message: "請先登入" };
  }),
  getFormFieldsAdmin: adminAction(
    async (_data, req) => await getFormFieldsAdmin(req),
    { permission: "formfields" },
  ),
  getOrders: adminAction(async (_data, req) => await getOrders(req), {
    permission: "orders",
  }),
  addPromotion: adminPost(promotionSchema, addPromotion, {
    permission: "promotions",
  }),
  updatePromotion: adminPost(promotionSchema, updatePromotion, {
    permission: "promotions",
  }),
  deletePromotion: adminPost(deleteByIdSchema, deletePromotion, {
    permission: "promotions",
  }),
  reorderPromotionsBulk: adminPost(
    reorderIdsSchema,
    reorderPromotionsBulk,
    { permission: "promotions" },
  ),
  addProduct: adminPost(productSchema, addProduct, { permission: "products" }),
  updateProduct: adminPost(productSchema, updateProduct, {
    permission: "products",
  }),
  deleteProduct: adminPost(deleteByIdSchema, deleteProduct, {
    permission: "products",
  }),
  reorderProduct: adminPost(
    reorderProductSchema,
    reorderProduct,
    { permission: "products" },
  ),
  reorderProductsBulk: adminPost(
    reorderIdsSchema,
    reorderProductsBulk,
    { permission: "products" },
  ),
  addCategory: adminPost(categorySchema, addCategory, {
    permission: "categories",
  }),
  updateCategory: adminPost(categorySchema, updateCategory, {
    permission: "categories",
  }),
  deleteCategory: adminPost(deleteByIdSchema, deleteCategory, {
    permission: "categories",
  }),
  reorderCategory: adminPost(reorderIdsSchema, reorderCategory, {
    permission: "categories",
  }),
  updateSettings: adminPost(
    updateSettingsSchema,
    updateSettingsAction,
    { permission: ANY_SETTINGS_PERMISSION },
  ),
  updateOrderStatus: adminPost(
    updateOrderStatusSchema,
    updateOrderStatus,
    { permission: "orders" },
  ),
  sendOrderEmail: adminPost(
    sendOrderEmailSchema,
    sendOrderEmail,
    { permission: "orders" },
  ),
  batchUpdateOrderStatus: adminPost(
    batchUpdateOrderStatusSchema,
    batchUpdateOrderStatus,
    { permission: "orders" },
  ),
  deleteOrder: adminPost(deleteOrderSchema, deleteOrder, {
    permission: "orders",
  }),
  batchDeleteOrders: adminPost(
    batchDeleteOrdersSchema,
    batchDeleteOrders,
    { permission: "orders" },
  ),
  getUsers: adminAction(async (_data, req) => await getUsers(req), {
    permission: "users",
  }),
  updateUserRole: adminPost(
    updateUserRoleSchema,
    updateUserRole,
    { permission: "users" },
  ),
  updateUserAdminNote: adminPost(
    updateUserAdminNoteSchema,
    updateUserAdminNote,
    { permission: "users" },
  ),
  updateUserPermissions: adminPost(
    updateUserPermissionsSchema,
    updateUserPermissions,
    { permission: "users" },
  ),
  deleteUser: adminPost(
    deleteUserSchema,
    deleteUser,
    { permission: "users" },
  ),
  getBlacklist: adminAction(async (_data, req) => await getBlacklist(req), {
    permission: "blacklist",
  }),
  addToBlacklist: adminPost(
    addToBlacklistSchema,
    addToBlacklist,
    { permission: "blacklist" },
  ),
  removeFromBlacklist: adminPost(
    removeFromBlacklistSchema,
    removeFromBlacklist,
    { permission: "blacklist" },
  ),
  testEmail: adminAction(async (data, req) => await testEmail(data, req), {
    methods: POST_ONLY,
    permission: "settings",
  }),
  sendLineFlexMessage: adminPost(
    sendLineFlexMessageSchema,
    sendLineFlexMessage,
    { permission: "orders" },
  ),
  addFormField: adminPost(addFormFieldSchema, addFormField, {
    permission: "formfields",
  }),
  updateFormField: adminPost(
    updateFormFieldSchema,
    updateFormField,
    { permission: "formfields" },
  ),
  deleteFormField: adminPost(
    deleteFormFieldSchema,
    deleteFormField,
    { permission: "formfields" },
  ),
  reorderFormFields: adminPost(
    reorderIdsSchema,
    reorderFormFields,
    { permission: "formfields" },
  ),
  uploadAsset: adminAction(async (data, req) => await uploadAsset(data, req), {
    methods: POST_ONLY,
    permission: ANY_SETTINGS_PERMISSION,
  }),
  linePayRefund: adminAction(
    async (data, req) => await linePayRefund(data, req),
    {
      methods: POST_ONLY,
      rateLimit: PAYMENT_ACTION_RATE_LIMIT,
      permission: "orders",
    },
  ),
  jkoPayRefund: adminAction(
    async (data, req) => await jkoPayRefund(data, req),
    {
      methods: POST_ONLY,
      rateLimit: PAYMENT_ACTION_RATE_LIMIT,
      permission: "orders",
    },
  ),
  addBankAccount: adminPost(
    addBankAccountSchema,
    addBankAccount,
    { permission: "checkoutSettings" },
  ),
  updateBankAccount: adminPost(
    updateBankAccountSchema,
    updateBankAccount,
    { permission: "checkoutSettings" },
  ),
  deleteBankAccount: adminPost(
    deleteBankAccountSchema,
    deleteBankAccount,
    { permission: "checkoutSettings" },
  ),
  reorderBankAccounts: adminPost(
    reorderIdsSchema,
    reorderBankAccounts,
    { permission: "checkoutSettings" },
  ),
};

export function shouldAuditAction(actionConfig: ActionConfig): boolean {
  if (typeof actionConfig.audit === "boolean") return actionConfig.audit;
  return actionConfig.access !== "public" ||
    Boolean(actionConfig.methods?.includes("POST"));
}

export function resolveActionName(data: JsonRecord): string {
  return String(data.action || "getProducts").trim() || "getProducts";
}

export function enforceActionMethod(
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

export async function resolveActionAuth(
  actionConfig: ActionConfig,
  req: Request,
): Promise<AuthResult | null> {
  if (actionConfig.access === "public") return null;
  return await extractAuth(req);
}

export function enforceActionAccess(
  actionConfig: ActionConfig,
  auth: AuthResult | null,
) {
  if (actionConfig.access === "public") return;
  if (!auth) throw new ActionRequestError(401, "請先登入");
  if (actionConfig.access === "admin" && !auth.isAdmin) {
    throw new ActionRequestError(401, "權限不足");
  }
  if (actionConfig.access === "admin" && actionConfig.permission) {
    const permissions = Array.isArray(actionConfig.permission)
      ? actionConfig.permission
      : [actionConfig.permission];
    if (
      !permissions.some((permission) =>
        canAccessAdminPermission(auth, permission)
      )
    ) {
      throw new ActionRequestError(401, "此管理員沒有此頁面的操作權限");
    }
  }
}
