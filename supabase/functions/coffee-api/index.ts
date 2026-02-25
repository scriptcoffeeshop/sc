// 咖啡豆訂購系統 — Supabase Edge Function (Modularized)
// @ts-ignore: deno
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import { parseRequestData } from "./utils/request.ts";
import { applyCorsHeaders, corsHeaders, jsonResponse } from "./utils/cors.ts";
import { extractAuth } from "./utils/auth.ts";

// API Modules
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

// ============ 主路由 ============
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return applyCorsHeaders(new Response("ok", { headers: corsHeaders }), req);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "getProducts";
  const data = await parseRequestData(req, url);

  let result: unknown;
  try {
    switch (action) {
      // 公開 API
      case "getProducts":
        result = await getProducts();
        break;
      case "getCategories":
        result = await getCategories();
        break;
      case "getSettings":
        result = await getSettings();
        break;
      case "getInitData":
        result = await getInitData();
        break;
      case "getPromotions":
        result = await getPromotions();
        break;
      case "getFormFields":
        result = await getFormFields(false);
        break;
      case "getLineLoginUrl":
        result = getLineLoginUrl(data.redirectUri as string);
        break;
      case "customerLineLogin": {
        const v = await validate(lineLoginSchema, data) as unknown;
        result = await customerLineLogin(v.code, v.redirectUri);
        break;
      }
      case "lineLogin": {
        const v = await validate(lineLoginSchema, data) as unknown;
        result = await handleAdminLogin(v.code, v.redirectUri);
        break;
      }
      case "getStoreList":
        result = await getStoreList(data.cvsType as string);
        break;
      case "createStoreMapSession":
        result = await createStoreMapSession(
          data.deliveryMethod as string ||
            url.searchParams.get("deliveryMethod") || "",
          data.clientUrl as string || url.searchParams.get("clientUrl") || "",
        );
        break;
      case "getStoreSelection":
        result = await getStoreSelection(data.token as string);
        break;
      case "storeMapCallback":
        result = await handleStoreMapCallback(data);
        break;
      case "getBankAccounts":
        result = await getBankAccounts();
        break;
      case "linePayConfirm":
        result = await linePayConfirm(data);
        break;
      case "linePayCancel":
        result = await linePayCancel(data, req);
        break;

      // 需登入
      case "submitOrder": {
        const v = await validate(submitOrderSchema, data) as unknown;
        result = await submitOrder(v, req);
        break;
      }
      case "getMyOrders":
        result = await getMyOrders(req);
        break;
      case "updateTransferInfo": {
        const v = await validate(transferInfoSchema, data) as unknown;
        result = await updateTransferInfo(v, req);
        break;
      }
      case "verifyAdmin": {
        const a = await extractAuth(req);
        result = a
          ? { success: true, isAdmin: a.isAdmin, role: a.role, message: "OK" }
          : { success: false, isAdmin: false, message: "請先登入" };
        break;
      }

      // 需管理員
      case "getFormFieldsAdmin":
        result = await getFormFieldsAdmin(req);
        break;
      case "getOrders":
        result = await getOrders(req);
        break;
      case "addPromotion": {
        const v = await validate(promotionSchema, data) as unknown;
        result = await addPromotion(v, req);
        break;
      }
      case "updatePromotion": {
        const v = await validate(promotionSchema, data) as unknown;
        result = await updatePromotion(v, req);
        break;
      }
      case "deletePromotion":
        result = await deletePromotion(data, req);
        break;
      case "reorderPromotionsBulk":
        result = await reorderPromotionsBulk(data, req);
        break;
      case "addProduct": {
        const v = await validate(productSchema, data) as unknown;
        result = await addProduct(v, req);
        break;
      }
      case "updateProduct": {
        const v = await validate(productSchema, data) as unknown;
        result = await updateProduct(v, req);
        break;
      }
      case "deleteProduct":
        result = await deleteProduct(data, req);
        break;
      case "reorderProduct":
        result = await reorderProduct(data, req);
        break;
      case "reorderProductsBulk":
        result = await reorderProductsBulk(data, req);
        break;
      case "addCategory": {
        const v = await validate(categorySchema, data) as unknown;
        result = await addCategory(v, req);
        break;
      }
      case "updateCategory": {
        const v = await validate(categorySchema, data) as unknown;
        result = await updateCategory(v, req);
        break;
      }
      case "deleteCategory":
        result = await deleteCategory(data, req);
        break;
      case "reorderCategory":
        result = await reorderCategory(data, req);
        break;
      case "updateSettings": {
        const v = await validate(updateSettingsSchema, data) as unknown;
        result = await updateSettingsAction(v, req);
        break;
      }
      case "updateOrderStatus": {
        const v = await validate(updateOrderStatusSchema, data) as unknown;
        result = await updateOrderStatus(v, req);
        break;
      }
      case "deleteOrder":
        result = await deleteOrder(data, req);
        break;
      case "getUsers":
        result = await getUsers(data, req);
        break;
      case "updateUserRole":
        result = await updateUserRole(data, req);
        break;
      case "getBlacklist":
        result = await getBlacklist(req);
        break;
      case "addToBlacklist":
        result = await addToBlacklist(data, req);
        break;
      case "removeFromBlacklist":
        result = await removeFromBlacklist(data, req);
        break;
      case "testEmail":
        result = await testEmail(data, req);
        break;
      case "addFormField":
        result = await addFormField(data, req);
        break;
      case "updateFormField":
        result = await updateFormField(data, req);
        break;
      case "deleteFormField":
        result = await deleteFormField(data, req);
        break;
      case "reorderFormFields":
        result = await reorderFormFields(data, req);
        break;
      case "uploadSiteIcon":
        result = await uploadSiteIcon(data, req);
        break;
      case "linePayRefund":
        result = await linePayRefund(data, req);
        break;
      case "addBankAccount":
        result = await addBankAccount(data, req);
        break;
      case "updateBankAccount":
        result = await updateBankAccount(data, req);
        break;
      case "deleteBankAccount":
        result = await deleteBankAccount(data, req);
        break;

      default:
        result = { success: false, error: "未知的操作" };
    }
  } catch (error) {
    const msg = String(error).replace(/^Error:\s*/, "");
    if (
      msg.includes("登入") || msg.includes("權限") || msg.includes("Token") ||
      msg.includes("無效")
    ) {
      return applyCorsHeaders(
        jsonResponse({ success: false, error: msg }, 401),
        req,
      );
    }
    result = { success: false, error: msg };
  }

  if (result instanceof Response) return applyCorsHeaders(result, req);
  return applyCorsHeaders(jsonResponse(result), req);
});
