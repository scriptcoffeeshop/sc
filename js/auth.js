// ============================================
// auth.js — LINE Login 認證 (客戶端 + 管理端共用)
// ============================================

import { API_URL } from './config.js?v=21';

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

/**
 * 取得當前存儲的 JWT Token
 * @param {string} tokenKey - localStorage key (預設 'coffee_jwt')
 */
export function getAuthToken(tokenKey = 'coffee_jwt') {
    return localStorage.getItem(tokenKey);
}

/**
 * 封裝帶有 Authorization Header 的 fetch 請求
 */
export async function authFetch(url, options = {}, tokenKey = 'coffee_jwt') {
    const token = getAuthToken(tokenKey);
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // 如果沒有設定 Content-Type 且 options.body 存在而且不是 FormData，預設加上 application/json
    if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const config = {
        ...options,
        headers
    };

    const response = await fetch(url, config);

    if (response.status === 401) {
        console.warn('Unauthorized request, token might be expired or invalid.');
        localStorage.removeItem(tokenKey);
        throw new Error('登入已過期，請重新登入');
    }

    return response;
}
