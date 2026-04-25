import { supabase } from "./supabase.ts";
import { JWT_SECRET, LINE_ADMIN_USER_ID } from "./config.ts";
import { tryParseJsonRecord } from "./json.ts";
import type { JsonRecord } from "./json.ts";

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(
    /\//g,
    "_",
  ).replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return base64UrlEncode(new Uint8Array(sig));
}

export async function signJwt(
  payload: JsonRecord,
): Promise<string> {
  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })),
  );
  const body = base64UrlEncode(
    new TextEncoder().encode(
      JSON.stringify({
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 12 * 3600, // JWT 有效期改為 12 小時
      }),
    ),
  );
  const signature = await hmacSign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export async function verifyJwt(
  token: string,
): Promise<JsonRecord | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const expectedSig = await hmacSign(`${parts[0]}.${parts[1]}`);
    if (expectedSig !== parts[2]) return null;
    const payload = tryParseJsonRecord(
      new TextDecoder().decode(base64UrlDecode(parts[1])),
    );
    if (!payload) return null;
    const expiresAt = Number(payload.exp) || 0;
    if (expiresAt && expiresAt < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (_error) {
    return null;
  }
}

export interface AuthResult {
  userId: string;
  role: string;
  isAdmin: boolean;
  adminPermissions: JsonRecord;
}

const authRequestCache = new WeakMap<Request, Promise<AuthResult | null>>();

export const ADMIN_PERMISSION_KEYS = [
  "orders",
  "products",
  "categories",
  "promotions",
  "settings",
  "checkoutSettings",
  "iconLibrary",
  "formfields",
  "users",
  "blacklist",
] as const;

export type AdminPermissionKey = typeof ADMIN_PERMISSION_KEYS[number];

const ADMIN_PERMISSION_KEY_SET = new Set<string>(ADMIN_PERMISSION_KEYS);

export function normalizeAdminPermissions(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as JsonRecord;
  const normalized: JsonRecord = {};
  for (const key of ADMIN_PERMISSION_KEYS) {
    if (record[key] === true) normalized[key] = true;
  }
  return normalized;
}

function hasExplicitAdminPermissions(permissions: JsonRecord): boolean {
  return Object.keys(permissions).some((key) =>
    ADMIN_PERMISSION_KEY_SET.has(key) && permissions[key] === true
  );
}

export function canAccessAdminPermission(
  auth: AuthResult,
  permission: AdminPermissionKey,
): boolean {
  if (auth.role === "SUPER_ADMIN") return true;
  if (auth.role !== "ADMIN") return false;
  const permissions = normalizeAdminPermissions(auth.adminPermissions);
  if (!hasExplicitAdminPermissions(permissions)) return true;
  return permissions[permission] === true;
}

export async function extractAuth(req: Request): Promise<AuthResult | null> {
  const cached = authRequestCache.get(req);
  if (cached) return await cached;

  const pending = (async () => {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return null;
    const payload = await verifyJwt(token);
    if (!payload || !payload.userId) return null;
    const userId = String(payload.userId);

    if (userId === LINE_ADMIN_USER_ID) {
      return {
        userId,
        role: "SUPER_ADMIN",
        isAdmin: true,
        adminPermissions: {},
      };
    }
    try {
      const { data } = await supabase.from("coffee_users").select(
        "role, status, admin_permissions",
      )
        .eq("line_user_id", userId).single();
      if (data?.status === "BLACKLISTED") return null;
      const role = data?.role || "USER";
      return {
        userId,
        role,
        isAdmin: role === "ADMIN" || role === "SUPER_ADMIN",
        adminPermissions: normalizeAdminPermissions(data?.admin_permissions),
      };
    } catch (_error) {
      return { userId, role: "USER", isAdmin: false, adminPermissions: {} };
    }
  })();

  authRequestCache.set(req, pending);
  return await pending;
}

export async function requireAuth(req: Request): Promise<AuthResult> {
  const auth = await extractAuth(req);
  if (!auth) throw new Error("請先登入");
  return auth;
}

export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (!auth.isAdmin) throw new Error("權限不足");
  return auth;
}

export async function requireSuperAdmin(req: Request): Promise<AuthResult> {
  const auth = await requireAuth(req);
  if (auth.role !== "SUPER_ADMIN") throw new Error("僅 SUPER_ADMIN 具備權限");
  return auth;
}
