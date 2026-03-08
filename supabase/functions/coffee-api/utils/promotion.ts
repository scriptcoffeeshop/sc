/**
 * 將折扣值轉為折後比例（0~1）。
 * 相容格式：
 * - 0.9 => 0.9 折
 * - 9   => 9 折
 * - 90  => 9 折（舊格式）
 */
export function normalizeDiscountRate(discountValue: number): number {
  const raw = Number(discountValue);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  if (raw <= 1) return raw;
  if (raw <= 10) return raw / 10;
  if (raw <= 100) return raw / 100;
  return 1;
}

/**
 * 依折扣值計算「折扣金額」。
 */
export function calcPercentDiscountAmount(
  subtotal: number,
  discountValue: number,
): number {
  const safeSubtotal = Math.max(0, Math.round(Number(subtotal) || 0));
  if (safeSubtotal <= 0) return 0;
  const rate = normalizeDiscountRate(discountValue);
  const discountedTotal = Math.round(safeSubtotal * rate);
  return Math.max(0, safeSubtotal - discountedTotal);
}

/**
 * 判斷活動是否在有效時間內（含起訖）。
 * 若時間字串格式無效，視為無效活動以避免誤套用。
 */
export function isPromotionActive(
  startTime?: string | null,
  endTime?: string | null,
  now: Date = new Date(),
): boolean {
  const nowTs = now.getTime();

  if (startTime) {
    const startTs = Date.parse(startTime);
    if (!Number.isFinite(startTs)) return false;
    if (nowTs < startTs) return false;
  }

  if (endTime) {
    const endTs = Date.parse(endTime);
    if (!Number.isFinite(endTs)) return false;
    if (nowTs > endTs) return false;
  }

  return true;
}
