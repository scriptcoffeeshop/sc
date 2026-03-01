import { supabase } from "../utils/supabase.ts";
import {
  ALLOWED_REDIRECT_ORIGINS,
  ECPAY_HASH_IV,
  ECPAY_HASH_KEY,
  ECPAY_IS_STAGE,
  ECPAY_MERCHANT_ID,
  SUPABASE_URL,
} from "../utils/config.ts";
import { htmlResponse } from "../utils/cors.ts";
import { escapeHtml } from "../utils/html.ts";

const CVS_TYPE_MAP: Record<string, string> = {
  seven_eleven: "UNIMART",
  family_mart: "FAMI",
};

const MAP_SUBTYPE_MAP: Record<string, string> = {
  seven_eleven: "UNIMARTC2C",
  family_mart: "FAMIC2C",
  UNIMART: "UNIMARTC2C",
  FAMI: "FAMIC2C",
  UNIMARTC2C: "UNIMARTC2C",
  FAMIC2C: "FAMIC2C",
};

async function generateCheckMacValue(
  params: Record<string, string>,
): Promise<string> {
  const sorted = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const paramStr = sorted.map((k) => `${k}=${params[k]}`).join("&");
  const raw = `HashKey=${ECPAY_HASH_KEY}&${paramStr}&HashIV=${ECPAY_HASH_IV}`;

  let encoded = encodeURIComponent(raw);
  encoded = encoded.replace(/%20/g, "+")
    .replace(/%2d/gi, "-")
    .replace(/%5f/gi, "_")
    .replace(/%2e/gi, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")");

  encoded = encoded.toLowerCase();

  const msgBuffer = new TextEncoder().encode(encoded);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  return hashHex.toUpperCase();
}

const storeCache: Record<string, { data: unknown; timestamp: number }> = {};
const CACHE_TTL = 60 * 60 * 1000;

export async function getStoreList(cvsType: string) {
  const mappedType = CVS_TYPE_MAP[cvsType] || cvsType || "UNIMART";
  const validTypes = ["UNIMART", "FAMI", "HILIFE", "OKMART", "All"];
  if (!validTypes.includes(mappedType)) {
    return { success: false, error: "不支援的超商類型" };
  }

  if (
    storeCache[mappedType] &&
    (Date.now() - storeCache[mappedType].timestamp) < CACHE_TTL
  ) {
    return storeCache[mappedType].data;
  }

  const params: Record<string, string> = {
    MerchantID: ECPAY_MERCHANT_ID,
    CvsType: mappedType,
  };
  params.CheckMacValue = await generateCheckMacValue(params);

  const apiUrl = ECPAY_IS_STAGE
    ? "https://logistics-stage.ecpay.com.tw/Helper/GetStoreList"
    : "https://logistics.ecpay.com.tw/Helper/GetStoreList";

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    const result = await res.json();

    if (result.RtnCode === 1) {
      const stores: Array<
        {
          id: string;
          name: string;
          address: string;
          phone: string;
          type: string;
        }
      > = [];
      for (const group of (result.StoreList || [])) {
        for (const s of (group.StoreInfo || [])) {
          stores.push({
            id: s.StoreId,
            name: s.StoreName,
            address: s.StoreAddr,
            phone: s.StorePhone || "",
            type: group.CvsType,
          });
        }
      }
      const response = { success: true, stores, total: stores.length };
      storeCache[mappedType] = { data: response, timestamp: Date.now() };
      return response;
    } else {
      return { success: false, error: result.RtnMsg || "取得門市清單失敗" };
    }
  } catch (e) {
    return { success: false, error: "呼叫綠界 API 失敗: " + String(e) };
  }
}

async function cleanupOldStoreSelections() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("coffee_store_selections").delete().lt(
    "created_at",
    cutoff,
  );
}

