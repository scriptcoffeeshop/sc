// LINE Login 與帶 JWT 的 fetch。正式入口由 Vue/Vite bundle 直接匯入。

import Swal from "./swal.ts";
import { API_URL } from "./appConfig.ts";
import { createLogger } from "./logger.ts";

const logger = createLogger("auth");

/**
 * 啟動 LINE Login 流程
 * @param redirectUri LINE 回呼 URI
 * @param stateKey localStorage key，例如 `coffee_line_state` 或 `coffee_admin_state`
 */
export async function loginWithLine(
  redirectUri: string,
  stateKey: string,
): Promise<void> {
  try {
    const r = await fetch(
      `${API_URL}?action=getLineLoginUrl&redirectUri=${
        encodeURIComponent(redirectUri)
      }`,
    );
    const d = await r.json();
    if (d.success) {
      localStorage.setItem(stateKey, d.state);
      window.location.href = d.authUrl;
      return;
    }
    throw new Error(d.error);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e || "未知錯誤");
    Swal.fire("錯誤", "無法啟動登入：" + message, "error");
  }
}

/**
 * 取得當前存儲的 JWT Token
 */
export function getAuthToken(tokenKey = "coffee_jwt"): string | null {
  return localStorage.getItem(tokenKey);
}

/**
 * 封裝帶有 Authorization Header 的 fetch 請求
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
  tokenKey = "coffee_jwt",
): Promise<Response> {
  const token = getAuthToken(tokenKey);
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    !headers.has("Content-Type") && options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logger.warn("Unauthorized request, token might be expired or invalid.");
    localStorage.removeItem(tokenKey);
    throw new Error("登入已過期，請重新登入");
  }

  return response;
}
