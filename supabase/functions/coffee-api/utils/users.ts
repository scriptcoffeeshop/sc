import { supabase } from "./supabase.ts";
import { tryParseJsonRecord } from "./json.ts";

function hasKey(data: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(data, key);
}

function toTrimmedString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeReceiptInfoText(value: unknown): string {
  if (value === undefined || value === null) return "";

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "";
    const parsed = tryParseJsonRecord(raw);
    return parsed ? JSON.stringify(parsed) : "";
  }

  if (typeof value !== "object" || Array.isArray(value)) return "";
  const row = value as Record<string, unknown>;
  const taxId = toTrimmedString(row.taxId);
  if (taxId && !/^\d{8}$/.test(taxId)) return "";

  return JSON.stringify({
    buyer: toTrimmedString(row.buyer),
    taxId,
    address: toTrimmedString(row.address),
    needDateStamp: Boolean(row.needDateStamp),
  });
}

function normalizeCustomFieldsText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return "";
}

function mapToCamel(u: Record<string, unknown>) {
  return {
    userId: u.line_user_id,
    displayName: u.display_name,
    pictureUrl: u.picture_url,
    phone: u.phone,
    email: u.email,
    defaultDeliveryMethod: u.default_delivery_method,
    defaultCity: u.default_city,
    defaultDistrict: u.default_district,
    defaultAddress: u.default_address,
    defaultStoreId: u.default_store_id,
    defaultStoreName: u.default_store_name,
    defaultStoreAddress: u.default_store_address,
    defaultCustomFields: u.default_custom_fields,
    defaultPaymentMethod: u.default_payment_method,
    defaultTransferAccountLast5: u.default_transfer_account_last5,
    defaultReceiptInfo: u.default_receipt_info,
  };
}

async function fetchUserById(lineUserId: string) {
  const { data } = await supabase.from("coffee_users").select("*").eq(
    "line_user_id",
    lineUserId,
  ).maybeSingle();
  if (!data) return null;
  return mapToCamel(data as Record<string, unknown>);
}

export async function registerOrUpdateUser(data: Record<string, unknown>) {
  const { data: existing } = await supabase
    .from("coffee_users")
    .select("*")
    .eq("line_user_id", data.userId)
    .single();

  const userId = toTrimmedString(data.userId);
  const displayName = toTrimmedString(data.displayName);
  const pictureUrl = toTrimmedString(data.pictureUrl);
  const phone = toTrimmedString(data.phone);
  const email = toTrimmedString(data.email);
  const deliveryMethod = toTrimmedString(data.deliveryMethod);
  const city = toTrimmedString(data.city);
  const district = toTrimmedString(data.district);
  const address = toTrimmedString(data.address);
  const storeId = toTrimmedString(data.storeId);
  const storeName = toTrimmedString(data.storeName);
  const storeAddress = toTrimmedString(data.storeAddress);
  const defaultCustomFields = normalizeCustomFieldsText(
    data.defaultCustomFields,
  );
  const paymentMethod = toTrimmedString(data.paymentMethod);
  const transferAccountLast5 = toTrimmedString(data.transferAccountLast5);
  const defaultReceiptInfo = normalizeReceiptInfoText(data.receiptInfo);

  if (existing) {
    const updates: Record<string, unknown> = {
      display_name: displayName,
      last_login: new Date().toISOString(),
    };
    if (pictureUrl) updates.picture_url = pictureUrl;
    if (hasKey(data, "phone")) updates.phone = phone;
    if (hasKey(data, "email")) updates.email = email;
    if (hasKey(data, "deliveryMethod")) {
      updates.default_delivery_method = deliveryMethod;
    }
    if (hasKey(data, "city")) updates.default_city = city;
    if (hasKey(data, "district")) updates.default_district = district;
    if (hasKey(data, "address")) updates.default_address = address;
    if (hasKey(data, "storeId")) updates.default_store_id = storeId;
    if (hasKey(data, "storeName")) updates.default_store_name = storeName;
    if (hasKey(data, "storeAddress")) {
      updates.default_store_address = storeAddress;
    }
    if (hasKey(data, "defaultCustomFields")) {
      updates.default_custom_fields = defaultCustomFields || "{}";
    }
    if (hasKey(data, "paymentMethod")) {
      updates.default_payment_method = paymentMethod;
    }
    if (hasKey(data, "transferAccountLast5")) {
      updates.default_transfer_account_last5 = transferAccountLast5;
    }
    if (hasKey(data, "receiptInfo")) {
      updates.default_receipt_info = defaultReceiptInfo;
    }

    await supabase.from("coffee_users").update(updates).eq(
      "line_user_id",
      userId,
    );

    return await fetchUserById(userId) || mapToCamel(existing);
  } else {
    const newUser = {
      line_user_id: userId,
      display_name: displayName,
      picture_url: pictureUrl,
      phone,
      email,
      default_delivery_method: deliveryMethod,
      default_city: city,
      default_district: district,
      default_address: address,
      default_store_id: storeId,
      default_store_name: storeName,
      default_store_address: storeAddress,
      default_custom_fields: defaultCustomFields || "{}",
      default_payment_method: paymentMethod,
      default_transfer_account_last5: transferAccountLast5,
      default_receipt_info: defaultReceiptInfo,
    };
    await supabase.from("coffee_users").insert(newUser);
    return await fetchUserById(userId) || mapToCamel(newUser);
  }
}
