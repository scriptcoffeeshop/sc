import {
  addBankAccount,
  deleteBankAccount,
  reorderBankAccounts,
  updateBankAccount,
} from "../../api/bank-accounts.ts";
import {
  addCategory,
  deleteCategory,
  reorderCategory,
  updateCategory,
} from "../../api/categories.ts";
import {
  addFormField,
  deleteFormField,
  getFormFieldsAdmin,
  reorderFormFields,
  updateFormField,
} from "../../api/form-fields.ts";
import { sendLineFlexMessage, testEmail } from "../../api/misc.ts";
import {
  batchDeleteOrders,
  batchUpdateOrderStatus,
  deleteOrder,
  getOrders,
  sendOrderEmail,
  updateOrderStatus,
} from "../../api/orders.ts";
import { jkoPayRefund, linePayRefund } from "../../api/payments.ts";
import {
  addProduct,
  deleteProduct,
  reorderProduct,
  reorderProductsBulk,
  updateProduct,
} from "../../api/products.ts";
import {
  addPromotion,
  deletePromotion,
  reorderPromotionsBulk,
  updatePromotion,
} from "../../api/promotions.ts";
import { updateSettingsAction, uploadAsset } from "../../api/settings.ts";
import {
  addToBlacklist,
  deleteUser,
  getBlacklist,
  getUsers,
  removeFromBlacklist,
  updateUserAdminNote,
  updateUserPermissions,
  updateUserRole,
} from "../../api/users.ts";
import {
  batchDeleteOrdersSchema,
  batchUpdateOrderStatusSchema,
  deleteOrderSchema,
  sendLineFlexMessageSchema,
  sendOrderEmailSchema,
  updateOrderStatusSchema,
} from "../../schemas/order.ts";
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
} from "../../schemas/settings.ts";
import {
  addToBlacklistSchema,
  deleteUserSchema,
  removeFromBlacklistSchema,
  updateUserAdminNoteSchema,
  updateUserPermissionsSchema,
  updateUserRoleSchema,
} from "../../schemas/users.ts";
import { PAYMENT_ACTION_RATE_LIMIT } from "../../utils/rate-limit-config.ts";
import {
  type ActionConfig,
  adminAction,
  adminPost,
  ANY_SETTINGS_PERMISSION,
  POST_ONLY,
} from "../action-config.ts";

export const adminActions: Record<string, ActionConfig> = {
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
