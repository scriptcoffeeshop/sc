export interface StorefrontLocalDeliveryAddress {
  city: string;
  district: string;
  address: string;
  companyOrBuilding: string;
}

export type StorefrontLocalDeliveryAddressPatch =
  Partial<StorefrontLocalDeliveryAddress>;

const localDeliveryAddress: StorefrontLocalDeliveryAddress = {
  city: "",
  district: "",
  address: "",
  companyOrBuilding: "",
};

export function getStorefrontLocalDeliveryAddress(): StorefrontLocalDeliveryAddress {
  return { ...localDeliveryAddress };
}

export function setStorefrontLocalDeliveryAddress(
  patch: StorefrontLocalDeliveryAddressPatch,
): StorefrontLocalDeliveryAddress {
  if (Object.prototype.hasOwnProperty.call(patch, "city")) {
    localDeliveryAddress.city = String(patch.city || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "district")) {
    localDeliveryAddress.district = String(patch.district || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "address")) {
    localDeliveryAddress.address = String(patch.address || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "companyOrBuilding")) {
    localDeliveryAddress.companyOrBuilding = String(
      patch.companyOrBuilding || "",
    );
  }
  return getStorefrontLocalDeliveryAddress();
}

export function emitStorefrontLocalDeliveryAddressUpdated(
  patch: StorefrontLocalDeliveryAddressPatch,
) {
  const detail = setStorefrontLocalDeliveryAddress(patch);
  if (typeof window === "undefined") return detail;
  window.dispatchEvent(
    new CustomEvent("coffee:local-delivery-address-updated", { detail }),
  );
  return detail;
}
