import type { SweetAlertIcon, SweetAlertOptions } from "sweetalert2";

export interface DashboardOrderRecord extends Record<string, unknown> {
  orderId: string;
  timestamp: string;
  deliveryMethod?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentExpiresAt?: string;
  paymentLastCheckedAt?: string;
  paymentProviderStatusCode?: string;
  paymentId?: string;
  paymentConfirmedAt?: string;
  lineUserId?: string;
  lineName?: string;
  phone?: string;
  email?: string;
  city?: string;
  district?: string;
  address?: string;
  storeId?: string;
  storeName?: string;
  storeAddress?: string;
  transferAccountLast5?: string;
  shippingProvider?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  items?: string;
  note?: string;
  cancelReason?: string;
  receiptInfo?: unknown;
  total?: number | string;
}

export type DashboardOrderFilters = Record<string, string>;

export interface DashboardApiJson extends Record<string, unknown> {
  success?: boolean;
  orders?: DashboardOrderRecord[];
  message?: string;
  error?: string;
  updatedCount?: unknown;
}

export type DashboardAuthFetch = (
  input: string,
  init?: RequestInit,
) => Promise<{
  json: () => Promise<DashboardApiJson>;
}>;

export type DashboardSwalResult = {
  isConfirmed?: boolean;
  isDenied?: boolean;
  value?: unknown;
};

export type DashboardSwal = {
  fire: {
    (options: SweetAlertOptions): Promise<DashboardSwalResult> | DashboardSwalResult;
    (
      title?: string,
      html?: string,
      icon?: SweetAlertIcon,
    ): Promise<DashboardSwalResult> | DashboardSwalResult;
  };
  showValidationMessage?: (message: string) => void;
  showLoading?: () => void;
  close?: () => void;
};

export type DashboardToast = {
  fire: (options: SweetAlertOptions) => unknown;
};

export type DashboardOrderServices = {
  API_URL: string;
  authFetch: DashboardAuthFetch;
  getAuthUserId: () => string;
  Swal: DashboardSwal;
  Toast: DashboardToast;
  changeOrderStatus?: (orderId: string, status: string) => Promise<unknown>;
  showFlexHistory?: () => unknown;
  sendOrderFlexByOrderId?: (orderId: string) => unknown;
  sendOrderEmailByOrderId?: (orderId: string) => unknown;
  refundOnlinePayOrder?: (orderId: string, paymentMethod: string) => unknown;
  confirmTransferPayment?: (orderId: string) => unknown;
};
