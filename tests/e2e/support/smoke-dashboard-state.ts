import type {
  Request as PlaywrightRequest,
  Route,
} from "@playwright/test";
import smokeFixtures from "./fixtures/smoke-fixtures.json";
import type {
  FixtureBankAccount,
  FixtureBlacklistEntry,
  FixtureFormField,
  FixtureOrder,
  FixtureProduct,
  FixtureProductCategory,
  FixturePromotion,
  FixturePromotionTargetItem,
  FixtureUser,
} from "./smoke-domain-fixtures.ts";

export type DashboardFixtureCategory = FixtureProductCategory;
export type DashboardCategory = DashboardFixtureCategory;

export type DashboardFixtureProduct = FixtureProduct;
export type DashboardProduct = DashboardFixtureProduct;

export type DashboardPromotionTargetItem = FixturePromotionTargetItem;

export type DashboardFixturePromotion = FixturePromotion;
export type DashboardPromotion = DashboardFixturePromotion;

export type DashboardFixtureOrder = FixtureOrder;
export type DashboardOrder = DashboardFixtureOrder;

export type DashboardFixtureUser = FixtureUser;
export type DashboardUser = DashboardFixtureUser;

export type DashboardBlacklistEntry = FixtureBlacklistEntry;

export type DashboardFormField = FixtureFormField & { id: number };

export type DashboardBankAccount = FixtureBankAccount;

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
  settings?: Record<string, string>;
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
  settings: Record<string, string>;
}

export interface DashboardRouteContext {
  action: string | null;
  options: DashboardRouteOptions;
  request: PlaywrightRequest;
  route: Route;
  state: DashboardRouteState;
  url: URL;
}

export interface DashboardJsonRecord {
  [key: string]: unknown;
}

const dashboardFixtures = smokeFixtures.dashboard;

function cloneArrayItems<T extends object>(items: T[]): T[] {
  return items.map((item) => ({ ...item }));
}

export function createDashboardRouteState(
  options: DashboardRouteOptions,
): DashboardRouteState {
  return {
    categories: Array.isArray(options.categories)
      ? cloneArrayItems(options.categories)
      : cloneArrayItems(dashboardFixtures.categories),
    products: Array.isArray(options.products)
      ? cloneArrayItems(options.products)
      : cloneArrayItems(dashboardFixtures.products),
    promotions: Array.isArray(options.promotions)
      ? cloneArrayItems(options.promotions)
      : cloneArrayItems(dashboardFixtures.promotions),
    orders: Array.isArray(options.orders)
      ? cloneArrayItems(options.orders)
      : cloneArrayItems(dashboardFixtures.orders),
    users: Array.isArray(options.users)
      ? cloneArrayItems(options.users)
      : cloneArrayItems(dashboardFixtures.users),
    blacklist: Array.isArray(options.blacklist)
      ? cloneArrayItems(options.blacklist)
      : cloneArrayItems(dashboardFixtures.blacklist),
    bankAccounts: Array.isArray(options.bankAccounts)
      ? cloneArrayItems(options.bankAccounts)
      : [],
    settings: { ...(options.settings || {}) },
    formFields: Array.isArray(options.formFields)
      ? cloneArrayItems(options.formFields)
      : cloneArrayItems(dashboardFixtures.formFields),
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
