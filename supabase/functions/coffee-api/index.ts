// ============================================
// 咖啡豆訂購系統 — Supabase Edge Function (Hono Router)
// ============================================

import { Hono } from "hono";
import { cors } from "hono/cors";
import { ALLOWED_REDIRECT_ORIGINS } from "./utils/config.ts";
import { parseRequestData } from "./utils/request.ts";
import { type AuthResult } from "./utils/auth.ts";
import type { JsonRecord } from "./utils/json.ts";
import { createLogger } from "./utils/logger.ts";
import {
  type RateLimitConfig,
  type RateLimitStore,
} from "./utils/rate-limit.ts";
import {
  ActionConfig,
  actionMap,
  ActionRequestError,
  enforceActionAccess,
  enforceActionMethod,
  resolveActionAuth,
  resolveActionName,
  shouldAuditAction,
  type WrappedActionContext,
} from "./routing/action-map.ts";
import {
  actionRateLimitStore,
  DEFAULT_RATE_LIMIT,
  globalRateLimitStore,
} from "./utils/rate-limit-config.ts";

// ============ 建立 Hono 應用程式 ============
const app = new Hono();
const actionAuditLogger = createLogger("action-audit");

// CORS 中介層
app.use(
  "*",
  cors({
    origin: (origin: string) => {
      if (ALLOWED_REDIRECT_ORIGINS.includes(origin)) return origin;
      return ALLOWED_REDIRECT_ORIGINS[0] || "*";
    },
    allowHeaders: ["authorization", "x-client-info", "apikey", "content-type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

// ============ 簡易 IP Rate Limiter ============
function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const xRealIp = req.headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;

  const forwarded = req.headers.get("x-forwarded-for");
  const firstForwardedIp = forwarded?.split(",")[0]?.trim();
  if (firstForwardedIp) return firstForwardedIp;

  return "unknown";
}

async function consumeRateLimit(
  store: RateLimitStore,
  key: string,
  config: RateLimitConfig,
  now: number,
): Promise<number | null> {
  return await store.consume(key, config, now);
}

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return await next();

  const now = Date.now();
  const ip = getClientIp(c.req.raw);
  const retryAfterSec = await consumeRateLimit(
    globalRateLimitStore,
    `global:${ip}`,
    DEFAULT_RATE_LIMIT,
    now,
  );
  if (retryAfterSec !== null) {
    c.header("Retry-After", String(retryAfterSec));
    return c.json(
      { success: false, error: "您的請求過於頻繁，請稍後再試" },
      429,
    );
  }

  await next();
});

async function enforceActionRateLimit(
  action: string,
  actionConfig: ActionConfig,
  req: Request,
  auth: AuthResult | null,
) {
  if (!actionConfig.rateLimit) return;

  const scope = auth?.userId || getClientIp(req);
  const retryAfterSec = await consumeRateLimit(
    actionRateLimitStore,
    `action:${action}:${scope}`,
    actionConfig.rateLimit,
    Date.now(),
  );
  if (retryAfterSec === null) return;

  throw new ActionRequestError(
    429,
    "操作過於頻繁，請稍後再試",
    { "Retry-After": String(retryAfterSec) },
  );
}

function extractAuditError(result: unknown): string {
  if (!result || typeof result !== "object" || Array.isArray(result)) return "";
  if (!("error" in result)) return "";
  return String(result.error || "").trim();
}

function isAuditSuccess(result: unknown, status: number): boolean {
  if (status >= 400) return false;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return status < 400;
  }
  if (!("success" in result)) return status < 400;
  return result.success !== false;
}

function logActionAudit(params: {
  action: string;
  actionConfig: ActionConfig | null;
  req: Request;
  auth: AuthResult | null;
  status: number;
  durationMs: number;
  success: boolean;
  error?: string;
}) {
  const record = {
    ts: new Date().toISOString(),
    action: params.action,
    access: params.actionConfig?.access || "unknown",
    method: params.req.method,
    ip: getClientIp(params.req),
    userId: params.auth?.userId || "",
    role: params.auth?.role || "",
    isAdmin: params.auth?.isAdmin || false,
    status: params.status,
    durationMs: params.durationMs,
    success: params.success,
    error: String(params.error || "").trim(),
  };
  if (params.status >= 500) {
    actionAuditLogger.error("Action completed with server error", record);
    return;
  }
  if (!params.success || params.status >= 400) {
    actionAuditLogger.warn("Action completed with client warning", record);
    return;
  }
  actionAuditLogger.info("Action completed", record);
}

function wrapHandler(
  handler: (
    data: JsonRecord,
    req: Request,
    context: WrappedActionContext,
  ) => Promise<unknown>,
  options?: { parseBody?: boolean },
) {
  return async (
    c: {
      req: { raw: Request };
      json: (data: unknown, status?: number) => Response;
      header: (name: string, value: string) => void;
    },
  ) => {
    const req = c.req.raw;
    const startedAt = Date.now();
    let action = "unknown";
    let actionConfig: ActionConfig | null = null;
    let auth: AuthResult | null = null;

    try {
      const url = new URL(req.url);
      const data: JsonRecord = options?.parseBody !== false
        ? await parseRequestData(req, url)
        : Object.fromEntries(url.searchParams);
      action = resolveActionName(data);
      actionConfig = actionMap[action] || null;
      if (!actionConfig) {
        throw new ActionRequestError(404, `未知的操作: ${action}`);
      }

      enforceActionMethod(action, actionConfig, req);
      auth = await resolveActionAuth(actionConfig, req);
      await enforceActionRateLimit(action, actionConfig, req, auth);
      enforceActionAccess(actionConfig, auth);

      const result = await handler(data, req, { action, actionConfig, auth });
      const status = result instanceof Response ? result.status : 200;
      if (shouldAuditAction(actionConfig)) {
        logActionAudit({
          action,
          actionConfig,
          req,
          auth,
          status,
          durationMs: Date.now() - startedAt,
          success: isAuditSuccess(result, status),
          error: extractAuditError(result),
        });
      }
      if (result instanceof Response) return result;
      return c.json(result);
    } catch (error) {
      let status = 500;
      let headers: Record<string, string> = {};
      let message = String(error).replace(/^Error:\s*/, "");

      if (error instanceof ActionRequestError) {
        status = error.status;
        headers = error.headers;
        message = error.message;
      } else if (
        message.includes("登入") || message.includes("權限") ||
        message.includes("Token") || message.includes("無效")
      ) {
        status = 401;
      }

      for (const [name, value] of Object.entries(headers)) {
        c.header(name, value);
      }

      if (!actionConfig || shouldAuditAction(actionConfig)) {
        logActionAudit({
          action,
          actionConfig,
          req,
          auth,
          status,
          durationMs: Date.now() - startedAt,
          success: false,
          error: message,
        });
      }

      return c.json({ success: false, error: message }, status);
    }
  };
}

// ============ 主路由：?action=xxx 相容模式 ============
// 前端（訂購頁 + 管理後台）都使用 ?action=xxx 呼叫，
// 為了 100% 向下相容，我們使用萬用路由統一處理。
app.all(
  "/*",
  wrapHandler(async (data, req, context) => {
    return await context.actionConfig.handler(data, req);
  }),
);

// ============ 匯出 ============
export default app;
