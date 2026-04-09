import { supabase } from "../utils/supabase.ts";
import { requireAdmin, requireAuth } from "../utils/auth.ts";
import { FRONTEND_URL, VALID_ORDER_STATUSES } from "../utils/config.ts";
import { sanitize } from "../utils/html.ts";
import { sendEmail } from "../utils/email.ts";
import { requestLinePayAPI } from "../utils/linepay.ts";
import { buildOrderQuote } from "./quote.ts";
import {
  buildCompletedNotificationHtml,
  buildOrderConfirmationHtml,
  buildShippingNotificationHtml,
  normalizeEmailSiteTitle,
} from "../utils/email-templates.ts";

import { registerOrUpdateUser } from "../utils/users.ts";

interface ReceiptInfo {
  buyer: string;
  taxId: string;
  address: string;
  needDateStamp: boolean;
}

function normalizeReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  const buyer = String(data.buyer || "").trim();
  const taxId = String(data.taxId || "").trim();
  const address = String(data.address || "").trim();
  const needDateStamp = Boolean(data.needDateStamp);

  if (taxId && !/^\d{8}$/.test(taxId)) return null;

  return { buyer, taxId, address, needDateStamp };
}

function parseReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return null;
    try {
      return normalizeReceiptInfo(JSON.parse(str));
    } catch {
      return null;
    }
  }
  return normalizeReceiptInfo(raw);
}

function buildReceiptHtml(receiptInfo: ReceiptInfo | null): string {
  if (!receiptInfo) return "";
  return `<p style="margin: 0 0 10px 0;"><strong>收據資訊：</strong><br>
    統一編號：${sanitize(receiptInfo.taxId) || "未填寫"}<br>
    買受人：${sanitize(receiptInfo.buyer) || "未填寫"}<br>
    地址：${sanitize(receiptInfo.address) || "未填寫"}<br>
    壓印日期：${receiptInfo.needDateStamp ? "需要" : "不需要"}
  </p>`;
}

function stripLegacyReceiptBlock(
  rawItems: unknown,
  receiptInfo: ReceiptInfo | null,
): string {
  const text = String(rawItems || "");
  if (!receiptInfo || !text.includes("[收據資訊]")) return text;

  const lines = text.split(/\r?\n/);
  const markerIndex = lines.findIndex((line) => line.trim() === "[收據資訊]");
  if (markerIndex < 0) return text;

  const receiptTail = lines.slice(markerIndex).join("\n");
  const looksLikeReceiptTail = receiptTail.includes("統一編號：") &&
    receiptTail.includes("壓印日期：");
  if (!looksLikeReceiptTail) return text;

  const kept = lines.slice(0, markerIndex);
  while (kept.length > 0 && kept[kept.length - 1].trim() === "") kept.pop();
  return kept.join("\n");
}

async function buildCustomFieldsHtml(
  rawCustomFields: unknown,
): Promise<string> {
  const raw = rawCustomFields === undefined || rawCustomFields === null
    ? ""
    : String(rawCustomFields).trim();
  if (!raw) return "";

  let parsedFields: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return `<p style="margin: 0 0 10px 0;"><strong>其他資訊：</strong> ${
        sanitize(raw)
      }</p>`;
    }
    parsedFields = { ...(parsed as Record<string, unknown>) };
  } catch {
    return `<p style="margin: 0 0 10px 0;"><strong>其他資訊：</strong> ${
      sanitize(raw)
    }</p>`;
  }

  if (!Object.keys(parsedFields).length) return "";

  const { data: formFields } = await supabase.from("coffee_form_fields")
    .select("field_key, label, sort_order")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  let customFieldsHtml = "";

  if (formFields && formFields.length > 0) {
    for (const field of formFields) {
      const key = String(field.field_key || "");
      if (!Object.prototype.hasOwnProperty.call(parsedFields, key)) continue;
      customFieldsHtml += `<p style="margin: 0 0 10px 0;"><strong>${
        sanitize(String(field.label || key))
      }：</strong> ${sanitize(String(parsedFields[key]))}</p>`;
      delete parsedFields[key];
    }
  }

  for (const [key, val] of Object.entries(parsedFields)) {
    customFieldsHtml += `<p style="margin: 0 0 10px 0;"><strong>${
      sanitize(key)
    }：</strong> ${sanitize(String(val))}</p>`;
  }

  return customFieldsHtml;
}

