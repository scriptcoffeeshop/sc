import { buildOrderFlexBodyPayload } from "./order-flex-body.js";
import { buildOrderFlexMessageBubble } from "./order-flex-bubble.js";

export function createOrderFlexMessageBuilder(deps) {
  function resolveOrderLineUserId(order) {
    return String(order?.lineUserId || order?.line_user_id || "").trim();
  }

  function getSiteTitle() {
    return String(deps.getSiteTitle?.() || "").trim() || "Script Coffee";
  }

  function buildLineFlexMessage(order, newStatus) {
    const siteTitle = getSiteTitle();
    const {
      bodyContents,
      statusLabel,
      customTrackingUrl,
      hasTrackingLinkCta,
    } = buildOrderFlexBodyPayload({
      deps,
      order,
      newStatus,
    });

    return buildOrderFlexMessageBubble({
      siteTitle,
      orderId: String(order?.orderId || ""),
      statusLabel,
      bodyContents,
      customTrackingUrl,
      hasTrackingLinkCta,
    });
  }

  return {
    buildLineFlexMessage,
    resolveOrderLineUserId,
  };
}