export async function createStoreMapSession(
  deliveryMethod: string,
  clientUrl: string = "",
) {
  const subType = MAP_SUBTYPE_MAP[deliveryMethod] ||
    MAP_SUBTYPE_MAP[String(deliveryMethod || "").toUpperCase()];
  if (!subType) return { success: false, error: "請先選擇 7-11 或全家取貨" };

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const callbackUrl =
    `${SUPABASE_URL}/functions/v1/coffee-api?action=storeMapCallback`;

  const params: Record<string, string> = {
    MerchantID: ECPAY_MERCHANT_ID,
    LogisticsType: "CVS",
    LogisticsSubType: subType,
    IsCollection: "Y",
    ServerReplyURL: callbackUrl,
    ExtraData: token,
    Device: "1",
  };
  params.CheckMacValue = await generateCheckMacValue(params);

  try {
    await cleanupOldStoreSelections();
  } catch (_e) { /* ignore */ }

  const { error } = await supabase.from("coffee_store_selections").upsert({
    token,
    cvs_store_id: "",
    cvs_store_name: "",
    cvs_address: "",
    logistics_sub_type: subType,
    extra_data: clientUrl,
    created_at: new Date().toISOString(),
  });
  if (error) {
    return { success: false, error: "建立門市地圖會話失敗：" + error.message };
  }

  const mapUrl = ECPAY_IS_STAGE
    ? "https://logistics-stage.ecpay.com.tw/Express/map"
    : "https://logistics.ecpay.com.tw/Express/map";

  return { success: true, token, mapUrl, params };
}

export async function getStoreSelection(token: string) {
  if (!token) return { success: false, error: "缺少 token" };
  const { data, error } = await supabase
    .from("coffee_store_selections")
    .select(
      "token, cvs_store_id, cvs_store_name, cvs_address, logistics_sub_type",
    )
    .eq("token", token)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data || !data.cvs_store_id) return { success: true, found: false };

  await supabase.from("coffee_store_selections").delete().eq("token", token);

  return {
    success: true,
    found: true,
    storeId: data.cvs_store_id || "",
    storeName: data.cvs_store_name || "",
    storeAddress: data.cvs_address || "",
    logisticsSubType: data.logistics_sub_type || "",
  };
}

