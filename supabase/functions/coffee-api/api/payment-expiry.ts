import { supabase } from "../utils/supabase.ts";

export const EXPIRED_PAYMENT_FAILURE_REASON = "付款期限已過，自動設為失敗訂單";

const LINEPAY_PAYMENT_TIMEOUT_MS = 20 * 60 * 1000;

export function normalizePaymentStatus(
  value: unknown,
  fallback = "pending",
): string {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

export function parseIsoDate(value: unknown): Date | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function isPaymentExpired(
  paymentExpiresAt: unknown,
  now: Date,
): boolean {
  const deadline = parseIsoDate(paymentExpiresAt);
  if (!deadline) return false;
  return deadline.getTime() <= now.getTime();
}

function resolveOrderPaymentExpiresAt(order: Record<string, unknown>): string {
  const explicit = String(order.payment_expires_at || "").trim();
  if (explicit) return explicit;

  if (String(order.payment_method || "").trim() !== "linepay") {
    return "";
  }

  const createdAt = parseIsoDate(order.created_at);
  if (!createdAt) return "";
  return new Date(createdAt.getTime() + LINEPAY_PAYMENT_TIMEOUT_MS)
    .toISOString();
}

export function buildExpiredOnlinePaymentUpdates(
  order: Record<string, unknown> | null | undefined,
  now: Date = new Date(),
  options: { force?: boolean } = {},
): Record<string, unknown> | null {
  if (!order) return null;
  const paymentMethod = String(order.payment_method || "").trim();
  if (!["linepay", "jkopay"].includes(paymentMethod)) return null;

  const paymentStatus = normalizePaymentStatus(order.payment_status);
  const orderStatus = String(order.status || "pending").trim() || "pending";
  const statusReason = String(order.cancel_reason || "").trim();
  if (paymentStatus === "expired") {
    const updates: Record<string, unknown> = {};
    if (
      orderStatus === "cancelled" &&
      statusReason === EXPIRED_PAYMENT_FAILURE_REASON
    ) {
      updates.status = "failed";
    }
    if (!statusReason) {
      updates.cancel_reason = EXPIRED_PAYMENT_FAILURE_REASON;
    }
    return Object.keys(updates).length ? updates : null;
  }
  if (
    ["paid", "failed", "cancelled", "refunded"].includes(
      paymentStatus,
    )
  ) {
    return null;
  }

  const resolvedPaymentExpiresAt = resolveOrderPaymentExpiresAt(order);
  if (!options.force && !isPaymentExpired(resolvedPaymentExpiresAt, now)) {
    return null;
  }

  const updates: Record<string, unknown> = {
    payment_status: "expired",
    payment_last_checked_at: now.toISOString(),
  };
  if (
    resolvedPaymentExpiresAt && !String(order.payment_expires_at || "").trim()
  ) {
    updates.payment_expires_at = resolvedPaymentExpiresAt;
  }
  if (orderStatus === "pending") {
    updates.status = "failed";
    updates.cancel_reason = EXPIRED_PAYMENT_FAILURE_REASON;
  } else if (orderStatus === "failed" && !statusReason) {
    updates.cancel_reason = EXPIRED_PAYMENT_FAILURE_REASON;
  }
  return updates;
}

export async function expireOnlinePaymentOrderIfNeeded(
  order: Record<string, unknown> | null | undefined,
  now: Date = new Date(),
  options: { force?: boolean } = {},
): Promise<{ changed: boolean; order: Record<string, unknown> | null }> {
  if (!order) return { changed: false, order: null };
  const updates = buildExpiredOnlinePaymentUpdates(order, now, options);
  if (!updates) {
    return { changed: false, order: { ...order } };
  }

  const orderId = String(order.id || "").trim();
  if (orderId) {
    const { error } = await supabase.from("coffee_orders").update(updates).eq(
      "id",
      orderId,
    );
    if (error) {
      console.error(
        `[payment-expiry] failed to persist expired order state: ${orderId} (${error.message})`,
      );
    }
  }

  return {
    changed: true,
    order: {
      ...order,
      ...updates,
    },
  };
}

export async function expireOnlinePaymentOrdersIfNeeded(
  orders: Record<string, unknown>[],
  now: Date = new Date(),
): Promise<Record<string, unknown>[]> {
  const rows = Array.isArray(orders) ? orders : [];
  const normalizedRows: Record<string, unknown>[] = [];
  for (const order of rows) {
    const result = await expireOnlinePaymentOrderIfNeeded(order, now);
    normalizedRows.push(result.order || { ...order });
  }
  return normalizedRows;
}
