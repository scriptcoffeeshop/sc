import type { DeliveryMethod, SubmitDeliveryInfo, SubmitDeliveryInfoResult } from "../../types";
import { getFormControlValue } from "./storefrontDeliveryDom.ts";
import { getStorefrontLocalDeliveryAddress } from "./storefrontDeliveryFormState.ts";

export const SUBMIT_DELIVERY_METHOD_TEXT = {
  delivery: "配送到府(限新竹)",
  home_delivery: "全台宅配",
  seven_eleven: "7-11 取件",
  family_mart: "全家取件",
  in_store: "來店取貨",
} satisfies Record<string, string>;

function composeDeliveryAddress(address: unknown, companyOrBuilding: unknown): string {
  const detailAddress = String(address || "").trim();
  const companyText = String(companyOrBuilding || "").trim();
  if (!detailAddress) return "";
  if (!companyText) return detailAddress;
  return `${detailAddress}（公司行號/社區大樓：${companyText}）`;
}

export function collectSubmitDeliveryInfo(
  deliveryMethod: DeliveryMethod | string,
): SubmitDeliveryInfoResult {
  if (deliveryMethod === "delivery") {
    const localAddress = getStorefrontLocalDeliveryAddress();
    const city = localAddress.city.trim();
    const district = localAddress.district.trim();
    const addr = localAddress.address.trim();
    const companyOrBuilding = localAddress.companyOrBuilding.trim();
    if (!city) return { deliveryInfo: null, error: "請選擇縣市" };
    if (!addr) return { deliveryInfo: null, error: "請填寫詳細地址" };
    return {
      deliveryInfo: { city, district, address: addr, companyOrBuilding },
      error: "",
    };
  }

  if (deliveryMethod === "home_delivery") {
    const cityObj = document.querySelector<HTMLInputElement>(".county");
    const distObj = document.querySelector<HTMLInputElement>(".district");
    const zipObj = document.querySelector<HTMLInputElement>(".zipcode");
    const city = cityObj ? cityObj.value : "";
    const district = distObj ? distObj.value : "";
    const zip = zipObj ? zipObj.value : "";
    const addr = getFormControlValue("home-delivery-detail").trim();
    if (!city || !district) {
      return {
        deliveryInfo: null,
        error: "請選擇全台宅配的縣市及區域",
      };
    }
    if (!addr) {
      return { deliveryInfo: null, error: "請填寫全台宅配的詳細地址" };
    }
    return {
      deliveryInfo: {
        city,
        district: `${zip} ${district}`.trim(),
        address: addr,
      },
      error: "",
    };
  }

  if (deliveryMethod === "in_store") {
    return {
      deliveryInfo: {
        storeName: "來店自取",
        storeAddress: "新竹市東區建中路101號1樓",
      },
      error: "",
    };
  }

  const storeName = getFormControlValue("store-name-input").trim();
  const storeAddress = getFormControlValue("store-address-input").trim();
  if (!storeName) {
    return { deliveryInfo: null, error: "請填寫取貨門市名稱" };
  }
  return {
    deliveryInfo: {
      storeName,
      storeAddress,
      storeId: getFormControlValue("store-id-input"),
    },
    error: "",
  };
}

export function buildSubmitDeliveryInfo(
  deliveryMethod: DeliveryMethod | string,
  deliveryInfo: SubmitDeliveryInfo,
): SubmitDeliveryInfo {
  const submitDeliveryInfo: SubmitDeliveryInfo = { ...deliveryInfo };
  if (deliveryMethod === "delivery") {
    submitDeliveryInfo.address = composeDeliveryAddress(
      deliveryInfo.address,
      deliveryInfo.companyOrBuilding,
    );
  }
  return submitDeliveryInfo;
}

export function getDeliveryAddressText(
  deliveryMethod: DeliveryMethod | string,
  deliveryInfo: SubmitDeliveryInfo,
): string {
  if (deliveryMethod === "delivery" || deliveryMethod === "home_delivery") {
    return `${deliveryInfo.city}${deliveryInfo.district || ""} ${deliveryInfo.address}`;
  }
  if (deliveryMethod === "in_store") {
    return `來店自取 (${deliveryInfo.storeAddress})`;
  }
  return `${deliveryInfo.storeName} [店號：${deliveryInfo.storeId}]${
    deliveryInfo.storeAddress ? " (" + deliveryInfo.storeAddress + ")" : ""
  }`;
}
