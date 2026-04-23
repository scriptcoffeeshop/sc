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
  getBlacklist,
  getUsers,
  removeFromBlacklist,
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
  removeFromBlacklistSchema,
  updateUserRoleSchema,
} from "../schemas/users.ts";
import { type AuthResult, extractAuth } from "../utils/auth.ts";
import {
  AUTH_ACTION_RATE_LIMIT,
  PAYMENT_ACTION_RATE_LIMIT,
  SUBMIT_ORDER_RATE_LIMIT,
} from "../utils/rate-limit-config.ts";
import { validate } from "../utils/validate.ts";
import {
  addFormField,
  deleteFormField,
  getFormFields,
  getFormFieldsAdmin,
  reorderFormFields,
  updateFormField,
} from "../api/form-fields.ts";
import type { RateLimitConfig } from "../utils/rate-limit.ts";

export type ActionHandler = (
  data: Record<string, unknown>,
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
}

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
  customerLineLogin: publicAction(async (data) => {
    const validData = await validate(lineLoginSchema, data);
    return await customerLineLogin(validData.code, validData.redirectUri);
  }, { methods: POST_ONLY, rateLimit: AUTH_ACTION_RATE_LIMIT }),
  lineLogin: publicAction(async (data) => {
    const validData = await validate(lineLoginSchema, data);
    return await handleAdminLogin(validData.code, validData.redirectUri);
  }, { methods: POST_ONLY, rateLimit: AUTH_ACTION_RATE_LIMIT }),
  getStoreList: publicAction(async (data) =>
    await getStoreList(data.cvsType as string)
  ),
  createStoreMapSession: publicAction(
    async (data) =>
      await createStoreMapSession(
        (data.deliveryMethod as string) || "",
        (data.clientUrl as string) || "",
      ),
    { methods: POST_ONLY },
  ),
  getStoreSelection: publicAction(async (data) =>
    await getStoreSelection(data.token as string)
  ),
  storeMapCallback: publicAction(async (data) =>
    await handleStoreMapCallback(data)
  ),
  quoteOrder: publicAction(async (data) => {
    const validData = await validate(quoteOrderSchema, data);
    return await quoteOrder(validData);
  }, { methods: POST_ONLY }),
  createPcscMapSession: publicAction(
    async (data) =>
      await createPcscMapSession((data.clientUrl as string) || ""),
    { methods: POST_ONLY },
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
  submitOrder: authenticatedAction(async (data, req) => {
    const validData = await validate(submitOrderSchema, data);
    return await submitOrder(validData, req);
  }, { methods: POST_ONLY, rateLimit: SUBMIT_ORDER_RATE_LIMIT }),
  getMyOrders: authenticatedAction(async (_data, req) =>
    await getMyOrders(req)
  ),
  getUserProfile: authenticatedAction(async (data, req) =>
    await getUserProfile(data, req)
  ),
  updateUserProfile: authenticatedAction(async (data, req) => {
    const validData = await validate(updateUserProfileSchema, data);
    return await updateUserProfile(validData, req);
  }, { methods: POST_ONLY }),
  updateTransferInfo: authenticatedAction(async (data, req) => {
    const validData = await validate(transferInfoSchema, data);
    return await updateTransferInfo(validData, req);
  }, { methods: POST_ONLY, rateLimit: PAYMENT_ACTION_RATE_LIMIT }),
  jkoPayInquiry: authenticatedAction(
    async (data, req) => await jkoPayInquiry(data, req),
    { rateLimit: PAYMENT_ACTION_RATE_LIMIT },
  ),
  verifyAdmin: authenticatedAction(async (_data, req) => {
    const auth = await extractAuth(req);
    return auth
      ? { success: true, isAdmin: auth.isAdmin, role: auth.role, message: "OK" }
      : { success: false, isAdmin: false, message: "請先登入" };
  }),
  getFormFieldsAdmin: adminAction(async (_data, req) =>
    await getFormFieldsAdmin(req)
  ),
  getOrders: adminAction(async (_data, req) => await getOrders(req)),
  addPromotion: adminAction(async (data, req) => {
    const validData = await validate(promotionSchema, data);
    return await addPromotion(validData, req);
  }, { methods: POST_ONLY }),
  updatePromotion: adminAction(async (data, req) => {
    const validData = await validate(promotionSchema, data);
    return await updatePromotion(validData, req);
  }, { methods: POST_ONLY }),
  deletePromotion: adminAction(async (data, req) => {
    const validData = await validate(deleteByIdSchema, data);
    return await deletePromotion(validData, req);
  }, { methods: POST_ONLY }),
  reorderPromotionsBulk: adminAction(async (data, req) => {
    const validData = await validate(reorderIdsSchema, data);
    return await reorderPromotionsBulk(validData, req);
  }, { methods: POST_ONLY }),
  addProduct: adminAction(async (data, req) => {
    const validData = await validate(productSchema, data);
    return await addProduct(validData, req);
  }, { methods: POST_ONLY }),
  updateProduct: adminAction(async (data, req) => {
    const validData = await validate(productSchema, data);
    return await updateProduct(validData, req);
  }, { methods: POST_ONLY }),
  deleteProduct: adminAction(async (data, req) => {
    const validData = await validate(deleteByIdSchema, data);
    return await deleteProduct(validData, req);
  }, { methods: POST_ONLY }),
  reorderProduct: adminAction(async (data, req) => {
    const validData = await validate(reorderProductSchema, data);
    return await reorderProduct(validData, req);
  }, { methods: POST_ONLY }),
  reorderProductsBulk: adminAction(async (data, req) => {
    const validData = await validate(reorderIdsSchema, data);
    return await reorderProductsBulk(validData, req);
  }, { methods: POST_ONLY }),
  addCategory: adminAction(async (data, req) => {
    const validData = await validate(categorySchema, data);
    return await addCategory(validData, req);
  }, { methods: POST_ONLY }),
  updateCategory: adminAction(async (data, req) => {
    const validData = await validate(categorySchema, data);
    return await updateCategory(validData, req);
  }, { methods: POST_ONLY }),
  deleteCategory: adminAction(async (data, req) => {
    const validData = await validate(deleteByIdSchema, data);
    return await deleteCategory(validData, req);
  }, { methods: POST_ONLY }),
  reorderCategory: adminAction(async (data, req) => {
    const validData = await validate(reorderIdsSchema, data);
    return await reorderCategory(validData, req);
  }, { methods: POST_ONLY }),
  updateSettings: adminAction(async (data, req) => {
    const validData = await validate(updateSettingsSchema, data);
    return await updateSettingsAction(validData, req);
  }, { methods: POST_ONLY }),
  updateOrderStatus: adminAction(async (data, req) => {
    const validData = await validate(updateOrderStatusSchema, data);
    return await updateOrderStatus(validData, req);
  }, { methods: POST_ONLY }),
  sendOrderEmail: adminAction(async (data, req) => {
    const validData = await validate(sendOrderEmailSchema, data);
    return await sendOrderEmail(validData, req);
  }, { methods: POST_ONLY }),
  batchUpdateOrderStatus: adminAction(async (data, req) => {
    const validData = await validate(batchUpdateOrderStatusSchema, data);
    return await batchUpdateOrderStatus(validData, req);
  }, { methods: POST_ONLY }),
  deleteOrder: adminAction(async (data, req) => {
    const validData = await validate(deleteOrderSchema, data);
    return await deleteOrder(validData, req);
  }, { methods: POST_ONLY }),
  batchDeleteOrders: adminAction(async (data, req) => {
    const validData = await validate(batchDeleteOrdersSchema, data);
    return await batchDeleteOrders(validData, req);
  }, { methods: POST_ONLY }),
  getUsers: adminAction(async (_data, req) => await getUsers(req)),
  updateUserRole: adminAction(async (data, req) => {
    const validData = await validate(updateUserRoleSchema, data);
    return await updateUserRole(validData, req);
  }, { methods: POST_ONLY }),
  getBlacklist: adminAction(async (_data, req) => await getBlacklist(req)),
  addToBlacklist: adminAction(async (data, req) => {
    const validData = await validate(addToBlacklistSchema, data);
    return await addToBlacklist(validData, req);
  }, { methods: POST_ONLY }),
  removeFromBlacklist: adminAction(async (data, req) => {
    const validData = await validate(removeFromBlacklistSchema, data);
    return await removeFromBlacklist(validData, req);
  }, { methods: POST_ONLY }),
  testEmail: adminAction(async (data, req) => await testEmail(data, req), {
    methods: POST_ONLY,
  }),
  sendLineFlexMessage: adminAction(async (data, req) => {
    const validData = await validate(sendLineFlexMessageSchema, data);
    return await sendLineFlexMessage(validData, req);
  }, { methods: POST_ONLY }),
  addFormField: adminAction(async (data, req) => {
    const validData = await validate(addFormFieldSchema, data);
    return await addFormField(validData, req);
  }, { methods: POST_ONLY }),
  updateFormField: adminAction(async (data, req) => {
    const validData = await validate(updateFormFieldSchema, data);
    return await updateFormField(validData, req);
  }, { methods: POST_ONLY }),
  deleteFormField: adminAction(async (data, req) => {
    const validData = await validate(deleteFormFieldSchema, data);
    return await deleteFormField(validData, req);
  }, { methods: POST_ONLY }),
  reorderFormFields: adminAction(async (data, req) => {
    const validData = await validate(reorderIdsSchema, data);
    return await reorderFormFields(validData, req);
  }, { methods: POST_ONLY }),
  uploadAsset: adminAction(async (data, req) => await uploadAsset(data, req), {
    methods: POST_ONLY,
  }),
  linePayRefund: adminAction(
    async (data, req) => await linePayRefund(data, req),
    {
      methods: POST_ONLY,
      rateLimit: PAYMENT_ACTION_RATE_LIMIT,
    },
  ),
  jkoPayRefund: adminAction(
    async (data, req) => await jkoPayRefund(data, req),
    {
      methods: POST_ONLY,
      rateLimit: PAYMENT_ACTION_RATE_LIMIT,
    },
  ),
  addBankAccount: adminAction(async (data, req) => {
    const validData = await validate(addBankAccountSchema, data);
    return await addBankAccount(validData, req);
  }, { methods: POST_ONLY }),
  updateBankAccount: adminAction(async (data, req) => {
    const validData = await validate(updateBankAccountSchema, data);
    return await updateBankAccount(validData, req);
  }, { methods: POST_ONLY }),
  deleteBankAccount: adminAction(async (data, req) => {
    const validData = await validate(deleteBankAccountSchema, data);
    return await deleteBankAccount(validData, req);
  }, { methods: POST_ONLY }),
  reorderBankAccounts: adminAction(async (data, req) => {
    const validData = await validate(reorderIdsSchema, data);
    return await reorderBankAccounts(validData, req);
  }, { methods: POST_ONLY }),
};

export function shouldAuditAction(actionConfig: ActionConfig): boolean {
  if (typeof actionConfig.audit === "boolean") return actionConfig.audit;
  return actionConfig.access !== "public" ||
    Boolean(actionConfig.methods?.includes("POST"));
}

export function resolveActionName(data: Record<string, unknown>): string {
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
}
