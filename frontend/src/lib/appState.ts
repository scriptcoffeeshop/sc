import type {
  Product,
  ProductCategory,
  SessionUser,
  StorefrontDynamicField,
} from "../types";

export interface StorefrontBankAccount {
  id: string | number;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  [key: string]: unknown;
}

export interface StorefrontOrderQuote {
  orderLines?: string[];
  total?: number | string;
  deliveryMethod?: string;
  availablePaymentMethods?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface StorefrontState {
  products: Product[];
  categories: ProductCategory[];
  formFields: StorefrontDynamicField[];
  currentUser: SessionUser | null;
  selectedDelivery: string;
  isStoreOpen: boolean;
  selectedPayment: string;
  selectedBankAccountId: string | number;
  bankAccounts: StorefrontBankAccount[];
  orderQuote: StorefrontOrderQuote | null;
  quoteError: string;
}

export const state: StorefrontState = {
  products: [],
  categories: [],
  formFields: [],
  currentUser: null,
  selectedDelivery: "",
  isStoreOpen: true,
  selectedPayment: "cod",
  selectedBankAccountId: "",
  bankAccounts: [],
  orderQuote: null,
  quoteError: "",
};
