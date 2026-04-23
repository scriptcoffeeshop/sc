export type DeliveryMethod =
  | "delivery"
  | "home_delivery"
  | "seven_eleven"
  | "family_mart"
  | "in_store";

export type PaymentMethod = "cod" | "linepay" | "jkopay" | "transfer";

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "completed"
  | "failed"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export interface ReceiptInfo {
  buyer: string;
  taxId: string;
  address: string;
  needDateStamp: boolean;
}

export interface ProductSpec {
  key?: string;
  label?: string;
  price?: number;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface Product {
  id: number | string;
  name: string;
  price: number;
  category?: string;
  categoryId?: number | string;
  enabled?: boolean;
  specs?: ProductSpec[] | string;
  [key: string]: unknown;
}

export interface ProductCategory {
  category: string;
  products: Product[];
}

export interface CartItem {
  productId: number | string;
  qty: number;
  specKey?: string;
  specLabel?: string;
  name?: string;
  price?: number;
  [key: string]: unknown;
}

export interface OrderItem {
  productId: number | string;
  qty: number;
  name?: string;
  specKey?: string;
  specLabel?: string;
  price?: number;
  subtotal?: number;
  [key: string]: unknown;
}

export interface Order {
  orderId: string;
  status?: OrderStatus | string;
  deliveryMethod?: DeliveryMethod | string;
  city?: string;
  district?: string;
  address?: string;
  storeName?: string;
  storeId?: string;
  items?: string;
  itemsJson?: OrderItem[];
  total?: number;
  paymentMethod?: PaymentMethod | string;
  paymentStatus?: PaymentStatus | string;
  paymentUrl?: string;
  paymentExpiresAt?: string | null;
  paymentConfirmedAt?: string | null;
  paymentLastCheckedAt?: string | null;
  shippingProvider?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  receiptInfo?: ReceiptInfo | null;
  [key: string]: unknown;
}
