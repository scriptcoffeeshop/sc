// ============================================
// utils.js — 共用工具函式
// ============================================

/** HTML 特殊字元跳脫 */
export function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** 簡寫別名 (dashboard 使用) */
export const esc = escapeHtml;

/** HTML 屬性跳脫 */
export function escapeAttr(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** SweetAlert2 Toast Mixin */
export const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
});
