import { supabase } from "../utils/supabase.ts";
import { requireAdmin, requireAuth } from "../utils/auth.ts";
import {
  FRONTEND_URL,
  SMTP_USER,
  VALID_ORDER_STATUSES,
} from "../utils/config.ts";
import { sanitize } from "../utils/html.ts";
import { sendEmail } from "../utils/email.ts";
import { requestLinePayAPI } from "../utils/linepay.ts";
import { buildOrderQuote } from "./quote.ts";
import {
  buildOrderConfirmationHtml,
  buildShippingNotificationHtml,
} from "../utils/email-templates.ts";

import { registerOrUpdateUser } from "../utils/users.ts";

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

  if (data.email) {
    // 從資料庫取得表單欄位設定，作為 customFields 的 Label 映射與排序依據
    const { data: formFields } = await supabase.from("coffee_form_fields")
      .select("field_key, label, sort_order")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });

    let customFieldsHtml = "";
    if (data.customFields && typeof data.customFields === "string") {
      try {
        const parsedFields = JSON.parse(data.customFields);
        if (Object.keys(parsedFields).length > 0) {
          // 依據表單欄位定義的順序進行處理
          if (formFields && formFields.length > 0) {
            for (const field of formFields) {
              const key = field.field_key;
              if (parsedFields[key] !== undefined) {
                customFieldsHtml += `<p style="margin: 0 0 10px 0;"><strong>${
                  sanitize(field.label)
                }：</strong> ${sanitize(String(parsedFields[key]))}</p>`;
                delete parsedFields[key]; // 已處理過的移除
              }
            }
          }
          // 處理剩餘不在設定中的欄位（若有）
          for (const [key, val] of Object.entries(parsedFields)) {
            customFieldsHtml += `<p style="margin: 0 0 10px 0;"><strong>${
              sanitize(key)
            }：</strong> ${sanitize(String(val))}</p>`;
          }
        }
      } catch {
        // 解析失敗則直接以字串顯示
        customFieldsHtml +=
          `<p style="margin: 0 0 10px 0;"><strong>其他資訊：</strong> ${
            sanitize(data.customFields)
          }</p>`;
      }
    }

    // 查詢 site_title
    const { data: siteRow } = await supabase.from("coffee_settings").select(
      "value",
    ).eq("key", "site_title").single();
    const siteTitle = siteRow?.value || "咖啡訂購";

    const content = buildOrderConfirmationHtml({
      orderId,
      siteTitle,
      lineName: String(data.lineName),
      phone,
      deliveryMethod,
      city: String(data.city || ""),
      district: String(data.district || ""),
      address: String(data.address || ""),
      storeName: String(data.storeName || ""),
      storeAddress: String(data.storeAddress || ""),
      paymentMethod,
      transferTargetAccount: String(data.transferTargetAccount || ""),
      transferAccountLast5: String(data.transferAccountLast5 || ""),
      note: String(data.note || ""),
      ordersText,
      total,
      customFieldsHtml,
    });
    await sendEmail(
      String(data.email),
      `[${siteTitle}] 訂單編號 ${orderId} 成立確認信`,
      content,
    );
    if (SMTP_USER) {
      await sendEmail(
        SMTP_USER,
        `[${siteTitle}] 新訂單通知 - 訂單編號 ${orderId}`,
        content,
      );
    }
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

  const orders = (data || []).map((r: Record<string, unknown>) => ({
    orderId: r.id,
    timestamp: r.created_at,
    lineName: r.line_name,
    phone: r.phone,
    email: r.email,
    items: r.items,
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
    trackingNumber: r.tracking_number || "",
  }));
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

  const orders = (data || []).map((r: Record<string, unknown>) => ({
    orderId: r.id,
    timestamp: r.created_at,
    items: r.items,
    total: r.total,
    deliveryMethod: r.delivery_method,
    status: r.status,
    storeName: r.store_name,
    storeAddress: r.store_address,
    city: r.city,
    address: r.address,
    paymentMethod: r.payment_method || "cod",
    paymentStatus: r.payment_status || "",
    trackingNumber: r.tracking_number || "",
  }));
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
  if (data.paymentStatus) {
    updates.payment_status = String(data.paymentStatus);
  }
  if (data.trackingNumber !== undefined) {
    updates.tracking_number = String(data.trackingNumber);
  }

  const { data: orderData } = await supabase.from("coffee_orders").select(
    "email, line_name, delivery_method, city, district, address, store_name, store_address, payment_method, payment_status",
  ).eq("id", data.orderId).single();

  const { error } = await supabase.from("coffee_orders").update(updates).eq(
    "id",
    data.orderId,
  );
  if (error) return { success: false, error: error.message };

  if (data.status === "shipped" && orderData?.email) {
    // 查詢 site_title
    const { data: siteTitleRow } = await supabase.from("coffee_settings")
      .select("value").eq("key", "site_title").single();
    const shippedSiteTitle = siteTitleRow?.value || "咖啡訂購";

    const content = buildShippingNotificationHtml({
      orderId: String(data.orderId),
      siteTitle: shippedSiteTitle,
      lineName: String(orderData.line_name),
      deliveryMethod: String(orderData.delivery_method),
      city: String(orderData.city || ""),
      district: String(orderData.district || ""),
      address: String(orderData.address || ""),
      storeName: String(orderData.store_name || ""),
      storeAddress: String(orderData.store_address || ""),
      paymentMethod: String(orderData.payment_method),
      paymentStatus: String(orderData.payment_status),
      trackingNumber: String(data.trackingNumber || ""),
    });

    await sendEmail(
      String(orderData.email),
      `[${shippedSiteTitle}] 訂單編號 ${data.orderId} 已出貨通知`,
      content,
    );
  }

  return { success: true, message: "訂單狀態已更新" };
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
