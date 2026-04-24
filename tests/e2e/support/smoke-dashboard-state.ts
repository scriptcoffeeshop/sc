import type {
  Request as PlaywrightRequest,
  Route,
} from "@playwright/test";

export interface DashboardCategory {
  id: number;
  name: string;
}

export interface DashboardProduct {
  id: number;
  category: string;
  name: string;
  description?: string;
  price?: number;
  roastLevel?: string;
  specs?: string;
  enabled?: boolean;
}

export interface DashboardPromotionTargetItem {
  productId: number;
  specKey?: string;
}

export interface DashboardPromotion {
  id: number;
  name: string;
  type: string;
  targetProductIds?: number[];
  targetItems?: DashboardPromotionTargetItem[];
  minQuantity: number;
  discountType: string;
  discountValue: number;
  enabled?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  sortOrder?: number;
}

export interface DashboardOrder {
  orderId: string;
  timestamp?: string;
  deliveryMethod?: string;
  status?: string;
  lineUserId?: string;
  lineName?: string;
  phone?: string;
  email?: string;
  items?: string;
  total?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  shippingProvider?: string;
  trackingUrl?: string;
  cancelReason?: string;
  [key: string]: unknown;
}

export interface DashboardUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  email?: string;
  phone?: string;
  defaultDeliveryMethod?: string;
  defaultCity?: string;
  defaultDistrict?: string;
  defaultAddress?: string;
  defaultStoreName?: string;
  defaultStoreId?: string;
  lastLogin?: string;
  role?: string;
  status?: string;
}

export interface DashboardBlacklistEntry {
  lineUserId: string;
  displayName: string;
  blockedAt?: string;
  reason?: string;
}

export interface DashboardFormField {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
  placeholder?: string;
  options?: string;
  required?: boolean;
  enabled?: boolean;
  delivery_visibility?: string | null;
}

export interface DashboardBankAccount {
  id: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
}

export type DashboardRouteOptions = {
  onAdminLineLogin?: (request: PlaywrightRequest) => void;
  onUpdateSettings?: (request: PlaywrightRequest) => void;
  onUploadAsset?: (request: PlaywrightRequest) => void;
  onSendLineFlexMessage?: (request: PlaywrightRequest) => void;
  onSendOrderEmail?: (request: PlaywrightRequest) => void;
  uploadAssetUrl?: string;
  categories?: DashboardCategory[];
  products?: DashboardProduct[];
  promotions?: DashboardPromotion[];
  orders?: DashboardOrder[];
  users?: DashboardUser[];
  blacklist?: DashboardBlacklistEntry[];
  formFields?: DashboardFormField[];
  bankAccounts?: DashboardBankAccount[];
};

export interface DashboardRouteState {
  categories: DashboardCategory[];
  products: DashboardProduct[];
  promotions: DashboardPromotion[];
  orders: DashboardOrder[];
  users: DashboardUser[];
  blacklist: DashboardBlacklistEntry[];
  formFields: DashboardFormField[];
  bankAccounts: DashboardBankAccount[];
}

export interface DashboardRouteContext {
  action: string | null;
  options: DashboardRouteOptions;
  request: PlaywrightRequest;
  route: Route;
  state: DashboardRouteState;
  url: URL;
}

export type DashboardJsonRecord = Record<string, unknown>;

function cloneArrayItems<T extends object>(items: T[]): T[] {
  return items.map((item) => ({ ...item }));
}

