import { sanitize } from "./html.ts";
import { FRONTEND_URL } from "./config.ts";

export const METHOD_MAP: Record<string, string> = {
  delivery: "配送到府",
  home_delivery: "全台宅配",
  seven_eleven: "7-11 取貨/取貨付款",
  family_mart: "全家取貨/取貨付款",
  in_store: "來店自取",
};

export const PAYMENT_MAP: Record<string, string> = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  transfer: "銀行轉帳",
};

export interface OrderConfirmationParams {
  orderId: string;
  siteTitle: string;
  lineName: string;
  phone: string;
  deliveryMethod: string;
  city: string;
  district: string;
  address: string;
  storeName: string;
  storeAddress: string;
  paymentMethod: string;
  transferTargetAccount: string;
  transferAccountLast5: string;
  note: string;
  ordersText: string;
  total: number;
  customFieldsHtml: string;
  receiptHtml?: string;
}

export function normalizeEmailSiteTitle(siteTitle: string): string {
  const rawTitle = String(siteTitle || "").trim();
  if (!rawTitle) return "咖啡訂購";
  const cleanedTitle = rawTitle.replace(/[\s\u3000]*訂購確認[\s\u3000]*$/u, "")
    .trim();
  return cleanedTitle || "咖啡訂購";
}

export function buildOrderConfirmationHtml(
  params: OrderConfirmationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  const isDelivery = params.deliveryMethod === "delivery" ||
    params.deliveryMethod === "home_delivery";
  const deliveryText = isDelivery
    ? `${params.city}${params.district} ${params.address}`
    : `${params.storeName} ${
      params.storeAddress ? `(${params.storeAddress})` : ""
    }`.trim();
  const paymentText = PAYMENT_MAP[params.paymentMethod] || params.paymentMethod;

  let transferHtml = "";
  if (params.paymentMethod === "transfer") {
    const targetAccount = sanitize(params.transferTargetAccount);
    const last5 = sanitize(params.transferAccountLast5);
    transferHtml =
      `<br><span style="color: #D32F2F; font-size: 14px; display: inline-block; margin-top: 4px;">請匯款至：${targetAccount}<br>您的帳號後五碼：${last5}</span>`;
  }

  const phoneHtml = params.phone
    ? `<p style="margin: 0 0 10px 0;"><strong>聯絡電話：</strong> ${
      sanitize(params.phone)
    }</p>`
    : "";

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  <div style="background-color: #6F4E37; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
      <img src="${FRONTEND_URL}/icons/logo.png" alt="Logo" style="height: 32px; width: 32px; object-fit: contain; margin-right: 12px; vertical-align: middle; border-radius: 4px;">
      ${sanitize(displaySiteTitle)}
    </h1>
  </div>
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已成立！</h2>
    <p>感謝您的訂購，我們已收到您的訂單資訊，將盡速為您安排出貨。</p>
    <div style="background-color: #f9f6f0; border-left: 4px solid #6F4E37; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${params.orderId}</p>
      ${params.customFieldsHtml}
      ${params.receiptHtml || ""}
      ${phoneHtml}
      <p style="margin: 0 0 10px 0;"><strong>配送方式：</strong> ${
    METHOD_MAP[params.deliveryMethod] || params.deliveryMethod
  }<br><span style="color: #666; font-size: 14px;">${
    sanitize(deliveryText)
  }</span></p>
      <p style="margin: 0 0 10px 0;"><strong>付款方式：</strong> ${paymentText}${transferHtml}</p>
      <p style="margin: 0;"><strong>訂單備註：</strong> ${
    sanitize(params.note) || "無"
  }</p>
    </div>
    </div>
    <h3 style="color: #6F4E37; border-bottom: 2px solid #e5ddd5; padding-bottom: 8px; margin-top: 30px;">訂單明細</h3>
    <pre style="font-family: inherit; background-color: #faf9f7; padding: 15px; border: 1px solid #e5ddd5; border-radius: 5px; white-space: pre-wrap; font-size: 14px; color: #444; margin-top: 10px;">${
    sanitize(params.ordersText)
  }</pre>
    <div style="text-align: right; margin-top: 20px;">
      <h3 style="color: #e63946; font-size: 22px; margin: 0;">總金額：$${params.total}</h3>
    </div>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>`;
}

export interface ShippingNotificationParams {
  orderId: string;
  siteTitle: string;
  lineName: string;
  deliveryMethod: string;
  city: string;
  district: string;
  address: string;
  storeName: string;
  storeAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber: string;
  shippingProvider: string;
  trackingUrl: string;
}

function getDefaultTrackingUrl(deliveryMethod: string): string {
  if (deliveryMethod === "seven_eleven") {
    return "https://eservice.7-11.com.tw/e-tracking/search.aspx";
  }
  if (deliveryMethod === "family_mart") {
    return "https://fmec.famiport.com.tw/FP_Entrance/QueryBox";
  }
  if (deliveryMethod === "delivery" || deliveryMethod === "home_delivery") {
    return "https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100";
  }
  return "";
}

function normalizeTrackingUrl(url: string): string {
  const raw = String(url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function buildShippingNotificationHtml(
  params: ShippingNotificationParams,
): string {
  const isDelivery = params.deliveryMethod === "delivery" ||
    params.deliveryMethod === "home_delivery";
  const deliveryText = isDelivery
    ? `${params.city}${params.district} ${params.address}`
    : `${params.storeName} ${
      params.storeAddress ? `(${params.storeAddress})` : ""
    }`.trim();

  const paymentText = PAYMENT_MAP[params.paymentMethod] || params.paymentMethod;
  const paymentStatusText = params.paymentStatus === "paid"
    ? "已付款"
    : (params.paymentMethod === "cod" ? "貨到付款" : "未付款");
  const paymentStatusColor = params.paymentStatus === "paid"
    ? "#2e7d32"
    : (params.paymentMethod === "cod" ? "#0288d1" : "#d32f2f");

  const customTrackingUrl = normalizeTrackingUrl(params.trackingUrl || "");
  const defaultTrackingUrl = getDefaultTrackingUrl(params.deliveryMethod);
  const finalTrackingUrl = customTrackingUrl || defaultTrackingUrl;
  const rawTrackingNumber = String(params.trackingNumber || "").trim();
  const encodedTrackingNumber = encodeURIComponent(rawTrackingNumber);
  const hasShippingInfo = !!params.trackingNumber ||
    !!params.shippingProvider ||
    !!finalTrackingUrl;
  const trackingLinkHtml = finalTrackingUrl
    ? `<a href="${
      sanitize(finalTrackingUrl)
    }" target="_blank" style="display:inline-block; margin-top:8px; padding:6px 12px; background-color:#1e40af; color:#ffffff; text-decoration:none; border-radius:4px; font-size:13px;">🔗 物流追蹤頁面</a>`
    : "";
  const providerHtml = params.shippingProvider
    ? `<p style="margin: 0 0 8px 0;"><strong>物流商：</strong> ${
      sanitize(params.shippingProvider)
    }</p>`
    : "";
  const trackingNumberHtml = params.trackingNumber
    ? `<p style="margin: 0 0 8px 0;"><strong>物流單號：</strong> <span style="font-family:monospace; font-size:15px; font-weight:bold;">${
      sanitize(params.trackingNumber)
    }</span>
      <a href="#" data-tracking-number="${
      sanitize(params.trackingNumber)
    }" onclick="if(window.navigator && navigator.clipboard){navigator.clipboard.writeText(decodeURIComponent('${encodedTrackingNumber}'));} return false;" style="display:inline-block; margin-left:8px; padding:2px 8px; border:1px solid #d1d5db; border-radius:4px; color:#374151; text-decoration:none; font-size:12px; background:#ffffff;">📋 複製單號</a>
    </p>`
    : "";
  const trackingSection = hasShippingInfo
    ? `<div style="margin: 10px 0 0 0; padding-top: 10px; border-top: 1px dashed #dcd3cb;">${providerHtml}${trackingNumberHtml}${trackingLinkHtml}</div>`
    : "";

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  <div style="background-color: #6F4E37; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
      <img src="${FRONTEND_URL}/icons/logo.png" alt="Logo" style="height: 32px; width: 32px; object-fit: contain; margin-right: 12px; vertical-align: middle; border-radius: 4px;">
      📦 訂單出貨通知
    </h1>
  </div>
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已出貨！</h2>
    <p>這封信是要通知您，您所訂購的商品已經安排出貨！</p>
    
    <div style="background-color: #f9f6f0; border-left: 4px solid #6F4E37; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${params.orderId}</p>
      <p style="margin: 0 0 10px 0;"><strong>配送方式：</strong> ${
    METHOD_MAP[params.deliveryMethod] || "一般配送"
  }<br><span style="color: #666; font-size: 14px;">${
    sanitize(deliveryText)
  }</span></p>
      <p style="margin: 0;"><strong>付款方式：</strong> ${paymentText} <span style="font-size: 13px; color: ${paymentStatusColor}; font-weight: bold;">(${paymentStatusText})</span></p>
      ${trackingSection}
    </div>
    
    <p style="margin-top: 30px; color: #555;">依據配送方式不同，商品預計於 1-3 個工作天內抵達。<br>若是超商取貨，屆時將有手機簡訊通知取件，請留意您的手機訊息。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}

