import { buildOrderFlexBodyPayload } from "./dashboardOrderFlexBody.ts";
import { buildOrderFlexMessageBubble } from "./dashboardOrderFlexBubble.ts";
import type { DashboardOrderRecord } from "./dashboardOrderTypes";
import type {
  DashboardLineFlexMessage,
  DashboardOrderNotificationDeps,
} from "./dashboardOrderNotificationTypes";

export function createOrderFlexMessageBuilder(
  deps: DashboardOrderNotificationDeps,
) {
  function resolveOrderLineUserId(order: DashboardOrderRecord) {
    return String(order?.lineUserId || order?.["line_user_id"] || "").trim();
  }

  function getSiteTitle() {
    return String(deps.getSiteTitle?.() || "").trim() || "Script Coffee";
  }

  function buildLineFlexMessage(
    order: DashboardOrderRecord,
    newStatus: string,
  ): DashboardLineFlexMessage {
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
