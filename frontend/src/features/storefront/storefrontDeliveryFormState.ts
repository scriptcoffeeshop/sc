export interface StorefrontLocalDeliveryAddress {
  city: string;
  district: string;
  address: string;
  companyOrBuilding: string;
}

export interface StorefrontHomeDeliveryAddress {
  city: string;
  district: string;
  zipcode: string;
  address: string;
}

export type StorefrontLocalDeliveryAddressPatch =
  Partial<StorefrontLocalDeliveryAddress>;
export type StorefrontHomeDeliveryAddressPatch =
  Partial<StorefrontHomeDeliveryAddress>;

const localDeliveryAddress: StorefrontLocalDeliveryAddress = {
  city: "",
  district: "",
  address: "",
  companyOrBuilding: "",
};
const homeDeliveryAddress: StorefrontHomeDeliveryAddress = {
  city: "",
  district: "",
  zipcode: "",
  address: "",
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

export function getStorefrontHomeDeliveryAddress(): StorefrontHomeDeliveryAddress {
  return { ...homeDeliveryAddress };
}

export function setStorefrontHomeDeliveryAddress(
  patch: StorefrontHomeDeliveryAddressPatch,
): StorefrontHomeDeliveryAddress {
  if (Object.prototype.hasOwnProperty.call(patch, "city")) {
    homeDeliveryAddress.city = String(patch.city || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "district")) {
    homeDeliveryAddress.district = String(patch.district || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "zipcode")) {
    homeDeliveryAddress.zipcode = String(patch.zipcode || "");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "address")) {
    homeDeliveryAddress.address = String(patch.address || "");
  }
  return getStorefrontHomeDeliveryAddress();
}

export function emitStorefrontHomeDeliveryAddressUpdated(
  patch: StorefrontHomeDeliveryAddressPatch,
) {
  const detail = setStorefrontHomeDeliveryAddress(patch);
  if (typeof window === "undefined") return detail;
  window.dispatchEvent(
    new CustomEvent("coffee:home-delivery-address-updated", { detail }),
  );
  return detail;
}
