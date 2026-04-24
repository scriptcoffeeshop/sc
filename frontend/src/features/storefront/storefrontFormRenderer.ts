// ============================================
// form-renderer.js — 動態表單欄位收集與品牌套用
// ============================================

import { isValidEmail } from "../../lib/sharedUtils.ts";

/**
 * 收集所有動態欄位的值，同時驗證必填
 * @param {Array} fields - coffee_form_fields 記錄
 * @returns {{ valid: boolean, data: Object, error: string }}
 */
export function collectDynamicFields(fields, values = {}) {
  const data = {};

  for (const f of (fields || [])) {
    if (f.field_type === "section_title") continue;
    if (f.enabled === false) continue;

    const fieldKey = String(f.field_key || "");
    // 跳過狀態中不存在的欄位（可能因配送方式而被隱藏）
    if (!fieldKey || !Object.prototype.hasOwnProperty.call(values, fieldKey)) {
      continue;
    }

    let value;
    if (f.field_type === "checkbox") {
      value = values[fieldKey] === "是" || values[fieldKey] === "true"
        ? "是"
        : "否";
    } else {
      value = String(values[fieldKey] || "").trim();
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

    data[fieldKey] = value;
  }

  return { valid: true, data, error: "" };
}
