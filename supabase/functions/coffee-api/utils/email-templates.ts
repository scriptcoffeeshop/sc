import { sanitize } from "./html.ts";
import { FRONTEND_URL } from "./config.ts";
import { resolveEmailLogoUrl } from "./email-assets.ts";
import { buildOrderDeliveryText } from "./order-delivery-display.ts";
import {
  getEmailDeliveryMethodLabel,
  getEmailPaymentMethodLabel,
} from "./order-labels.ts";
import { getDefaultTrackingUrl, normalizeTrackingUrl } from "./tracking.ts";

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

function buildEmailHeaderHtml(params: EmailHeaderParams): string {
  const subtitle = String(params.subtitle || "").trim();
  const logoUrl = resolveEmailLogoUrl(params.logoUrl);
  const subtitleHtml = subtitle
    ? `<p style="margin: 10px 0 0 0; font-size: 15px; line-height: 1.45; color: #F2EAE4; font-weight: 600;">${
      sanitize(subtitle)
    }</p>`
    : "";

  return `
  <div style="background-color: ${params.backgroundColor}; color: #ffffff; padding: 28px 20px 26px; text-align: center;">
    <img src="${sanitize(logoUrl)}" alt="${
    sanitize(params.logoAlt)
  }" width="64" style="display: block; width: 64px; height: auto; max-width: 64px; max-height: 64px; margin: 0 auto 14px auto; border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;">
    <h1 style="margin: 0; font-size: 24px; line-height: 1.32; font-weight: 700; letter-spacing: 0;">${
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

function buildStatusNoteHtml(
  statusNote: unknown,
  margin = "0 0 10px 0",
): string {
  const note = String(statusNote || "").trim();
  if (!note) return "";
  return `<p style="margin: ${margin};"><strong>狀態備註：</strong> ${
    sanitize(note)
  }</p>`;
}

interface OrderEmailDetailFields {
  phone?: string;
  customFieldsHtml?: string;
  receiptHtml?: string;
  ordersText?: string;
  total?: number;
}

interface OrderNotificationDetails extends OrderEmailDetailFields {
  deliveryMethod?: string;
  city?: string;
  district?: string;
  address?: string;
  storeName?: string;
  storeAddress?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  note?: string;
  statusNote?: string;
}

interface FullOrderEmailDetails extends OrderNotificationDetails {
  ordersText: string;
  total: number;
}

function formatEmailCurrency(amount: unknown): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  return `$${Math.round(value).toLocaleString("zh-TW")}`;
}

function buildOrderItemsHtml(params: OrderEmailDetailFields): string {
  const ordersText = String(params.ordersText || "").trim();
  const totalText = formatEmailCurrency(params.total);
  if (!ordersText && !totalText) return "";

  const itemsHtml = ordersText
    ? `<pre style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #fffdf9; padding: 16px; border: 1px solid #e5ddd5; border-radius: 6px; white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: #3f3f46; margin: 10px 0 0 0;">${
      sanitize(ordersText)
    }</pre>`
    : "";
  const totalHtml = totalText
    ? `<div style="text-align: right; margin-top: 18px;">
      <p style="margin: 0; color: #6F4E37; font-size: 13px; font-weight: 700;">訂單總額</p>
      <h3 style="color: #B42318; font-size: 24px; line-height: 1.2; margin: 4px 0 0 0;">${totalText}</h3>
    </div>`
    : "";

  return `
    <h3 style="color: #6F4E37; border-bottom: 2px solid #e5ddd5; padding-bottom: 8px; margin: 30px 0 0 0; font-size: 18px; line-height: 1.4;">訂單明細</h3>
    ${itemsHtml}
    ${totalHtml}`;
}

interface OrderStatusSummaryHtmlParams extends OrderEmailDetailFields {
  orderId: string;
  deliveryMethod?: string;
  deliveryText?: string;
  paymentText?: string;
  paymentStatus?: { text: string; color: string };
  note?: string;
  extraHtml?: string;
  accentColor?: string;
  backgroundColor?: string;
}

function buildOrderStatusSummaryHtml(
  params: OrderStatusSummaryHtmlParams,
): string {
  const accentColor = params.accentColor || "#6F4E37";
  const backgroundColor = params.backgroundColor || "#f9f6f0";
  const phoneHtml = params.phone
    ? `<p style="margin: 0 0 10px 0;"><strong>聯絡電話：</strong> ${
      sanitize(params.phone)
    }</p>`
    : "";
  const deliveryLabel = params.deliveryMethod
    ? sanitize(getEmailDeliveryMethodLabel(
      params.deliveryMethod,
      params.deliveryMethod,
    ))
    : "";
  const deliveryText = String(params.deliveryText || "").trim();
  const deliveryHtml = deliveryLabel || deliveryText
    ? `<p style="margin: 0 0 10px 0;"><strong>配送方式：</strong> ${
      deliveryLabel || "未提供"
    }${
      deliveryText
        ? `<br><span style="color: #666; font-size: 14px;">${
          sanitize(deliveryText)
        }</span>`
        : ""
    }</p>`
    : "";
  const paymentStatusHtml = params.paymentStatus &&
      params.paymentStatus.text !== params.paymentText
    ? ` <span style="font-size: 13px; color: ${
      sanitize(params.paymentStatus.color)
    }; font-weight: bold;">(${sanitize(params.paymentStatus.text)})</span>`
    : "";
  const paymentHtml = params.paymentText
    ? `<p style="margin: 0 0 10px 0;"><strong>付款方式：</strong> ${
      sanitize(params.paymentText)
    }${paymentStatusHtml}</p>`
    : "";

  return `<div style="background-color: ${
    sanitize(backgroundColor)
  }; border-left: 4px solid ${
    sanitize(accentColor)
  }; padding: 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${
    sanitize(params.orderId)
  }</p>
      ${params.customFieldsHtml || ""}
      ${params.receiptHtml || ""}
      ${phoneHtml}
      ${deliveryHtml}
      ${paymentHtml}
      ${buildOrderNoteHtml(String(params.note || ""), "0")}
      ${buildStatusNoteHtml(params.statusNote)}
      ${params.extraHtml || ""}
    </div>`;
}

