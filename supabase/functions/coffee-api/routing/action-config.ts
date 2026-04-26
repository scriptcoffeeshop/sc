import type { z } from "zod";
import {
  type AdminPermissionKey,
  type AuthResult,
  canAccessAdminPermission,
  extractAuth,
} from "../utils/auth.ts";
import type { JsonRecord } from "../utils/json.ts";
import type { RateLimitConfig } from "../utils/rate-limit.ts";
import { validate } from "../utils/validate.ts";

export type ActionHandler = (
  data: JsonRecord,
  req: Request,
) => Promise<unknown>;
type ValidatedActionHandler<T extends z.ZodTypeAny> = (
  data: z.infer<T>,
  req: Request,
) => Promise<unknown>;

export type AccessLevel = "public" | "authenticated" | "admin";
export type HttpMethod = "GET" | "POST";

export interface ActionConfig {
  handler: ActionHandler;
  access: AccessLevel;
  methods?: readonly HttpMethod[];
  rateLimit?: RateLimitConfig;
  permission?: AdminPermissionKey | readonly AdminPermissionKey[];
}
export type ActionOptions = Omit<ActionConfig, "handler" | "access">;

export interface WrappedActionContext {
  action: string;
  actionConfig: ActionConfig;
  auth: AuthResult | null;
}

export class ActionRequestError extends Error {
  status: number;
  headers: Record<string, string>;

  constructor(
    status: number,
    message: string,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ActionRequestError";
    this.status = status;
    this.headers = headers;
  }
}

export const POST_ONLY = ["POST"] as const;
export const MAP_SESSION_METHODS = ["GET", "POST"] as const;
export const ANY_SETTINGS_PERMISSION = [
  "settings",
  "checkoutSettings",
  "iconLibrary",
] as const satisfies readonly AdminPermissionKey[];

export function publicAction(
  handler: ActionHandler,
  options: ActionOptions = {},
): ActionConfig {
  return { handler, access: "public", ...options };
}

export function authenticatedAction(
  handler: ActionHandler,
  options: ActionOptions = {},
): ActionConfig {
  return { handler, access: "authenticated", ...options };
}

export function adminAction(
  handler: ActionHandler,
  options: ActionOptions = {},
): ActionConfig {
  return { handler, access: "admin", ...options };
}

function validatedAction<T extends z.ZodTypeAny>(
  schema: T,
  handler: ValidatedActionHandler<T>,
): ActionHandler {
  return async (data, req) => {
    const validData = await validate(schema, data);
    return await handler(validData, req);
  };
}

function withPostMethod(options: ActionOptions = {}): ActionOptions {
  return { ...options, methods: POST_ONLY };
}

export function publicPost<T extends z.ZodTypeAny>(
  schema: T,
  handler: ValidatedActionHandler<T>,
  options: ActionOptions = {},
): ActionConfig {
  return publicAction(
    validatedAction(schema, handler),
    withPostMethod(options),
  );
}

export function authPost<T extends z.ZodTypeAny>(
  schema: T,
  handler: ValidatedActionHandler<T>,
  options: ActionOptions = {},
): ActionConfig {
  return authenticatedAction(
    validatedAction(schema, handler),
    withPostMethod(options),
  );
}

export function adminPost<T extends z.ZodTypeAny>(
  schema: T,
  handler: ValidatedActionHandler<T>,
  options: ActionOptions = {},
): ActionConfig {
  return adminAction(validatedAction(schema, handler), withPostMethod(options));
}

export function resolveActionName(data: JsonRecord): string {
  return String(data.action || "getProducts").trim() || "getProducts";
}

export function enforceActionMethod(
  action: string,
  actionConfig: ActionConfig,
  req: Request,
) {
  if (!actionConfig.methods || actionConfig.methods.length === 0) return;

  const method = req.method.toUpperCase();
  if (actionConfig.methods.includes(method as HttpMethod)) return;

  throw new ActionRequestError(
    405,
    `${action} 僅允許 ${actionConfig.methods.join("/")} 請求`,
    { "Allow": actionConfig.methods.join(", ") },
  );
}

export async function resolveActionAuth(
  actionConfig: ActionConfig,
  req: Request,
): Promise<AuthResult | null> {
  if (actionConfig.access === "public") return null;
  return await extractAuth(req);
}

export function enforceActionAccess(
  actionConfig: ActionConfig,
  auth: AuthResult | null,
) {
  if (actionConfig.access === "public") return;
  if (!auth) throw new ActionRequestError(401, "請先登入");
  if (actionConfig.access === "admin" && !auth.isAdmin) {
    throw new ActionRequestError(401, "權限不足");
  }
  if (actionConfig.access === "admin" && actionConfig.permission) {
    const permissions = Array.isArray(actionConfig.permission)
      ? actionConfig.permission
      : [actionConfig.permission];
    if (
      !permissions.some((permission) =>
        canAccessAdminPermission(auth, permission)
      )
    ) {
      throw new ActionRequestError(401, "此管理員沒有此頁面的操作權限");
    }
  }
}
