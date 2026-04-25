import { getErrorMessage } from "../../lib/errorMessage.ts";

export function getDashboardErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return getErrorMessage(error, fallback);
}
