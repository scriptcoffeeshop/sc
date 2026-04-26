export const EMAIL_FORMAT_ERROR = "Email 格式不正確";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim();
}

export function isValidEmail(email: unknown): boolean {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

export function isBlankOrValidEmail(email: unknown): boolean {
  const normalized = normalizeEmail(email);
  return normalized === "" || isValidEmail(normalized);
}