async function getEmailSiteTitle(): Promise<string> {
  const { data: siteRow } = await supabase.from("coffee_settings").select(
    "value",
  ).eq("key", "site_title").single();
  return normalizeEmailSiteTitle(String(siteRow?.value || ""));
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

  const now = new Date();

  // 冪等鍵：前端傳入，用於 DB unique constraint 防重複提交
  const idempotencyKey = String(data.idempotencyKey || "").trim();

  // 訂單號：日期前綴 + UUID 前 8 碼，確保唯一性
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
    custom_fields: data.customFields || "",
    receipt_info: receiptInfo ? JSON.stringify(receiptInfo) : "",
    payment_method: paymentMethod,
    payment_status: paymentMethod === "cod" ? "" : "pending",
    transfer_account_last5: paymentMethod === "transfer"
      ? String(data.transferAccountLast5 || "")
      : "",
    payment_id: paymentMethod === "transfer"
      ? String(data.transferTargetAccount || "")
      : "",
  };
  if (idempotencyKey) insertPayload.idempotency_key = idempotencyKey;

  const { error } = await supabase.from("coffee_orders").insert(insertPayload);

  if (error) {
    // 23505 = unique_violation (PostgreSQL)
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
      });
    } catch { /* ignore */ }
  }

  if (paymentMethod === "linepay") {
    try {
      const confirmUrl =
        `${FRONTEND_URL}/main.html?lpAction=confirm&orderId=${orderId}`;
      const cancelUrl =
        `${FRONTEND_URL}/main.html?lpAction=cancel&orderId=${orderId}`;

      const reqBody = {
        amount: total,
        currency: "TWD",
        orderId: orderId,
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

      // deno-lint-ignore no-explicit-any
      const lpRes: any = await requestLinePayAPI(
        "POST",
        "/v3/payments/request",
        reqBody,
      );

      if (lpRes.returnCode === "0000" && lpRes.info) {
        const transactionId = String(lpRes.info.transactionId);
        await supabase.from("coffee_orders").update({
          payment_id: transactionId,
        }).eq("id", orderId);
        return {
          success: true,
          orderId,
          total,
          paymentUrl: lpRes.info.paymentUrl?.web ||
            lpRes.info.paymentUrl?.app || "",
          transactionId,
        };
      } else {
        await supabase.from("coffee_orders").update({
          payment_status: "failed",
        }).eq("id", orderId);
        return {
          success: false,
          error: `LINE Pay 請求失敗: ${
            lpRes.returnMessage || lpRes.returnCode
          }`,
          orderId,
        };
      }
    } catch (e) {
      await supabase.from("coffee_orders").update({ payment_status: "failed" })
        .eq("id", orderId);
      return {
        success: false,
        error: "LINE Pay 付款請求失敗: " + String(e),
        orderId,
      };
    }
  }

  return { success: true, message: "訂單已送出", orderId, total };
}

