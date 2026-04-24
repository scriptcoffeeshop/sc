// ============================================
// form-renderer.js — 動態表單欄位收集與品牌套用
// ============================================

import { isValidEmail } from "../../lib/sharedUtils.ts";

/**
 * 收集所有動態欄位的值，同時驗證必填
 * @param {Array} fields - coffee_form_fields 記錄
 * @returns {{ valid: boolean, data: Object, error: string }}
 */
export function collectDynamicFields(fields) {
  const data = {};

  for (const f of (fields || [])) {
    if (f.field_type === "section_title") continue;

    const fieldId = `field-${f.field_key}`;
    const el = document.getElementById(fieldId);
    // 跳過 DOM 中不存在的欄位（可能因配送方式而被隱藏）
    if (!el) continue;

    let value;
    if (f.field_type === "checkbox") {
      value = el instanceof HTMLInputElement && el.checked ? "是" : "否";
    } else if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      value = el.value.trim();
    } else {
      value = "";
    }

    // 驗證必填
    if (f.required && !value) {
      return {
        valid: false,
        data: {},
        error: `請填寫「${String(f.label || "").trim()}」`,
      };
    }

    // email 格式驗證
    if (
      f.field_type === "email" && value &&
      !isValidEmail(value)
    ) {
      return {
        valid: false,
        data: {},
        error: `「${String(f.label || "").trim()}」格式不正確`,
      };
    }

    data[f.field_key] = value;
  }

  return { valid: true, data, error: "" };
}