function buildNotificationSummaryHtml(
  params: OrderNotificationDetails & {
    orderId: string;
    extraHtml?: string;
    accentColor?: string;
    backgroundColor?: string;
  },
): string {
  const paymentMethod = String(params.paymentMethod || "");
  const paymentText = paymentMethod
    ? getEmailPaymentMethodLabel(paymentMethod)
    : "";
  const paymentStatus = paymentMethod
    ? getPaymentStatusPresentation(
      paymentMethod,
      String(params.paymentStatus || ""),
    )
    : undefined;
  return buildOrderStatusSummaryHtml({
    orderId: params.orderId,
    phone: params.phone,
    customFieldsHtml: params.customFieldsHtml,
    receiptHtml: params.receiptHtml,
    deliveryMethod: params.deliveryMethod,
    deliveryText: buildOrderDeliveryText(params),
    paymentText,
    paymentStatus,
    note: params.note,
    extraHtml: params.extraHtml,
    accentColor: params.accentColor,
    backgroundColor: params.backgroundColor,
  });
}

export function buildOrderConfirmationHtml(
  params: OrderConfirmationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  const deliveryText = buildOrderDeliveryText(params);
  const paymentText = getEmailPaymentMethodLabel(params.paymentMethod);

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
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${
    sanitize(params.orderId)
  }</p>
      ${params.customFieldsHtml}
      ${params.receiptHtml || ""}
      ${phoneHtml}
      <p style="margin: 0 0 10px 0;"><strong>配送方式：</strong> ${
    sanitize(getEmailDeliveryMethodLabel(
      params.deliveryMethod,
      params.deliveryMethod,
    ))
  }<br><span style="color: #666; font-size: 14px;">${
    sanitize(deliveryText)
  }</span></p>
      <p style="margin: 0 0 10px 0;"><strong>付款方式：</strong> ${
    sanitize(paymentText)
  }${transferHtml}</p>
      <p style="margin: 0;"><strong>訂單備註：</strong> ${
    sanitize(params.note) || "無"
  }</p>
    </div>
    ${buildOrderItemsHtml(params)}
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>`;
}

export interface ShippingNotificationParams extends FullOrderEmailDetails {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
  trackingNumber: string;
  shippingProvider: string;
  trackingUrl: string;
}

export interface ProcessingNotificationParams extends FullOrderEmailDetails {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
}

export type ReadyNotificationParams = ProcessingNotificationParams;

export interface PaymentStatusNotificationParams extends FullOrderEmailDetails {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
  notificationTitle: string;
  summaryText: string;
  statusLabel: string;
  statusColor: string;
}

export function buildPaymentStatusNotificationHtml(
  params: PaymentStatusNotificationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  const statusHtml =
    `<p style="margin: 10px 0 0 0;"><strong>付款狀態：</strong> <span style="font-weight: 700; color: ${
      sanitize(params.statusColor || "#6F4E37")
    };">${sanitize(params.statusLabel)}</span></p>`;

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: params.statusColor || "#6F4E37",
      title: displaySiteTitle,
      subtitle: params.notificationTitle,
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您好</h2>
    <p>${sanitize(params.summaryText)}</p>
    ${
    buildNotificationSummaryHtml({
      orderId: params.orderId,
      phone: params.phone,
      customFieldsHtml: params.customFieldsHtml,
      receiptHtml: params.receiptHtml,
      deliveryMethod: params.deliveryMethod,
      city: params.city,
      district: params.district,
      address: params.address,
      storeName: params.storeName,
      storeAddress: params.storeAddress,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus,
      note: params.note,
      statusNote: params.statusNote,
      extraHtml: statusHtml,
    })
  }

    ${buildOrderItemsHtml(params)}
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
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
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);

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
      title: displaySiteTitle,
      subtitle: "訂單出貨通知",
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已出貨！</h2>
    <p>這封信是要通知您，您所訂購的商品已經安排出貨！</p>
    
    ${
    buildNotificationSummaryHtml({
      orderId: params.orderId,
      phone: params.phone,
      customFieldsHtml: params.customFieldsHtml,
      receiptHtml: params.receiptHtml,
      deliveryMethod: params.deliveryMethod,
      city: params.city,
      district: params.district,
      address: params.address,
      storeName: params.storeName,
      storeAddress: params.storeAddress,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus,
      note: params.note,
      statusNote: params.statusNote,
      extraHtml: trackingSection,
    })
  }

    ${buildOrderItemsHtml(params)}
    
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

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#6F4E37",
      title: displaySiteTitle,
      subtitle: "訂單處理中通知",
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已進入處理流程！</h2>
    <p>我們已開始準備您的商品，完成後會再通知您出貨進度。</p>

    ${
    buildNotificationSummaryHtml({
      orderId: params.orderId,
      phone: params.phone,
      customFieldsHtml: params.customFieldsHtml,
      receiptHtml: params.receiptHtml,
      deliveryMethod: params.deliveryMethod,
      city: params.city,
      district: params.district,
      address: params.address,
      storeName: params.storeName,
      storeAddress: params.storeAddress,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus,
      note: params.note,
      statusNote: params.statusNote,
    })
  }

    ${buildOrderItemsHtml(params)}

    <p style="margin-top: 30px; color: #555;">感謝您的耐心等候，我們會盡快完成處理並寄出商品。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}