export function createDashboardRouteState(
  options: DashboardRouteOptions,
): DashboardRouteState {
  return {
    categories: Array.isArray(options.categories)
      ? cloneArrayItems(options.categories)
      : [{ id: 1, name: "測試分類" }],
    products: Array.isArray(options.products)
      ? cloneArrayItems(options.products)
      : [
        {
          id: 201,
          category: "測試分類",
          name: "後台測試商品",
          description: "admin smoke",
          price: 180,
          roastLevel: "中焙",
          specs: JSON.stringify([{
            key: "single",
            label: "單包",
            price: 180,
            enabled: true,
          }]),
          enabled: true,
        },
      ],
    promotions: Array.isArray(options.promotions)
      ? cloneArrayItems(options.promotions)
      : [
        {
          id: 301,
          name: "任選 2 件 9 折",
          type: "bundle",
          targetProductIds: [],
          targetItems: [{ productId: 201, specKey: "single" }],
          minQuantity: 2,
          discountType: "percent",
          discountValue: 90,
          enabled: true,
          startTime: null,
          endTime: null,
          sortOrder: 0,
        },
      ],
    orders: Array.isArray(options.orders)
      ? cloneArrayItems(options.orders)
      : [
        {
          orderId: "ORD001",
          timestamp: "2026-03-02T00:00:00.000Z",
          deliveryMethod: "in_store",
          status: "pending",
          lineUserId: "customer-line-1",
          lineName: "測試客戶",
          phone: "0900000000",
          email: "customer@example.com",
          items: "後台測試商品 x1",
          total: 180,
          paymentMethod: "cod",
          paymentStatus: "",
        },
      ],
    users: Array.isArray(options.users)
      ? cloneArrayItems(options.users)
      : [
        {
          userId: "user-001",
          displayName: "測試會員",
          pictureUrl: "",
          email: "user@example.com",
          phone: "0912000000",
          defaultDeliveryMethod: "delivery",
          defaultCity: "新竹市",
          defaultDistrict: "東區",
          defaultAddress: "測試路 1 號",
          lastLogin: "2026-04-20T10:00:00.000Z",
          role: "USER",
          status: "ACTIVE",
        },
        {
          userId: "admin-002",
          displayName: "管理測試員",
          pictureUrl: "",
          email: "admin@example.com",
          phone: "",
          defaultDeliveryMethod: "in_store",
          defaultStoreName: "",
          defaultStoreId: "",
          lastLogin: "2026-04-19T09:30:00.000Z",
          role: "ADMIN",
          status: "BLACKLISTED",
        },
      ],
    blacklist: Array.isArray(options.blacklist)
      ? cloneArrayItems(options.blacklist)
      : [
        {
          lineUserId: "admin-002",
          displayName: "管理測試員",
          blockedAt: "2026-04-20T08:00:00.000Z",
          reason: "惡意測試",
        },
      ],
    bankAccounts: Array.isArray(options.bankAccounts)
      ? cloneArrayItems(options.bankAccounts)
      : [],
    formFields: Array.isArray(options.formFields)
      ? cloneArrayItems(options.formFields)
      : [{
        id: 401,
        field_key: "receipt_type",
        label: "收據類型",
        field_type: "select",
        placeholder: "請選擇",
        options: JSON.stringify(["二聯式", "三聯式"]),
        required: true,
        enabled: true,
        delivery_visibility: JSON.stringify({ delivery: true }),
      }],
  };
}

export function asJsonRecord(value: unknown): DashboardJsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as DashboardJsonRecord
    : {};
}

export function getRequestBody(
  request: PlaywrightRequest,
): DashboardJsonRecord {
  try {
    return asJsonRecord(request.postDataJSON());
  } catch {
    return {};
  }
}

export function asString(value: unknown, fallback = ""): string {
  return value === undefined || value === null ? fallback : String(value);
}

export function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return value === undefined ? fallback : Boolean(value);
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function asNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map((item) => Number(item) || 0)
    : [];
}

export function asTargetItems(
  value: unknown,
): DashboardPromotionTargetItem[] {
  return Array.isArray(value)
    ? value.map((item) => {
      const record = asJsonRecord(item);
      return {
        productId: asNumber(record.productId),
        specKey: asString(record.specKey),
      };
    })
    : [];
}

export function applyOrderUpdate(
  order: DashboardOrder,
  body: DashboardJsonRecord,
): DashboardOrder {
  return {
    ...order,
    status: body.status !== undefined ? asString(body.status) : order.status,
    paymentStatus: body.paymentStatus !== undefined
      ? asString(body.paymentStatus)
      : order.paymentStatus,
    trackingNumber: body.trackingNumber !== undefined
      ? asString(body.trackingNumber)
      : order.trackingNumber,
    shippingProvider: body.shippingProvider !== undefined
      ? asString(body.shippingProvider)
      : order.shippingProvider,
    trackingUrl: body.trackingUrl !== undefined
      ? asString(body.trackingUrl)
      : order.trackingUrl,
    cancelReason: body.cancelReason !== undefined
      ? asString(body.cancelReason)
      : order.cancelReason,
  };
}
