export const SUBMIT_DELIVERY_METHOD_TEXT = {
  delivery: "配送到府(限新竹)",
  home_delivery: "全台宅配",
  seven_eleven: "7-11 取件",
  family_mart: "全家取件",
  in_store: "來店取貨",
};

function composeDeliveryAddress(address, companyOrBuilding) {
  const detailAddress = String(address || "").trim();
  const companyText = String(companyOrBuilding || "").trim();
  if (!detailAddress) return "";
  if (!companyText) return detailAddress;
  return `${detailAddress}（公司行號/社區大樓：${companyText}）`;
}

export function collectSubmitDeliveryInfo(deliveryMethod) {
  if (deliveryMethod === "delivery") {
    const city = document.getElementById("delivery-city").value;
    const district = document.getElementById("delivery-district").value;
    const addr = document.getElementById("delivery-detail-address").value
      .trim();
    const companyOrBuilding = String(
      document.getElementById("delivery-company")?.value || "",
    ).trim();
    if (!city) return { deliveryInfo: null, error: "請選擇縣市" };
    if (!addr) return { deliveryInfo: null, error: "請填寫詳細地址" };
    return {
      deliveryInfo: { city, district, address: addr, companyOrBuilding },
      error: "",
    };
  }

  if (deliveryMethod === "home_delivery") {
    const cityObj = document.querySelector(".county");
    const distObj = document.querySelector(".district");
    const zipObj = document.querySelector(".zipcode");
    const city = cityObj ? cityObj.value : "";
    const district = distObj ? distObj.value : "";
    const zip = zipObj ? zipObj.value : "";
    const addr = document.getElementById("home-delivery-detail").value.trim();
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

  const storeName = document.getElementById("store-name-input").value.trim();
  const storeAddress = document.getElementById("store-address-input").value
    .trim();
  if (!storeName) {
    return { deliveryInfo: null, error: "請填寫取貨門市名稱" };
  }
  return {
    deliveryInfo: {
      storeName,
      storeAddress,
      storeId: document.getElementById("store-id-input").value || "",
    },
    error: "",
  };
}

export function buildSubmitDeliveryInfo(deliveryMethod, deliveryInfo) {
  const submitDeliveryInfo = { ...deliveryInfo };
  if (deliveryMethod === "delivery") {
    submitDeliveryInfo.address = composeDeliveryAddress(
      deliveryInfo.address,
      deliveryInfo.companyOrBuilding,
    );
  }
  return submitDeliveryInfo;
}

export function getDeliveryAddressText(deliveryMethod, deliveryInfo) {
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
