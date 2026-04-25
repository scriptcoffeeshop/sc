export function getErrorMessage(
  error: unknown,
  fallback = "發生未知錯誤",
): string {
  if (error instanceof Error) return error.message || fallback;
  return String(error || fallback);
}
