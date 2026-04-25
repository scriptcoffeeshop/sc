import { getErrorMessage } from "../../lib/errorMessage.ts";

export function getStorefrontErrorMessage(
  error: unknown,
  fallback = "發生未知錯誤",
): string {
  return getErrorMessage(error, fallback);
}
