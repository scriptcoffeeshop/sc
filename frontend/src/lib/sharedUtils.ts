// 前後台共用工具。UI class helper 仍保留在 `frontend/src/lib/utils.ts`。

import Swal from "./swal.ts";
export {
  EMAIL_FORMAT_ERROR,
  isBlankOrValidEmail,
  isValidEmail,
  normalizeEmail,
} from "./emailValidation.ts";

/** HTML 特殊字元跳脫 */
export function escapeHtml(s: unknown): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(
    />/g,
    "&gt;",
  ).replace(/"/g, "&quot;");
}

/** 簡寫別名 (dashboard 使用) */
export const esc = escapeHtml;

/** HTML 屬性跳脫 */
export function escapeAttr(s: unknown): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** SweetAlert2 Toast Mixin */
export const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2000,
});
