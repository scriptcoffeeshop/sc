import { createApp, type App } from "vue";
import { normalizeTrackingUrl } from "../../lib/trackingUrls.ts";
import type { DashboardSwal, DashboardSwalResult } from "./dashboardOrderTypes.ts";
import DashboardShippingInfoForm, {
  type DashboardShippingInfoFormExpose,
  type DashboardShippingInfoValues,
} from "./DashboardShippingInfoForm.vue";

interface DashboardShippingInfoDialogOptions {
  Swal: DashboardSwal;
  title: string;
  confirmButtonText: string;
  confirmButtonColor?: string;
  cancelButtonText?: string;
  initialValues?: DashboardShippingInfoValues;
  idPrefix?: string;
  shared?: boolean;
}

export type DashboardShippingInfoDialogResult = DashboardSwalResult & {
  value?: DashboardShippingInfoValues | false;
};

export async function openDashboardShippingInfoDialog(
  options: DashboardShippingInfoDialogOptions,
): Promise<DashboardShippingInfoDialogResult> {
  const root = document.createElement("div");
  let formApp: App<Element> | null = null;
  let formRef: DashboardShippingInfoFormExpose | null = null;

  return await options.Swal.fire({
    title: options.title,
    html: root,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText,
    cancelButtonText: options.cancelButtonText || "取消",
    confirmButtonColor: options.confirmButtonColor || "#268BD2",
    focusConfirm: false,
    didOpen: (popup: unknown) => {
      if (
        !root.isConnected &&
        popup &&
        typeof (popup as { appendChild?: unknown }).appendChild === "function"
      ) {
        (popup as { appendChild: (node: Node) => void }).appendChild(root);
      }
      formApp = createApp(DashboardShippingInfoForm, {
        initialValues: options.initialValues || {},
        idPrefix: options.idPrefix || "swal",
        shared: Boolean(options.shared),
      });
      formRef = formApp.mount(root) as unknown as DashboardShippingInfoFormExpose;
    },
    willClose: () => {
      formApp?.unmount();
      formApp = null;
      formRef = null;
    },
    preConfirm: () => {
      const values = formRef?.getValues() || {};
      const trackingUrl = String(values.trackingUrl || "").trim();
      if (trackingUrl && !normalizeTrackingUrl(trackingUrl)) {
        options.Swal.showValidationMessage?.(
          "物流追蹤網址需以 http:// 或 https:// 開頭",
        );
        return false;
      }
      return { ...values, trackingUrl };
    },
  }) as DashboardShippingInfoDialogResult;
}
