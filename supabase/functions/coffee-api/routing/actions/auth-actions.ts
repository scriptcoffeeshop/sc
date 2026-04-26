import { getMyOrders, submitOrder } from "../../api/orders.ts";
import { jkoPayInquiry, updateTransferInfo } from "../../api/payments.ts";
import { getUserProfile, updateUserProfile } from "../../api/profile.ts";
import { transferInfoSchema } from "../../schemas/auth.ts";
import { submitOrderSchema } from "../../schemas/order.ts";
import { updateUserProfileSchema } from "../../schemas/profile.ts";
import { extractAuth } from "../../utils/auth.ts";
import {
  PAYMENT_ACTION_RATE_LIMIT,
  SUBMIT_ORDER_RATE_LIMIT,
} from "../../utils/rate-limit-config.ts";
import {
  type ActionConfig,
  authenticatedAction,
  authPost,
} from "../action-config.ts";

export const authenticatedActions: Record<string, ActionConfig> = {
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
};
