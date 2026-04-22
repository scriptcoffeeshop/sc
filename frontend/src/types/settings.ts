export interface DeliveryOption {
  id?: number | string;
  name?: string;
  enabled?: boolean;
  fee?: number;
  threshold?: number;
  icon?: string;
  icon_url?: string;
  [key: string]: unknown;
}

export interface PaymentOption {
  enabled?: boolean;
  label?: string;
  description?: string;
  icon?: string;
  icon_url?: string;
  sortOrder?: number;
  [key: string]: unknown;
}

export interface BankAccount {
  id: number | string;
  bankName?: string;
  bankCode?: string;
  accountName?: string;
  accountNumber?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface BrandingSettings {
  siteTitle?: string;
  siteSubtitle?: string;
  siteDescription?: string;
  siteIconUrl?: string;
  siteLogoUrl?: string;
  [key: string]: unknown;
}

export interface StorefrontSettings {
  announcement?: string;
  announcementEnabled?: boolean;
  isOpen?: boolean;
  autoOrderEmailEnabled?: boolean;
  [key: string]: unknown;
}

export interface DashboardSettingsRecord {
  delivery_options_config?: string;
  payment_options_config?: string;
  linepay_sandbox?: boolean | string | number;
  [key: string]: unknown;
}

export interface StorefrontUiSnapshot {
  deliveryConfig?: DeliveryOption[];
  paymentOptionConfig?: Record<string, PaymentOption>;
  selectedPayment?: string;
  bankAccounts?: BankAccount[];
  selectedBankAccountId?: string | number;
}