export function buildReadyNotificationHtml(
  params: ReadyNotificationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);

  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#6C71C4",
      title: displaySiteTitle,
      subtitle: "訂單已備妥通知",
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6C71C4; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已備妥！</h2>
    <p>這封信是要通知您，您所訂購的商品已準備完成，將依配送方式安排後續出貨或取件。</p>

    ${
    buildNotificationSummaryHtml({
      orderId: params.orderId,
      phone: params.phone,
      customFieldsHtml: params.customFieldsHtml,
      receiptHtml: params.receiptHtml,
      deliveryMethod: params.deliveryMethod,
      city: params.city,
      district: params.district,
      address: params.address,
      storeName: params.storeName,
      storeAddress: params.storeAddress,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus,
      note: params.note,
      statusNote: params.statusNote,
      accentColor: "#6C71C4",
    })
  }

    ${buildOrderItemsHtml(params)}

    <p style="margin-top: 30px; color: #555;">若是來店或超商取貨，請依後續通知或店家說明前往取件；如有疑問，歡迎直接聯繫我們。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}

export interface CompletedNotificationParams extends FullOrderEmailDetails {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
}

export interface DeliveredNotificationParams extends FullOrderEmailDetails {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
}

export interface CancelledNotificationParams extends FullOrderEmailDetails {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
  cancelReason: string;
}

