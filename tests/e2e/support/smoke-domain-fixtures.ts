import type {
  DeliveryMethod,
  Order,
  PaymentMethod,
  Product,
  ProductSpec,
} from "../../../frontend/src/types/core.ts";
import type { SessionUser } from "../../../frontend/src/types/session.ts";

export type FixturePaymentConfig =
  & Partial<Record<PaymentMethod, boolean>>
  & {
    cod: boolean;
    linepay: boolean;
    transfer: boolean;
  };

export interface FixtureDeliveryOption {
  id: DeliveryMethod | string;
  icon?: string;
  name: string;
  description: string;
  enabled: boolean;
  payment: FixturePaymentConfig;
}

export interface FixtureFormField {
  id?: number;
  field_key: string;
  label: string;
  field_type: string;
  placeholder?: string;
  options?: string;
  required?: boolean;
  enabled?: boolean;
  delivery_visibility?: string | null;
}

export type FixtureSettingsRecord = Record<string, unknown>;

export type FixtureProductCategory = {
  id: number;
  name: string;
};

export type FixtureProduct = Partial<Product> & {
  id: number;
  category: string;
  name: string;
  description?: string;
  roastLevel?: string;
  specs?: ProductSpec[] | string;
};

export type FixturePromotionTargetItem = {
  productId: number;
  specKey?: string;
};

export type FixturePromotion = {
  id: number;
  name: string;
  type: string;
  targetProductIds?: number[];
  targetItems?: FixturePromotionTargetItem[];
  minQuantity: number;
  discountType: string;
  discountValue: number;
  enabled?: boolean;
  startTime?: string | null;
  endTime?: string | null;
  sortOrder?: number;
};

export type FixtureOrder = Order & {
  timestamp?: string;
  lineUserId?: string;
  lineName?: string;
  phone?: string;
  email?: string;
  cancelReason?: string;
};

export type FixtureUser = SessionUser & {
  userId: string;
  displayName: string;
  defaultDeliveryMethod?: DeliveryMethod | string;
  defaultCity?: string;
  defaultDistrict?: string;
  defaultAddress?: string;
  defaultStoreName?: string;
  defaultStoreId?: string;
  lastLogin?: string;
  status?: string;
  adminNote?: string;
  adminPermissions?: Record<string, boolean>;
};

export type FixtureBlacklistEntry = {
  lineUserId: string;
  displayName: string;
  blockedAt?: string;
  reason?: string;
};

export type FixtureBankAccount = {
  id: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName?: string;
};

export type FixtureQuoteRequestItem = {
  productId?: number | string;
  specKey?: string;
  qty?: number | string;
};
