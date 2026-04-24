import { parseJsonRecord } from "../../lib/jsonUtils.ts";
import {
  getDashboardFormControlValue,
  getDashboardInputChecked,
} from "./dashboardFormControls.ts";
import {
  escapeHtml,
  FIELD_TYPE_LABELS,
  parseFieldOptionsText,
  serializeFieldOptions,
  type DashboardFormField,
} from "./dashboardFormFieldsShared.ts";

export interface DashboardDeliveryOptionLike {
  id?: string | number;
  label?: string;
}

export interface DashboardFormFieldModalValues {
  fieldKey?: string;
  label: string;
  fieldType: string;
  placeholder: string;
  options: string;
  required: boolean;
  deliveryVisibility: string | null;
}

export function renderDeliveryVisibilityCheckboxes(
  deliveryOptions: DashboardDeliveryOptionLike[],
  existingVisibility: string | null | undefined,
): void {
  const container = document.getElementById("swal-dv");
  if (!container) return;

  if (!deliveryOptions.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "text-xs ui-text-muted";
    emptyState.textContent = "尚未設定配送方式";
    container.replaceChildren(emptyState);
    return;
  }

  const visibility = parseJsonRecord(existingVisibility);

  const fragment = document.createDocumentFragment();
  deliveryOptions.forEach((option) => {
    const deliveryId = String(option.id || "");
    const checkboxLabel = document.createElement("label");
    checkboxLabel.className =
      "flex items-center gap-1 text-sm cursor-pointer px-2 py-1 rounded-lg border";
    checkboxLabel.style.borderColor = "#E2DCC8";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "dv-cb";
    checkbox.dataset.deliveryId = deliveryId;
    checkbox.checked = visibility[deliveryId] !== false;

    checkboxLabel.append(checkbox, ` ${String(option.label || deliveryId)}`);
    fragment.appendChild(checkboxLabel);
  });

  container.replaceChildren(fragment);
}

export function collectDeliveryVisibility(): string | null {
  const checkboxes = document.querySelectorAll<HTMLInputElement>(".dv-cb");
  if (!checkboxes.length) return null;

  const visibility: Record<string, boolean> = {};
  checkboxes.forEach((checkbox) => {
    const deliveryId = checkbox.dataset.deliveryId || "";
    if (deliveryId) visibility[deliveryId] = checkbox.checked;
  });
  return JSON.stringify(visibility);
}

export function buildAddFieldModalHtml(): string {
  return `
              <div style="text-align:left;">
                  <label class="block text-sm mb-1 font-medium">欄位識別碼 (英文，唯一)</label>
                  <input id="swal-fk" class="swal2-input" placeholder="例：receipt_type" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                  <input id="swal-fl" class="swal2-input" placeholder="例：開立收據" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">類型</label>
                  <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                      <option value="text">文字</option>
                      <option value="email">Email</option>
                      <option value="tel">電話</option>
                      <option value="number">數字</option>
                      <option value="select">下拉選單</option>
                      <option value="checkbox">勾選框</option>
                      <option value="textarea">多行文字</option>
                  </select>
                  <label class="block text-sm mb-1 font-medium">提示文字 (placeholder)</label>
                  <input id="swal-fp" class="swal2-input" placeholder="例：請選擇" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">選項 (僅下拉選單，逗號分隔)</label>
                  <input id="swal-fo" class="swal2-input" placeholder="例：二聯式,三聯式,免開" style="margin:0 0 12px 0;width:100%">
                  <label class="flex items-center gap-2 cursor-pointer mt-2">
                      <input type="checkbox" id="swal-fr"> <span class="text-sm">必填</span>
                  </label>
                  <div class="mt-3 pt-3 border-t" style="border-color:#E2DCC8">
                      <label class="block text-sm mb-1 font-medium">配送方式可見性</label>
                      <p class="text-xs ui-text-muted mb-2">取消勾選 = 該配送方式下不顯示此欄位，全勾 = 全部顯示</p>
                      <div id="swal-dv" class="flex flex-wrap gap-2"></div>
                  </div>
              </div>`;
}

export function buildEditFieldModalHtml(field: DashboardFormField): string {
  return `
              <div style="text-align:left;">
                  <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                  <input id="swal-fl" class="swal2-input" value="${
    escapeHtml(field.label || "")
  }" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">類型</label>
                  <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                      ${
    Object.entries(FIELD_TYPE_LABELS).map(([key, value]) =>
      `<option value="${key}" ${
        key === field.field_type ? "selected" : ""
      }>${value}</option>`
    ).join("")
  }
                  </select>
                  <label class="block text-sm mb-1 font-medium">提示文字</label>
                  <input id="swal-fp" class="swal2-input" value="${
    escapeHtml(field.placeholder || "")
  }" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">選項 (下拉選單，逗號分隔)</label>
                  <input id="swal-fo" class="swal2-input" value="${
    escapeHtml(parseFieldOptionsText(field.options))
  }" style="margin:0 0 12px 0;width:100%">
                  <label class="flex items-center gap-2 cursor-pointer mt-2">
                      <input type="checkbox" id="swal-fr" ${
    field.required ? "checked" : ""
  }> <span class="text-sm">必填</span>
                  </label>
                  <div class="mt-3 pt-3 border-t" style="border-color:#E2DCC8">
                      <label class="block text-sm mb-1 font-medium">配送方式可見性</label>
                      <p class="text-xs ui-text-muted mb-2">取消勾選 = 該配送方式下不顯示此欄位</p>
                      <div id="swal-dv" class="flex flex-wrap gap-2"></div>
                  </div>
              </div>`;
}

export function collectAddFieldFormValues(): DashboardFormFieldModalValues | false {
  const fieldKey = getDashboardFormControlValue("swal-fk");
  const label = getDashboardFormControlValue("swal-fl");
  if (!fieldKey || !label) return false;

  return {
    fieldKey,
    label,
    fieldType: getDashboardFormControlValue("swal-ft"),
    placeholder: getDashboardFormControlValue("swal-fp"),
    options: serializeFieldOptions(getDashboardFormControlValue("swal-fo")),
    required: getDashboardInputChecked("swal-fr"),
    deliveryVisibility: collectDeliveryVisibility(),
  };
}

export function collectEditFieldFormValues(): DashboardFormFieldModalValues | false {
  const label = getDashboardFormControlValue("swal-fl");
  if (!label) return false;

  return {
    label,
    fieldType: getDashboardFormControlValue("swal-ft"),
    placeholder: getDashboardFormControlValue("swal-fp"),
    options: serializeFieldOptions(getDashboardFormControlValue("swal-fo")),
    required: getDashboardInputChecked("swal-fr"),
    deliveryVisibility: collectDeliveryVisibility(),
  };
}
