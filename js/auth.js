// ============================================
// auth.js — LINE Login 認證 (客戶端 + 管理端共用)
// ============================================

import { API_URL } from './config.js';

/**
 * 啟動 LINE Login 流程
 * @param {string} redirectUri - LINE 回呼 URI
 * @param {string} stateKey   - localStorage key (例如 'coffee_line_state' 或 'coffee_admin_state')
 */
export async function loginWithLine(redirectUri, stateKey) {
    try {
        const r = await fetch(`${API_URL}?action=getLineLoginUrl&redirectUri=${encodeURIComponent(redirectUri)}`);
        const d = await r.json();
        if (d.success) {
            localStorage.setItem(stateKey, d.state);
            window.location.href = d.authUrl;
        } else { throw new Error(d.error); }
    } catch (e) { Swal.fire('錯誤', '無法啟動登入：' + e.message, 'error'); }
}
