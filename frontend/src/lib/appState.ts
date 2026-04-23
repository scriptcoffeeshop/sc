import type { Product, ProductCategory, SessionUser } from "../types";

export interface StorefrontFormField {
  field_key?: string;
  field_type?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  enabled?: boolean;
  [key: string]: unknown;
}

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
  formFields: StorefrontFormField[];
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