export interface CompletedNotificationParams {
  orderId: string;
  siteTitle: string;
  lineName: string;
}

export function buildCompletedNotificationHtml(
  params: CompletedNotificationParams,
): string {
  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  <div style="background-color: #2E7D32; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
      <img src="${FRONTEND_URL}/icons/logo.png" alt="Logo" style="height: 32px; width: 32px; object-fit: contain; margin-right: 12px; vertical-align: middle; border-radius: 4px;">
      ✅ 訂單已完成
    </h1>
  </div>
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #2E7D32; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已順利完成！</h2>
    <p>這封信是要通知您，您的訂單 <strong>${params.orderId}</strong> 已經順利完成。</p>
    <p>非常感謝您的購買與支持，期待您再次光臨！如果有任何問題，歡迎隨時與我們聯絡。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}

export interface StatusUpdateNotificationParams {
  orderId: string;
  siteTitle: string;
  lineName: string;
  statusLabel: string;
}

export function buildStatusUpdateNotificationHtml(
  params: StatusUpdateNotificationParams,
): string {
  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  <div style="background-color: #6F4E37; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; display: flex; align-items: center; justify-content: center;">
      <img src="${FRONTEND_URL}/icons/logo.png" alt="Logo" style="height: 32px; width: 32px; object-fit: contain; margin-right: 12px; vertical-align: middle; border-radius: 4px;">
      📣 訂單狀態更新通知
    </h1>
  </div>
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單狀態已更新！</h2>
    <p>這封信是要通知您，訂單 <strong>${sanitize(params.orderId)}</strong> 的最新狀態為：</p>
    <div style="margin: 20px 0; padding: 14px 16px; border-radius: 8px; background-color: #f9f6f0; border: 1px solid #e5ddd5;">
      <p style="margin: 0; font-size: 18px; color: #6F4E37; font-weight: 700;">${sanitize(params.statusLabel)}</p>
    </div>
    <p>若您有任何問題，歡迎隨時與我們聯繫，感謝您的支持！</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}
