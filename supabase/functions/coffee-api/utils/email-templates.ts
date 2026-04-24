import { sanitize } from "./html.ts";
import { FRONTEND_URL } from "./config.ts";
import { buildOrderDeliveryText } from "./order-delivery-display.ts";

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
  jkopay: "街口支付",
  transfer: "銀行轉帳",
};

export interface OrderConfirmationParams {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
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

interface EmailHeaderParams {
  backgroundColor: string;
  title: string;
  subtitle?: string;
  logoAlt: string;
  logoUrl?: string;
}

function resolveEmailLogoUrl(rawLogoUrl: unknown): string {
  const raw = String(rawLogoUrl || "").trim();
  if (!raw) return `${FRONTEND_URL}/icons/logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;

  const frontendBase = String(FRONTEND_URL || "").replace(/\/+$/, "");
  const normalized = raw.replace(/^\.?\//, "");
  if (!frontendBase) return normalized;
  if (!normalized) return `${frontendBase}/icons/logo.png`;
  return `${frontendBase}/${normalized}`;
}

function buildEmailHeaderHtml(params: EmailHeaderParams): string {
  const subtitle = String(params.subtitle || "").trim();
  const logoUrl = resolveEmailLogoUrl(params.logoUrl);
  const subtitleHtml = subtitle
    ? `<p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.4; color: #F2EAE4;">${
      sanitize(subtitle)
    }</p>`
    : "";

  return `
  <div style="background-color: ${params.backgroundColor}; color: #ffffff; padding: 22px 20px 20px; text-align: center;">
    <img src="${sanitize(logoUrl)}" alt="${
    sanitize(params.logoAlt)
  }" style="display: block; height: 18px; width: auto; max-width: 108px; margin: 0 auto 10px auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
    <h1 style="margin: 0; font-size: 22px; line-height: 1.32; font-weight: 700; letter-spacing: 0.2px;">${
    sanitize(params.title)
  }</h1>
    ${subtitleHtml}
  </div>`;
}

function getPaymentStatusPresentation(
  paymentMethod: string,
  paymentStatus: string,
): { text: string; color: string } {
  if (paymentStatus === "paid") {
    return { text: "已付款", color: "#2e7d32" };
  }
  if (paymentStatus === "processing") {
    return { text: "付款確認中", color: "#1565c0" };
  }
  if (paymentStatus === "failed") {
    return { text: "付款失敗", color: "#d32f2f" };
  }
  if (paymentStatus === "cancelled") {
    return { text: "付款取消", color: "#d32f2f" };
  }
  if (paymentStatus === "expired") {
    return { text: "付款逾期", color: "#ef6c00" };
  }
  if (paymentStatus === "refunded") {
    return { text: "已退款", color: "#6a1b9a" };
  }
  if (paymentMethod === "cod") {
    return { text: "貨到付款", color: "#0288d1" };
  }
  return { text: "待付款", color: "#b58900" };
}

function buildOrderNoteHtml(note: string, margin = "0"): string {
  const safeNote = sanitize(String(note || "").trim()) || "無";
  return `<p style="margin: ${margin};"><strong>訂單備註：</strong> ${safeNote}</p>`;
}

export function buildOrderConfirmationHtml(
  params: OrderConfirmationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  const deliveryText = buildOrderDeliveryText(params);
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
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#6F4E37",
      title: displaySiteTitle,
      subtitle: "訂單成立通知",
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
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
  logoUrl?: string;
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
  note?: string;
}

export interface ProcessingNotificationParams {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
  deliveryMethod: string;
  city: string;
  district: string;
  address: string;
  storeName: string;
  storeAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  note?: string;
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
  } catch (_error) {
    return "";
  }
}

function buildTrackingCopyUrl(trackingNumber: string): string {
  const rawTrackingNumber = String(trackingNumber || "").trim();
  if (!rawTrackingNumber) return "";
  const frontendBase = String(FRONTEND_URL || "").trim();
  if (!frontendBase) return "";

  try {
    const normalizedBase = frontendBase.endsWith("/")
      ? frontendBase
      : `${frontendBase}/`;
    const copyUrl = new URL("copy-tracking.html", normalizedBase);
    copyUrl.searchParams.set("tracking", rawTrackingNumber);
    return copyUrl.toString();
  } catch (_error) {
    return "";
  }
}

export function buildShippingNotificationHtml(
  params: ShippingNotificationParams,
): string {
  const deliveryText = buildOrderDeliveryText(params);
  const paymentText = PAYMENT_MAP[params.paymentMethod] || params.paymentMethod;
  const paymentStatus = getPaymentStatusPresentation(
    params.paymentMethod,
    params.paymentStatus,
  );

  const customTrackingUrl = normalizeTrackingUrl(params.trackingUrl || "");
  const defaultTrackingUrl = getDefaultTrackingUrl(params.deliveryMethod);
  const finalTrackingUrl = customTrackingUrl || defaultTrackingUrl;
  const rawTrackingNumber = String(params.trackingNumber || "").trim();
  const trackingCopyUrl = buildTrackingCopyUrl(rawTrackingNumber);
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
      ${
      trackingCopyUrl
        ? `<a href="${
          sanitize(trackingCopyUrl)
        }" target="_blank" style="display:inline-block; margin-left:8px; padding:2px 8px; border:1px solid #d1d5db; border-radius:4px; color:#374151; text-decoration:none; font-size:12px; background:#ffffff;">📋 複製單號</a>`
        : `<span style="display:inline-block; margin-left:8px; padding:2px 8px; border:1px solid #d1d5db; border-radius:4px; color:#6b7280; font-size:12px; background:#ffffff;">請長按單號複製</span>`
    }
    </p>`
    : "";
  const trackingSection = hasShippingInfo
    ? `<div style="margin: 10px 0 0 0; padding-top: 10px; border-top: 1px dashed #dcd3cb;">${providerHtml}${trackingNumberHtml}${trackingLinkHtml}</div>`
    : "";

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#6F4E37",
      title: "📦 訂單出貨通知",
      subtitle: normalizeEmailSiteTitle(params.siteTitle),
      logoAlt: `${normalizeEmailSiteTitle(params.siteTitle)} Logo`,
      logoUrl: params.logoUrl,
    })
  }
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
      <p style="margin: 0;"><strong>付款方式：</strong> ${paymentText} <span style="font-size: 13px; color: ${paymentStatus.color}; font-weight: bold;">(${paymentStatus.text})</span></p>
      ${buildOrderNoteHtml(String(params.note || ""), "10px 0 0 0")}
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

export function buildProcessingNotificationHtml(
  params: ProcessingNotificationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  const deliveryText = buildOrderDeliveryText(params);
  const paymentText = PAYMENT_MAP[params.paymentMethod] || params.paymentMethod;
  const paymentStatus = getPaymentStatusPresentation(
    params.paymentMethod,
    params.paymentStatus,
  );

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#6F4E37",
      title: "⏳ 訂單處理中通知",
      subtitle: displaySiteTitle,
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已進入處理流程！</h2>
    <p>我們已開始準備您的商品，完成後會再通知您出貨進度。</p>

    <div style="background-color: #f9f6f0; border-left: 4px solid #6F4E37; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${params.orderId}</p>
      <p style="margin: 0 0 10px 0;"><strong>配送方式：</strong> ${
    METHOD_MAP[params.deliveryMethod] || "一般配送"
  }<br><span style="color: #666; font-size: 14px;">${
    sanitize(deliveryText)
  }</span></p>
      <p style="margin: 0;"><strong>付款方式：</strong> ${paymentText} <span style="font-size: 13px; color: ${paymentStatus.color}; font-weight: bold;">(${paymentStatus.text})</span></p>
      ${buildOrderNoteHtml(String(params.note || ""), "10px 0 0 0")}
    </div>

    <p style="margin-top: 30px; color: #555;">感謝您的耐心等候，我們會盡快完成處理並寄出商品。</p>
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
  logoUrl?: string;
  lineName: string;
  note?: string;
}

export interface CancelledNotificationParams {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
  cancelReason: string;
  note?: string;
}

export interface FailedNotificationParams {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
  failureReason: string;
  note?: string;
}

export function buildCompletedNotificationHtml(
  params: CompletedNotificationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#2E7D32",
      title: "✅ 訂單已完成",
      subtitle: displaySiteTitle,
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #2E7D32; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已順利完成！</h2>
    <p>這封信是要通知您，您的訂單 <strong>${params.orderId}</strong> 已經順利完成。</p>
    <div style="background-color: #f9f6f0; border-left: 4px solid #2E7D32; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 8px 0;"><strong>訂單編號：</strong> ${
    sanitize(params.orderId)
  }</p>
      ${buildOrderNoteHtml(String(params.note || ""), "0")}
    </div>
    <p>非常感謝您的購買與支持，期待您再次光臨！如果有任何問題，歡迎隨時與我們聯絡。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}

export function buildCancelledNotificationHtml(
  params: CancelledNotificationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  const reasonText = String(params.cancelReason || "").trim();
  const safeReason = sanitize(reasonText || "未提供取消原因");

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#B42318",
      title: "⚠️ 訂單已取消通知",
      subtitle: displaySiteTitle,
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #B42318; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已取消。</h2>
    <p>這封信是要通知您，訂單 <strong>${
    sanitize(params.orderId)
  }</strong> 已取消。</p>
    <div style="background-color: #fef3f2; border-left: 4px solid #B42318; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 8px 0;"><strong>訂單編號：</strong> ${
    sanitize(params.orderId)
  }</p>
      <p style="margin: 0;"><strong>取消原因：</strong> ${safeReason}</p>
      ${buildOrderNoteHtml(String(params.note || ""), "8px 0 0 0")}
    </div>
    <p style="margin-top: 20px; color: #555;">若您有任何疑問，請直接聯繫我們，我們會盡快協助您。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}

export function buildFailedNotificationHtml(
  params: FailedNotificationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  const reasonText = String(params.failureReason || "").trim();
  const safeReason = sanitize(reasonText || "未提供失敗原因");

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#B42318",
      title: "⚠️ 訂單已失敗通知",
      subtitle: displaySiteTitle,
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #B42318; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已標記為失敗。</h2>
    <p>這封信是要通知您，訂單 <strong>${
    sanitize(params.orderId)
  }</strong> 目前未成立，系統已將其標記為失敗。</p>
    <div style="background-color: #fef3f2; border-left: 4px solid #B42318; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 8px 0;"><strong>訂單編號：</strong> ${
    sanitize(params.orderId)
  }</p>
      <p style="margin: 0;"><strong>失敗原因：</strong> ${safeReason}</p>
      ${buildOrderNoteHtml(String(params.note || ""), "8px 0 0 0")}
    </div>
    <p style="margin-top: 20px; color: #555;">若仍需商品，請重新下單；如有疑問，歡迎直接聯繫我們。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}
