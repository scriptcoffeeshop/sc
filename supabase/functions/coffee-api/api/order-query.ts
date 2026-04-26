import { parseReceiptInfo, stripLegacyReceiptBlock } from "./order-shared.ts";
import { expireOnlinePaymentOrdersIfNeeded } from "./payment-shared.ts";
import { requireAdmin, requireAuth } from "../utils/auth.ts";
import type { JsonRecord } from "../utils/json.ts";
import { supabase } from "../utils/supabase.ts";

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

  const normalizedRows = await expireOnlinePaymentOrdersIfNeeded(data || []);
  const orders = normalizedRows.map((r: JsonRecord) => {
    const receiptInfo = parseReceiptInfo(r.receipt_info);
    return {
      orderId: r.id,
      timestamp: r.created_at,
      lineName: r.line_name,
      phone: r.phone,
      email: r.email,
      items: stripLegacyReceiptBlock(r.items, receiptInfo),
      itemsJson: Array.isArray(r.items_json) ? r.items_json : [],
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
      cancelReason: r.cancel_reason || "",
      lineUserId: r.line_user_id,
      paymentMethod: r.payment_method || "cod",
      paymentStatus: r.payment_status || "",
      paymentId: r.payment_id || "",
      paymentUrl: r.payment_redirect_url || "",
      paymentExpiresAt: r.payment_expires_at || "",
      paymentConfirmedAt: r.payment_confirmed_at || "",
      paymentLastCheckedAt: r.payment_last_checked_at || "",
      paymentProviderStatusCode: r.payment_provider_status_code || "",
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

  const normalizedRows = await expireOnlinePaymentOrdersIfNeeded(data || []);
  const orders = normalizedRows.map((r: JsonRecord) => {
    const receiptInfo = parseReceiptInfo(r.receipt_info);
    return {
      orderId: r.id,
      timestamp: r.created_at,
      items: stripLegacyReceiptBlock(r.items, receiptInfo),
      itemsJson: Array.isArray(r.items_json) ? r.items_json : [],
      total: r.total,
      deliveryMethod: r.delivery_method,
      status: r.status,
      cancelReason: r.cancel_reason || "",
      storeName: r.store_name,
      storeAddress: r.store_address,
      city: r.city,
      district: r.district,
      address: r.address,
      paymentMethod: r.payment_method || "cod",
      paymentStatus: r.payment_status || "",
      paymentUrl: r.payment_redirect_url || "",
      paymentExpiresAt: r.payment_expires_at || "",
      paymentConfirmedAt: r.payment_confirmed_at || "",
      paymentLastCheckedAt: r.payment_last_checked_at || "",
      paymentProviderStatusCode: r.payment_provider_status_code || "",
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
