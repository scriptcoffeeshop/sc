import type { ReceiptInfo } from "../../types";
import type { FlexContent } from "./dashboardOrderFlexLayout";
import type {
  DashboardAuthFetch,
  DashboardOrderRecord,
  DashboardSwal,
  DashboardToast,
} from "./dashboardOrderTypes";

export type DashboardOrderLabelMap = Record<string, string>;

export type DashboardLineFlexMessage = Record<string, unknown> & {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
};

export type DashboardOrderNotificationDeps = {
  API_URL: string;
  authFetch: DashboardAuthFetch;
  getAuthUserId: () => string;
  getSiteTitle?: () => unknown;
  getOrders?: () => DashboardOrderRecord[];
  Toast: DashboardToast;
  Swal: DashboardSwal;
  esc: (value: unknown) => string;
  orderStatusLabel: DashboardOrderLabelMap;
  orderMethodLabel: DashboardOrderLabelMap;
  orderPayMethodLabel: DashboardOrderLabelMap;
  orderPayStatusLabel: DashboardOrderLabelMap;
  normalizeReceiptInfo: (value: unknown) => ReceiptInfo | null;
  normalizeTrackingUrl: (value: unknown) => string;
};

export type DashboardOrderFlexBodyPayload = {
  bodyContents: FlexContent[];
  statusLabel: string;
  customTrackingUrl: string;
  hasTrackingLinkCta: boolean;
};

export type DashboardOrderFlexMessageBuilder = {
  buildLineFlexMessage: (
    order: DashboardOrderRecord,
    newStatus: string,
  ) => DashboardLineFlexMessage;
  resolveOrderLineUserId: (order: DashboardOrderRecord) => string;
};

export type DashboardOrderFlexControllerDeps =
  DashboardOrderNotificationDeps & DashboardOrderFlexMessageBuilder;
