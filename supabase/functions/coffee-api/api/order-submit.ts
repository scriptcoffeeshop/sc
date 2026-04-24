import { buildOrderQuote } from "./quote.ts";
import { shouldSkipCustomerNotificationForPaymentStatus } from "./customer-notification-policy.ts";
import {
  buildCustomFieldsHtml,
  buildReceiptHtml,
  createJkoPayCallbackSignature,
  createLinePayCallbackSignature,
  getEmailBranding,
  isOrderConfirmationAutoEmailEnabled,
  normalizeCustomFields,
  normalizeReceiptInfo,
  type OrderCreatedLineNotifyParams,
  persistOrderCreatedLineNotifyResult,
  resolveApiCallbackBase,
  resolveJkoPaymentExpiresAtIso,
  resolveLinePayPaymentExpiresAtIso,
  resolveMainPageUrlWithQuery,
  sendAdminOrderCreatedFlexNotification,
  sendCustomerOrderCreatedFlexNotification,
  trimLineNotifyError,
} from "./order-shared.ts";
import { requireAuth } from "../utils/auth.ts";
import { FRONTEND_URL } from "../utils/config.ts";
import { sendEmail } from "../utils/email.ts";
import { buildOrderConfirmationHtml } from "../utils/email-templates.ts";
import { requestJkoPayEntry } from "../utils/jkopay.ts";
import { requestLinePayAPI } from "../utils/linepay.ts";
import { supabase } from "../utils/supabase.ts";
import { registerOrUpdateUser } from "../utils/users.ts";

interface LinePayRequestResponse {
  returnCode?: string;
  returnMessage?: string;
  info?: {
    transactionId?: string | number;
    paymentUrl?: {
      web?: string;
      app?: string;
    };
  };
}

