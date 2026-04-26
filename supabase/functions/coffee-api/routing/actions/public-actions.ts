import {
  customerLineLogin,
  getLineLoginUrl,
  handleAdminLogin,
} from "../../api/auth.ts";
import { getBankAccounts } from "../../api/bank-accounts.ts";
import { getCategories } from "../../api/categories.ts";
import { getFormFields } from "../../api/form-fields.ts";
import { getPromotions } from "../../api/promotions.ts";
import { getProducts } from "../../api/products.ts";
import { quoteOrder } from "../../api/quote.ts";
import { getInitData, getSettings } from "../../api/settings.ts";
import {
  createPcscMapSession,
  createStoreMapSession,
  getStoreList,
  getStoreSelection,
  handlePcscMapCallback,
  handleStoreMapCallback,
} from "../../api/stores.ts";
import {
  jkoPayResult,
  linePayCancel,
  linePayConfirm,
} from "../../api/payments.ts";
import { lineLoginSchema } from "../../schemas/auth.ts";
import { quoteOrderSchema } from "../../schemas/order.ts";
import { extractAuth } from "../../utils/auth.ts";
import {
  AUTH_ACTION_RATE_LIMIT,
  PAYMENT_ACTION_RATE_LIMIT,
} from "../../utils/rate-limit-config.ts";
import {
  type ActionConfig,
  MAP_SESSION_METHODS,
  publicAction,
  publicPost,
} from "../action-config.ts";

export const publicActions: Record<string, ActionConfig> = {
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
};