export async function getOrders(req: Request) {
  await requireAdmin(req);
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "50")),
  );
  const offset = (page - 1) * pageSize;

  let query = supabase.from("coffee_orders").select("*", { count: "exact" });
  if (search) {
    query = query.or(
      `id.ilike.%${search}%,line_name.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }
  query = query.order("created_at", { ascending: false }).range(
    offset,
    offset + pageSize - 1,
  );

  const { data, count, error } = await query;
  if (error) return { success: false, error: error.message };

  const orders = (data || []).map((r: Record<string, unknown>) => {
    const receiptInfo = parseReceiptInfo(r.receipt_info);
    return {
      orderId: r.id,
      timestamp: r.created_at,
      lineName: r.line_name,
      phone: r.phone,
      email: r.email,
      items: stripLegacyReceiptBlock(r.items, receiptInfo),
      total: r.total,
      deliveryMethod: r.delivery_method,
      city: r.city,
      district: r.district,
      address: r.address,
      storeType: r.store_type,
      storeId: r.store_id,
      storeName: r.store_name,
      storeAddress: r.store_address,
      status: r.status,
      note: r.note,
      lineUserId: r.line_user_id,
      paymentMethod: r.payment_method || "cod",
      paymentStatus: r.payment_status || "",
      paymentId: r.payment_id || "",
      transferAccountLast5: r.transfer_account_last5 || "",
      receiptInfo,
      trackingNumber: r.tracking_number || "",
      shippingProvider: r.shipping_provider || "",
      trackingUrl: r.tracking_url || "",
    };
  });
  return {
    success: true,
    orders,
    pagination: {
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      page,
      pageSize,
    },
  };
}

export async function getMyOrders(req: Request) {
  const auth = await requireAuth(req);
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20")),
  );
  const offset = (page - 1) * pageSize;

  const { data, count, error } = await supabase.from("coffee_orders")
    .select("*", { count: "exact" })
    .eq("line_user_id", auth.userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) return { success: false, error: error.message };

  const orders = (data || []).map((r: Record<string, unknown>) => {
    const receiptInfo = parseReceiptInfo(r.receipt_info);
    return {
      orderId: r.id,
      timestamp: r.created_at,
      items: stripLegacyReceiptBlock(r.items, receiptInfo),
      total: r.total,
      deliveryMethod: r.delivery_method,
      status: r.status,
      storeName: r.store_name,
      storeAddress: r.store_address,
      city: r.city,
      address: r.address,
      paymentMethod: r.payment_method || "cod",
      paymentStatus: r.payment_status || "",
      receiptInfo,
      trackingNumber: r.tracking_number || "",
      shippingProvider: r.shipping_provider || "",
      trackingUrl: r.tracking_url || "",
    };
  });
  return {
    success: true,
    orders,
    pagination: {
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      page,
      pageSize,
    },
  };
}

export async function updateOrderStatus(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);

  const newStatus = String(data.status);
  if (!VALID_ORDER_STATUSES.includes(newStatus)) {
    return {
      success: false,
      error: "無效的訂單狀態，允許值：" + VALID_ORDER_STATUSES.join(", "),
    };
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (data.paymentStatus !== undefined) {
    updates.payment_status = String(data.paymentStatus);
  }
  if (data.trackingNumber !== undefined) {
    updates.tracking_number = String(data.trackingNumber);
  }
  if (data.shippingProvider !== undefined) {
    updates.shipping_provider = String(data.shippingProvider);
  }
  if (data.trackingUrl !== undefined) {
    updates.tracking_url = String(data.trackingUrl);
  }

  const { error } = await supabase.from("coffee_orders").update(updates).eq(
    "id",
    data.orderId,
  );
  if (error) return { success: false, error: error.message };

  return { success: true, message: "訂單狀態已更新" };
}

function resolveOrderEmailMode(
  modeInput: unknown,
  orderStatus: string,
): "confirmation" | "shipping" | "completed" {
  const mode = String(modeInput || "").trim();
  if (mode === "confirmation" || mode === "shipping" || mode === "completed") {
    return mode;
  }
  if (orderStatus === "shipped") return "shipping";
  if (orderStatus === "completed") return "completed";
  return "confirmation";
}

export async function sendOrderEmail(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);

  const orderId = String(data.orderId || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const { data: orderData, error } = await supabase.from("coffee_orders")
    .select(
      "id, status, line_name, phone, email, items, total, delivery_method, city, district, address, store_name, store_address, note, custom_fields, receipt_info, payment_method, payment_status, payment_id, transfer_account_last5, shipping_provider, tracking_url, tracking_number",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!orderData) return { success: false, error: "找不到訂單" };

  const to = String(orderData.email || "").trim();
  if (!to) return { success: false, error: "此訂單未填寫 Email，無法發送" };

  const siteTitle = await getEmailSiteTitle();
  const orderStatus = String(orderData.status || "pending");
  const mode = resolveOrderEmailMode(data.mode, orderStatus);
  const lineName = String(orderData.line_name || "").trim() || "顧客";

  let subject = "";
  let htmlContent = "";

  if (mode === "shipping") {
    htmlContent = buildShippingNotificationHtml({
      orderId,
      siteTitle,
      lineName,
      deliveryMethod: String(orderData.delivery_method || ""),
      city: String(orderData.city || ""),
      district: String(orderData.district || ""),
      address: String(orderData.address || ""),
      storeName: String(orderData.store_name || ""),
      storeAddress: String(orderData.store_address || ""),
      paymentMethod: String(orderData.payment_method || "cod"),
      paymentStatus: String(orderData.payment_status || ""),
      trackingNumber: String(orderData.tracking_number || ""),
      shippingProvider: String(orderData.shipping_provider || ""),
      trackingUrl: String(orderData.tracking_url || ""),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已出貨通知`;
  } else if (mode === "completed") {
    htmlContent = buildCompletedNotificationHtml({
      orderId,
      siteTitle,
      lineName,
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 已完成通知`;
  } else {
    const receiptInfo = parseReceiptInfo(orderData.receipt_info);
    const customFieldsHtml = await buildCustomFieldsHtml(
      orderData.custom_fields,
    );
    htmlContent = buildOrderConfirmationHtml({
      orderId,
      siteTitle,
      lineName,
      phone: String(orderData.phone || ""),
      deliveryMethod: String(orderData.delivery_method || ""),
      city: String(orderData.city || ""),
      district: String(orderData.district || ""),
      address: String(orderData.address || ""),
      storeName: String(orderData.store_name || ""),
      storeAddress: String(orderData.store_address || ""),
      paymentMethod: String(orderData.payment_method || "cod"),
      transferTargetAccount: String(orderData.payment_id || ""),
      transferAccountLast5: String(orderData.transfer_account_last5 || ""),
      note: String(orderData.note || ""),
      ordersText: stripLegacyReceiptBlock(orderData.items, receiptInfo),
      total: Number(orderData.total) || 0,
      customFieldsHtml,
      receiptHtml: buildReceiptHtml(receiptInfo),
    });
    subject = `[${siteTitle}] 訂單編號 ${orderId} 成立確認信`;
  }

  const emailResult = await sendEmail(to, subject, htmlContent);
  if (!emailResult.success) {
    return { success: false, error: emailResult.error || "信件發送失敗" };
  }

  const modeLabel = mode === "shipping"
    ? "出貨通知"
    : mode === "completed"
    ? "完成通知"
    : "成立確認信";

  return {
    success: true,
    message: `信件已發送（${modeLabel}）`,
    orderId,
    mode,
    to,
  };
}

export async function deleteOrder(data: Record<string, unknown>, req: Request) {
  await requireAdmin(req);
  const { error } = await supabase.from("coffee_orders").delete().eq(
    "id",
    data.orderId,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "訂單已刪除" };
}

export async function batchUpdateOrderStatus(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const orderIdsRaw = Array.isArray(data.orderIds) ? data.orderIds : [];
  const orderIds = [...new Set(orderIdsRaw.map((id) => String(id).trim()))]
    .filter((id) => id.length > 0);
  if (!orderIds.length) {
    return { success: false, error: "請至少選擇一筆訂單" };
  }

  const failedOrderIds: string[] = [];
  const status = String(data.status || "");
  const payload: Record<string, unknown> = { status };
  if (data.paymentStatus !== undefined) {
    payload.paymentStatus = String(data.paymentStatus);
  }
  if (data.trackingNumber !== undefined) {
    payload.trackingNumber = String(data.trackingNumber);
  }
  if (data.shippingProvider !== undefined) {
    payload.shippingProvider = String(data.shippingProvider);
  }
  if (data.trackingUrl !== undefined) {
    payload.trackingUrl = String(data.trackingUrl);
  }

  for (const orderId of orderIds) {
    const result = await updateOrderStatus({ ...payload, orderId }, req);
    if (!(result as Record<string, unknown>)?.success) {
      failedOrderIds.push(orderId);
    }
  }

  const updatedCount = orderIds.length - failedOrderIds.length;
  if (failedOrderIds.length > 0) {
    return {
      success: false,
      error: `部分訂單更新失敗（成功 ${updatedCount} / ${orderIds.length}）`,
      updatedCount,
      failedOrderIds,
    };
  }

  return {
    success: true,
    message: `已更新 ${updatedCount} 筆訂單狀態`,
    updatedCount,
  };
}

export async function batchDeleteOrders(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const orderIdsRaw = Array.isArray(data.orderIds) ? data.orderIds : [];
  const orderIds = [...new Set(orderIdsRaw.map((id) => String(id).trim()))]
    .filter((id) => id.length > 0);
  if (!orderIds.length) {
    return { success: false, error: "請至少選擇一筆訂單" };
  }

  const { error } = await supabase.from("coffee_orders").delete().in(
    "id",
    orderIds,
  );
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    message: `已刪除 ${orderIds.length} 筆訂單`,
    deletedCount: orderIds.length,
  };
}