export interface FailedNotificationParams extends FullOrderEmailDetails {
  orderId: string;
  siteTitle: string;
  logoUrl?: string;
  lineName: string;
  failureReason: string;
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
      title: displaySiteTitle,
      subtitle: "訂單已完成",
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #2E7D32; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已順利完成！</h2>
    <p>這封信是要通知您，您的訂單 <strong>${
    sanitize(params.orderId)
  }</strong> 已經順利完成。</p>
    ${
    buildNotificationSummaryHtml({
      ...params,
      accentColor: "#2E7D32",
    })
  }
    ${buildOrderItemsHtml(params)}
    <p>非常感謝您的購買與支持，期待您再次光臨！如果有任何問題，歡迎隨時與我們聯絡。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}

export function buildDeliveredNotificationHtml(
  params: DeliveredNotificationParams,
): string {
  const displaySiteTitle = normalizeEmailSiteTitle(params.siteTitle);
  return `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  ${
    buildEmailHeaderHtml({
      backgroundColor: "#2AA198",
      title: displaySiteTitle,
      subtitle: "訂單已配達通知",
      logoAlt: `${displaySiteTitle} Logo`,
      logoUrl: params.logoUrl,
    })
  }
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #2AA198; margin-top: 0;">親愛的 ${
    sanitize(params.lineName)
  }，您的訂單已配達！</h2>
    <p>這封信是要通知您，訂單 <strong>${
    sanitize(params.orderId)
  }</strong> 已由物流端配達。</p>
    ${
    buildNotificationSummaryHtml({
      ...params,
      accentColor: "#2AA198",
      backgroundColor: "#f0fdfa",
    })
  }
    ${buildOrderItemsHtml(params)}
    <p>如商品或配送狀態有任何問題，歡迎直接聯繫我們協助確認。</p>
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
      title: displaySiteTitle,
      subtitle: "訂單已取消通知",
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
    ${
    buildNotificationSummaryHtml({
      ...params,
      accentColor: "#B42318",
      backgroundColor: "#fef3f2",
      extraHtml:
        `<p style="margin: 10px 0 0 0;"><strong>取消原因：</strong> ${safeReason}</p>`,
    })
  }
    ${buildOrderItemsHtml(params)}
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
      title: displaySiteTitle,
      subtitle: "訂單已失敗通知",
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
    ${
    buildNotificationSummaryHtml({
      ...params,
      accentColor: "#B42318",
      backgroundColor: "#fef3f2",
      extraHtml:
        `<p style="margin: 10px 0 0 0;"><strong>失敗原因：</strong> ${safeReason}</p>`,
    })
  }
    ${buildOrderItemsHtml(params)}
    <p style="margin-top: 20px; color: #555;">若仍需商品，請重新下單；如有疑問，歡迎直接聯繫我們。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
}
