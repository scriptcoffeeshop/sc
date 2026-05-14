import { createApp, type App } from "vue";
import DashboardOrderEmailConfirm from "./DashboardOrderEmailConfirm.vue";
import DashboardOrderLineConfirm from "./DashboardOrderLineConfirm.vue";
import DashboardOrderStatusChangeConfirm, {
  type DashboardOrderStatusChangeConfirmExpose,
  type DashboardOrderStatusChangeValues,
} from "./DashboardOrderStatusChangeConfirm.vue";
import type { DashboardSwal, DashboardSwalResult } from "./dashboardOrderTypes.ts";

type PopupWithAppend = {
  appendChild?: (node: Node) => void;
};

function attachRoot(root: HTMLElement, popup: unknown) {
  if (root.isConnected) return;
  const target = popup as PopupWithAppend | null;
  if (typeof target?.appendChild === "function") {
    target.appendChild(root);
  }
}

export async function openDashboardOrderEmailConfirmDialog(options: {
  Swal: DashboardSwal;
  orderId: string;
  emailTypeLabel: string;
  targetEmail: string;
  statusLabel: string;
}): Promise<DashboardSwalResult> {
  const root = document.createElement("div");
  let app: App<Element> | null = null;

  return await options.Swal.fire({
    title: "確認發送信件",
    html: root,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "發送信件",
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
    didOpen: (popup: unknown) => {
      attachRoot(root, popup);
      app = createApp(DashboardOrderEmailConfirm, {
        orderId: options.orderId,
        emailTypeLabel: options.emailTypeLabel,
        targetEmail: options.targetEmail,
        statusLabel: options.statusLabel,
      });
      app.mount(root);
    },
    willClose: () => {
      app?.unmount();
      app = null;
    },
  }) as DashboardSwalResult;
}

export async function openDashboardOrderLineConfirmDialog(options: {
  Swal: DashboardSwal;
  orderId: string;
  targetLine: string;
  statusLabel: string;
}): Promise<DashboardSwalResult> {
  const root = document.createElement("div");
  let app: App<Element> | null = null;

  return await options.Swal.fire({
    title: "確認發送 LINE 通知",
    html: root,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "發送 LINE",
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
    didOpen: (popup: unknown) => {
      attachRoot(root, popup);
      app = createApp(DashboardOrderLineConfirm, {
        orderId: options.orderId,
        targetLine: options.targetLine,
        statusLabel: options.statusLabel,
      });
      app.mount(root);
    },
    willClose: () => {
      app?.unmount();
      app = null;
    },
  }) as DashboardSwalResult;
}

export async function openDashboardOrderStatusChangeConfirmDialog(options: {
  Swal: DashboardSwal;
  orderId: string;
  currentStatusLabel: string;
  newStatusLabel: string;
  initialStatusNote?: string;
}): Promise<DashboardSwalResult & { value?: DashboardOrderStatusChangeValues }> {
  const root = document.createElement("div");
  let app: App<Element> | null = null;
  let formRef: DashboardOrderStatusChangeConfirmExpose | null = null;

  return await options.Swal.fire({
    title: "確認變更訂單狀態",
    html: root,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "確認變更",
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
    didOpen: (popup: unknown) => {
      attachRoot(root, popup);
      app = createApp(DashboardOrderStatusChangeConfirm, {
        orderId: options.orderId,
        currentStatusLabel: options.currentStatusLabel,
        newStatusLabel: options.newStatusLabel,
        initialStatusNote: options.initialStatusNote || "",
      });
      formRef = app.mount(root) as unknown as DashboardOrderStatusChangeConfirmExpose;
    },
    willClose: () => {
      app?.unmount();
      app = null;
      formRef = null;
    },
    preConfirm: () => formRef?.getValues() || { statusNote: "" },
  }) as DashboardSwalResult & { value?: DashboardOrderStatusChangeValues };
}
