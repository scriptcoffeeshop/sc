import { FRONTEND_URL } from "./config.ts";

export function resolveEmailLogoUrl(rawLogoUrl: unknown): string {
  const raw = String(rawLogoUrl || "").trim();
  if (!raw) return `${FRONTEND_URL}/icons/logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;

  const frontendBase = String(FRONTEND_URL || "").replace(/\/+$/, "");
  const normalized = raw.replace(/^\.?\//, "");
  if (!frontendBase) return normalized;
  if (!normalized) return `${frontendBase}/icons/logo.png`;
  return `${frontendBase}/${normalized}`;
}
