import { createApp, type App } from "vue";
import type { DashboardSwal, DashboardSwalResult } from "./dashboardOrderTypes.ts";
import DashboardOrderReasonForm, {
  type DashboardOrderReasonFormExpose,
  type DashboardOrderReasonValues,
} from "./DashboardOrderReasonForm.vue";

interface DashboardOrderReasonDialogOptions {
  Swal: DashboardSwal;
  title: string;
  label: string;
  placeholder: string;
  confirmButtonText: string;
  initialReason?: string;
}

export type DashboardOrderReasonDialogResult = DashboardSwalResult & {
  value?: DashboardOrderReasonValues;
};

export async function openDashboardOrderReasonDialog(
  options: DashboardOrderReasonDialogOptions,
): Promise<DashboardOrderReasonDialogResult> {
  const root = document.createElement("div");
  let formApp: App<Element> | null = null;
  let formRef: DashboardOrderReasonFormExpose | null = null;

  return await options.Swal.fire({
    title: options.title,
    html: root,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText,
    cancelButtonText: "取消",
    confirmButtonColor: "#DC322F",
    focusConfirm: false,
    didOpen: (popup: unknown) => {
      if (
        !root.isConnected &&
        popup &&
        typeof (popup as { appendChild?: unknown }).appendChild === "function"
      ) {
        (popup as { appendChild: (node: Node) => void }).appendChild(root);
      }
      formApp = createApp(DashboardOrderReasonForm, {
        label: options.label,
        placeholder: options.placeholder,
        initialReason: options.initialReason || "",
      });
      formRef = formApp.mount(root) as unknown as DashboardOrderReasonFormExpose;
    },
    willClose: () => {
      formApp?.unmount();
      formApp = null;
      formRef = null;
    },
    preConfirm: () => formRef?.getValues() || { cancelReason: "" },
  }) as DashboardOrderReasonDialogResult;
}
