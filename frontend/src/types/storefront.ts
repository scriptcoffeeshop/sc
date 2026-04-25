import type { DeliveryMethod, PaymentMethod, PaymentStatus, ReceiptInfo } from "./core";

export interface SubmitDeliveryInfo {
  city?: string;
  district?: string;
  address?: string;
  companyOrBuilding?: string;
  storeId?: string;
  storeName?: string;
  storeAddress?: string;
}

export interface SubmitDeliveryInfoResult {
  deliveryInfo: SubmitDeliveryInfo | null;
  error: string;
}

export interface StorefrontDynamicField {
  id?: number | string;
  field_key?: string;
  field_type?: string;
  label?: string;
  placeholder?: string;
  options?: string;
  required?: boolean;
  enabled?: boolean;
  delivery_visibility?: string | null;
  [key: string]: unknown;
}

export type StorefrontDynamicFieldValues = Record<string, string>;

export interface StorefrontOrderConfirmParams {
  deliveryMethod: DeliveryMethod | string;
  deliveryInfo: SubmitDeliveryInfo;
  addressText: string;
  orderLines: string[];
  total: number;
  note: string;
  receiptInfo: ReceiptInfo | null;
  paymentMethod: PaymentMethod | string;
  transferTargetAccountInfo?: string;
}

export interface PaymentDisplayInput {
  orderId?: string;
  paymentMethod?: PaymentMethod | string;
  paymentStatus?: PaymentStatus | "refunded" | string;
  paymentUrl?: string;
  paymentExpiresAt?: string | null;
  paymentConfirmedAt?: string | null;
  paymentLastCheckedAt?: string | null;
  total?: number | string;
}

export interface PaymentDisplayOptions {
  context?: "orderHistory" | string;
}

export interface PaymentActionGuide {
  tone: "success" | "info" | "warning" | "danger" | "neutral";
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: string;
}

export interface CustomerPaymentDisplay {
  paymentMethod: string;
  paymentStatus: string;
  methodLabel: string;
  statusLabel: string;
  paymentExpiresAtText: string;
  paymentConfirmedAtText: string;
  paymentLastCheckedAtText: string;
  showPaymentDeadline: boolean;
  badgeClass: string;
  showBadge: boolean;
  tone: PaymentActionGuide["tone"];
  guideTitle: string;
  guideDescription: string;
  actionLabel: string;
  actionType: string;
  paymentUrl: string;
  canResumePayment: boolean;
  resumePaymentLabel: string;
}