export async function handleStoreMapCallback(data: Record<string, unknown>) {
  const token = String(data.ExtraData || "");
  if (!token) return new Response("Miss Token", { status: 400 });

  let clientUrl = "";
  const { data: selection } = await supabase.from("coffee_store_selections")
    .select("extra_data").eq("token", token).maybeSingle();
  if (selection && selection.extra_data) {
    clientUrl = selection.extra_data;
  }

  if (clientUrl) {
    try {
      const u = new URL(clientUrl);
      if (!ALLOWED_REDIRECT_ORIGINS.includes(u.origin)) {
        clientUrl = "";
      }
    } catch {
      clientUrl = "";
    }
  }

  const getDataValue = (d: Record<string, unknown>, keys: string[]) => {
    for (const k of keys) {
      const v = d[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const storeId = getDataValue(data, [
    "CVSStoreID",
    "CvsStoreID",
    "StoreID",
    "StoreId",
  ]);
  const storeName = getDataValue(data, [
    "CVSStoreName",
    "CvsStoreName",
    "StoreName",
  ]);
  const storeAddress = getDataValue(data, [
    "CVSAddress",
    "CvsAddress",
    "StoreAddress",
  ]);
  const logisticsSubType = getDataValue(data, [
    "LogisticsSubType",
    "logisticsSubType",
  ]);

  const { error } = await supabase.from("coffee_store_selections").update({
    cvs_store_id: storeId,
    cvs_store_name: storeName,
    cvs_address: storeAddress,
    logistics_sub_type: logisticsSubType,
  }).eq("token", token);

  if (error) {
    return htmlResponse(
      `<!doctype html><html><head><meta charset="utf-8"><title>門市回傳失敗</title></head><body><h3>門市回傳失敗</h3><p>${
        escapeHtml(error.message)
      }</p></body></html>`,
      500,
    );
  }

  const safeName = escapeHtml(storeName || "（未提供門市名稱）");
  const safeAddr = escapeHtml(storeAddress || "（未提供門市地址）");
  const redirectScript = clientUrl
    ? `window.location.replace("${clientUrl}?store_token=${token}");`
    : `alert('選擇完成，請手動返回原網頁');`;

  return htmlResponse(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>門市選擇完成</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #f6f9f6; color: #1f2937; }
    .card { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
    h3 { margin: 0 0 12px; color: #0f5132; }
    p { margin: 8px 0; line-height: 1.5; }
    .hint { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h3>門市選擇成功</h3>
    <p><strong>門市：</strong>${safeName}</p>
    <p><strong>地址：</strong>${safeAddr}</p>
    <p class="hint">正在將您導回訂購頁面...</p>
  </div>
  <script>
    if (window.opener && window.opener !== window) {
      window.opener.postMessage('store_selected', '*');
      window.close();
    } else {
      ${redirectScript}
    }
  </script>
</body>
</html>`);
}

// ============================================
// PCSC 7-11 官方電子地圖整合
// ============================================

/**
 * 為 7-11 PCSC 電子地圖建立 session
 * 前端會用回傳的 callbackUrl 與 token 來提交 POST 表單至 PCSC emap
 */
export async function createPcscMapSession(
  clientUrl: string = "",
) {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  const callbackUrl =
    `${SUPABASE_URL}/functions/v1/coffee-api?action=pcscMapCallback`;

  try {
    await cleanupOldStoreSelections();
  } catch (_e) { /* ignore */ }

  const { error } = await supabase.from("coffee_store_selections").upsert({
    token,
    cvs_store_id: "",
    cvs_store_name: "",
    cvs_address: "",
    logistics_sub_type: "UNIMARTC2C",
    extra_data: clientUrl,
    created_at: new Date().toISOString(),
  });
  if (error) {
    return { success: false, error: "建立門市地圖會話失敗：" + error.message };
  }

  return {
    success: true,
    token,
    callbackUrl,
    eshopid: "870",
  };
}

/**
 * 處理 PCSC 電子地圖回傳的門市選擇結果
 * PCSC 會以 POST 方式回傳 storeid, storename, storeaddress, storeTel 等欄位
 */
export async function handlePcscMapCallback(
  data: Record<string, unknown>,
) {
  const token = String(data.tempvar || data.sid || "");
  if (!token) return new Response("Miss Token", { status: 400 });

  let clientUrl = "";
  const { data: selection } = await supabase.from("coffee_store_selections")
    .select("extra_data").eq("token", token).maybeSingle();
  if (selection && selection.extra_data) {
    clientUrl = selection.extra_data;
  }

  if (clientUrl) {
    try {
      const u = new URL(clientUrl);
      if (!ALLOWED_REDIRECT_ORIGINS.includes(u.origin)) {
        clientUrl = "";
      }
    } catch {
      clientUrl = "";
    }
  }

  const storeId = String(data.storeid || data.StoreID || "").trim();
  const storeName = String(data.storename || data.StoreName || "").trim();
  const storeAddress = String(
    data.storeaddress || data.StoreAddress || "",
  ).trim();

  const { error } = await supabase.from("coffee_store_selections").update({
    cvs_store_id: storeId,
    cvs_store_name: storeName,
    cvs_address: storeAddress,
    logistics_sub_type: "UNIMARTC2C",
  }).eq("token", token);

  if (error) {
    return htmlResponse(
      `<!doctype html><html><head><meta charset="utf-8"><title>門市回傳失敗</title></head><body><h3>門市回傳失敗</h3><p>${
        escapeHtml(error.message)
      }</p></body></html>`,
      500,
    );
  }

  const safeName = escapeHtml(storeName || "（未提供門市名稱）");
  const safeAddr = escapeHtml(storeAddress || "（未提供門市地址）");
  const redirectScript = clientUrl
    ? `window.location.replace("${clientUrl}?store_token=${token}");`
    : `alert('選擇完成，請手動返回原網頁');`;

  return htmlResponse(`<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>7-11 門市選擇完成</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #f6f9f6; color: #1f2937; }
    .card { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }
    h3 { margin: 0 0 12px; color: #0f5132; }
    p { margin: 8px 0; line-height: 1.5; }
    .hint { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h3>7-11 門市選擇成功</h3>
    <p><strong>門市：</strong>${safeName}</p>
    <p><strong>地址：</strong>${safeAddr}</p>
    <p class="hint">正在將您導回訂購頁面...</p>
  </div>
  <script>
    if (window.opener && window.opener !== window) {
      window.opener.postMessage('store_selected', '*');
      window.close();
    } else {
      ${redirectScript}
    }
  </script>
</body>
</html>`);
}