export async function submitOrder(data: Record<string, unknown>, req: Request) {
  const auth = await requireAuth(req);
  const lineUserId = auth.userId;

  const q = supabase.from("coffee_users").select(
    "status, blocked_at, blacklist_reason",
  ).eq("line_user_id", lineUserId);

  const { data: userRow } = await q.maybeSingle();
  if (userRow && (userRow.status === "BLACKLISTED" || userRow.blocked_at)) {
    const reason = userRow.blacklist_reason || "違反系統使用規範";
    return { success: false, error: `帳號已被停權，原因：${reason}` };
  }

  if (!data.lineName) {
    return { success: false, error: "請填寫您的 LINE 名稱" };
  }

  const paymentMethod = String(data.paymentMethod || "cod");
  const quoteResult = await buildOrderQuote({
    items: data.items as unknown[],
    deliveryMethod: data.deliveryMethod,
    paymentMethod,
  });
  if (!quoteResult.success) return quoteResult;

  const quote = quoteResult.quote;
  const deliveryMethod = quote.deliveryMethod;
  const total = quote.total;
  const ordersText = quote.ordersText;

  if (deliveryMethod === "delivery") {
    const city = String(data.city || "");
    if (!["竹北市", "新竹市"].includes(city)) {
      return { success: false, error: "配送範圍僅限竹北市及新竹市" };
    }
    if (!data.address) {
      return { success: false, error: "請填寫配送地址" };
    }
  }

  if (deliveryMethod === "seven_eleven" || deliveryMethod === "family_mart") {
    if (!data.storeName) {
      return { success: false, error: "請選擇取貨門市" };
    }
  }

  const phone = String(data.phone || "").replace(/[\s-]/g, "");
  if (phone && !/^(09\d{8}|0[2-8]\d{7,8})$/.test(phone)) {
    return { success: false, error: "電話格式不正確" };
  }
  const receiptInfo = normalizeReceiptInfo(data.receiptInfo);
  const customFields = normalizeCustomFields(data.customFields);

  const now = new Date();
  const idempotencyKey = String(data.idempotencyKey || "").trim();

  const pad = (n: number) => String(n).padStart(2, "0");
  const uuidHex = crypto.randomUUID().replace(/-/g, "").slice(0, 8)
    .toUpperCase();
  const orderId = `C${now.getFullYear()}${pad(now.getMonth() + 1)}${
    pad(now.getDate())
  }-${uuidHex}`;

  const insertPayload: Record<string, unknown> = {
    id: orderId,
    created_at: now.toISOString(),
    line_user_id: lineUserId,
    line_name: String(data.lineName).trim(),
    phone,
    email: String(data.email || "").trim(),
    items: ordersText,
    items_json: quote.items,
    total,
    delivery_method: deliveryMethod,
    city: data.city || "",
    district: data.district || "",
    address: data.address || "",
    store_type: deliveryMethod === "seven_eleven"
      ? "7-11"
      : deliveryMethod === "family_mart"
      ? "全家"
      : "",
    store_id: data.storeId || "",
    store_name: data.storeName || "",
    store_address: data.storeAddress || "",
    status: "pending",
    note: data.note || "",
    custom_fields: customFields,
    payment_method: paymentMethod,
    payment_status: paymentMethod === "cod" ? "" : "pending",
    transfer_account_last5: paymentMethod === "transfer"
      ? String(data.transferAccountLast5 || "")
      : "",
    payment_id: paymentMethod === "transfer"
      ? String(data.transferTargetAccount || "")
      : "",
  };
  if (receiptInfo) insertPayload.receipt_info = receiptInfo;
  if (idempotencyKey) insertPayload.idempotency_key = idempotencyKey;

  const { error } = await supabase.from("coffee_orders").insert(insertPayload);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "此訂單已提交過，請勿重複送出" };
    }
    return { success: false, error: error.message };
  }

  if (lineUserId) {
    try {
      await registerOrUpdateUser({
        userId: lineUserId,
        displayName: String(data.lineName),
        pictureUrl: "",
        phone,
        email: String(data.email || "").trim(),
        deliveryMethod,
        city: String(data.city || ""),
        district: String(data.district || ""),
        address: String(data.address || ""),
        storeId: String(data.storeId || ""),
        storeName: String(data.storeName || ""),
        storeAddress: String(data.storeAddress || ""),
        defaultCustomFields: customFields,
        paymentMethod,
        transferAccountLast5: paymentMethod === "transfer"
          ? String(data.transferAccountLast5 || "")
          : "",
        receiptInfo: receiptInfo ?? null,
      });
    } catch (_error) {
      // ignore user profile sync failures on order submit
    }
  }

  const customerEmail = String(data.email || "").trim();
  const autoSendConfirmationEmail = await isOrderConfirmationAutoEmailEnabled();
  const shouldSendCustomerNotifications =
    !shouldSkipCustomerNotificationForPaymentStatus(
      insertPayload.payment_status,
    );
  if (
    customerEmail && insertPayload.status === "pending" &&
    autoSendConfirmationEmail &&
    shouldSendCustomerNotifications
  ) {
    try {
      const { siteTitle, siteLogoUrl } = await getEmailBranding();
      const customFieldsHtml = await buildCustomFieldsHtml(data.customFields);
      const confirmationHtml = buildOrderConfirmationHtml({
        orderId,
        siteTitle,
        logoUrl: siteLogoUrl,
        lineName: String(data.lineName || "").trim() || "顧客",
        phone,
        deliveryMethod,
        city: String(data.city || ""),
        district: String(data.district || ""),
        address: String(data.address || ""),
        storeName: String(data.storeName || ""),
        storeAddress: String(data.storeAddress || ""),
        paymentMethod,
        transferTargetAccount: String(data.transferTargetAccount || ""),
        transferAccountLast5: paymentMethod === "transfer"
          ? String(data.transferAccountLast5 || "")
          : "",
        note: String(data.note || ""),
        ordersText,
        total,
        customFieldsHtml,
        receiptHtml: buildReceiptHtml(receiptInfo),
      });
      const subject = `[${siteTitle}] 訂單編號 ${orderId} 成立確認信`;
      const emailResult = await sendEmail(
        customerEmail,
        subject,
        confirmationHtml,
      );
      if (!emailResult.success) {
        console.error(
          `[submitOrder] failed to auto send confirmation email: ${orderId} -> ${customerEmail} (${
            emailResult.error || "unknown"
          })`,
        );
      }
    } catch (error) {
      console.error(
        `[submitOrder] unexpected error while sending confirmation email: ${orderId}`,
        error,
      );
    }
  }

  if (insertPayload.status === "pending") {
    const lineNotifyPayload = {
      orderId,
      status: "pending",
      deliveryMethod,
      city: String(data.city || ""),
      district: String(data.district || ""),
      address: String(data.address || ""),
      storeName: String(data.storeName || ""),
      storeAddress: String(data.storeAddress || ""),
      paymentMethod,
      paymentStatus: String(insertPayload.payment_status || ""),
      total,
      ordersText,
      note: String(data.note || ""),
      receiptInfo,
    } satisfies OrderCreatedLineNotifyParams;
    try {
      await sendAdminOrderCreatedFlexNotification(lineNotifyPayload);
    } catch (error) {
      console.error(
        `[submitOrder] unexpected error while sending admin LINE flex notification: ${orderId}`,
        error,
      );
    }
    if (shouldSendCustomerNotifications) {
      try {
        const customerNotifyResult =
          await sendCustomerOrderCreatedFlexNotification(
            {
              ...lineNotifyPayload,
              lineUserId,
            },
          );
        await persistOrderCreatedLineNotifyResult(
          orderId,
          customerNotifyResult,
        );
      } catch (error) {
        console.error(
          `[submitOrder] unexpected error while sending customer LINE flex notification: ${orderId}`,
          error,
        );
        await persistOrderCreatedLineNotifyResult(orderId, {
          attempted: true,
          success: false,
          target: String(lineUserId || "").trim(),
          error: trimLineNotifyError(error),
        });
      }
    }
  }

  if (paymentMethod === "linepay") {
    try {
      const callbackSig = encodeURIComponent(
        await createLinePayCallbackSignature(orderId),
      );
      const encodedOrderId = encodeURIComponent(orderId);
      const confirmUrl =
        `${FRONTEND_URL}/main.html?lpAction=confirm&orderId=${encodedOrderId}&sig=${callbackSig}`;
      const cancelUrl =
        `${FRONTEND_URL}/main.html?lpAction=cancel&orderId=${encodedOrderId}&sig=${callbackSig}`;

      const reqBody = {
        amount: total,
        currency: "TWD",
        orderId,
        packages: [{
          id: "1",
          amount: total,
          products: [{
            name: `咖啡訂單 ${orderId}`,
            quantity: 1,
            price: total,
          }],
        }],
        redirectUrls: { confirmUrl, cancelUrl },
      };

      const lpRes = await requestLinePayAPI<LinePayRequestResponse>(
        "POST",
        "/v3/payments/request",
        reqBody,
      );

      if (lpRes.returnCode === "0000" && lpRes.info) {
        const transactionId = String(lpRes.info.transactionId);
        const paymentUrl = String(
          lpRes.info.paymentUrl?.web || lpRes.info.paymentUrl?.app || "",
        ).trim();
        await supabase.from("coffee_orders").update({
          payment_id: transactionId,
          payment_expires_at: resolveLinePayPaymentExpiresAtIso(),
          payment_last_checked_at: new Date().toISOString(),
          payment_redirect_url: paymentUrl,
        }).eq("id", orderId);
        return {
          success: true,
          orderId,
          total,
          paymentUrl,
          transactionId,
        };
      }

      await supabase.from("coffee_orders").update({
        payment_status: "failed",
        payment_last_checked_at: new Date().toISOString(),
      }).eq("id", orderId);
      return {
        success: false,
        error: `LINE Pay 請求失敗: ${lpRes.returnMessage || lpRes.returnCode}`,
        orderId,
      };
    } catch (e) {
      await supabase.from("coffee_orders").update({
        payment_status: "failed",
        payment_last_checked_at: new Date().toISOString(),
      })
        .eq("id", orderId);
      return {
        success: false,
        error: "LINE Pay 付款請求失敗: " + String(e),
        orderId,
      };
    }
  }

  if (paymentMethod === "jkopay") {
    try {
      const callbackSig = encodeURIComponent(
        await createJkoPayCallbackSignature(orderId),
      );
      const encodedOrderId = encodeURIComponent(orderId);
      const callbackBase = resolveApiCallbackBase(req);
      const callbackQuery =
        `action=jkoPayResult&orderId=${encodedOrderId}&sig=${callbackSig}`;
      const callbackUrl = `${callbackBase}?${callbackQuery}`;
      const resultDisplayUrl = resolveMainPageUrlWithQuery(
        new URLSearchParams({ jkoOrderId: orderId }),
      );

      const entryRes = await requestJkoPayEntry({
        platformOrderId: orderId,
        currency: "TWD",
        totalPrice: total,
        finalPrice: total,
        unredeem: 0,
        confirmUrl: callbackUrl,
        resultUrl: callbackUrl,
        resultDisplayUrl,
      });

      const resultCode = String(entryRes.result || "").trim();
      const resultMessage = String(entryRes.message || "").trim();
      const resultObject = entryRes.result_object &&
          typeof entryRes.result_object === "object" &&
          !Array.isArray(entryRes.result_object)
        ? entryRes.result_object as Record<string, unknown>
        : {};
      const paymentUrl = String(resultObject.payment_url || "").trim();
      const paymentExpiresAt = resolveJkoPaymentExpiresAtIso(
        resultObject.qr_timeout,
      );

      if (resultCode === "000" && paymentUrl) {
        const { error: updateEntryError } = await supabase.from("coffee_orders")
          .update({
            payment_expires_at: paymentExpiresAt,
            payment_last_checked_at: new Date().toISOString(),
            payment_provider_status_code: "",
            payment_redirect_url: paymentUrl,
          })
          .eq("id", orderId);
        if (updateEntryError) {
          console.warn(
            `[jkopay] failed to persist entry metadata: ${orderId} (${updateEntryError.message})`,
          );
        }
        return {
          success: true,
          orderId,
          total,
          paymentUrl,
          qrImage: String(resultObject.qr_img || "").trim(),
          qrTimeout: Number(resultObject.qr_timeout || 0) || 0,
          paymentExpiresAt,
        };
      }

      await supabase.from("coffee_orders").update({
        payment_status: "failed",
        payment_last_checked_at: new Date().toISOString(),
        payment_provider_status_code: resultCode || "",
      }).eq("id", orderId);
      const resultObjectSummary = Object.keys(resultObject).length > 0
        ? (() => {
          try {
            return JSON.stringify(resultObject).slice(0, 240);
          } catch (_error) {
            return "";
          }
        })()
        : "";
      const failureParts = [
        resultMessage || resultCode || "未知錯誤",
      ];
      if (resultCode) failureParts.unshift(`code=${resultCode}`);
      if (resultObjectSummary) {
        failureParts.push(`detail=${resultObjectSummary}`);
      }
      console.error("[jkopay] entry failed", {
        orderId,
        resultCode,
        resultMessage,
        resultObject,
        callbackUrl,
        resultDisplayUrl,
      });
      return {
        success: false,
        error: `街口支付建單失敗: ${failureParts.join(" | ")}`,
        orderId,
      };
    } catch (e) {
      await supabase.from("coffee_orders").update({
        payment_status: "failed",
        payment_last_checked_at: new Date().toISOString(),
      }).eq("id", orderId);
      return {
        success: false,
        error: "街口支付建單失敗: " + String(e),
        orderId,
      };
    }
  }

  return { success: true, message: "訂單已送出", orderId, total };
}
