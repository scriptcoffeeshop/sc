import Swal from "./swal.js";

type SwalIcon = "success" | "error" | "warning" | "info" | "question";

export interface SwalDialogResult {
  isConfirmed?: boolean;
  isDenied?: boolean;
  isDismissed?: boolean;
  value?: unknown;
}

export type SwalDialogPromise = Promise<SwalDialogResult>;

export function showAlert(
  title: string,
  text = "",
  icon: SwalIcon = "info",
): SwalDialogPromise {
  return Swal.fire(title, text, icon);
}

export function showError(title: string, text = ""): SwalDialogPromise {
  return showAlert(title, text, "error");
}

export function showWarning(title: string, text = ""): SwalDialogPromise {
  return showAlert(title, text, "warning");
}

export function showSuccess(title: string, text = ""): SwalDialogPromise {
  return showAlert(title, text, "success");
}

export function showLoading(title: string): SwalDialogPromise {
  return Swal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
}

export function confirmWarning(options: {
  title: string;
  text: string;
  confirmButtonText: string;
  cancelButtonText: string;
  confirmButtonColor?: string;
}): SwalDialogPromise {
  return Swal.fire({
    ...options,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: options.confirmButtonColor || "#3C2415",
  });
}
