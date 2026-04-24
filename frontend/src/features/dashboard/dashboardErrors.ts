export function getDashboardErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) return error.message || fallback;
  return String(error || fallback);
}
