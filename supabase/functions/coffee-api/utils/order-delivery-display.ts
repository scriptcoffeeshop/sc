export interface OrderDeliveryDisplayInput {
  deliveryMethod?: string;
  city?: string;
  district?: string;
  address?: string;
  storeName?: string;
  storeAddress?: string;
}

export function isHomeDeliveryMethod(
  deliveryMethod: string | undefined,
): boolean {
  const method = String(deliveryMethod || "").trim();
  return method === "delivery" || method === "home_delivery";
}

export function buildOrderDeliveryText(
  params: OrderDeliveryDisplayInput,
): string {
  if (isHomeDeliveryMethod(params.deliveryMethod)) {
    return `${String(params.city || "")}${String(params.district || "")} ${
      String(params.address || "")
    }`.trim();
  }

  const storeName = String(params.storeName || "").trim();
  const storeAddress = String(params.storeAddress || "").trim();
  if (!storeAddress) return storeName;
  return `${storeName} (${storeAddress})`.trim();
}
