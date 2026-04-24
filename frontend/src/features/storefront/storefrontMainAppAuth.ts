import { authFetch, loginWithLine } from "../../lib/auth.ts";
import { API_URL, LINE_REDIRECT } from "../../lib/appConfig.ts";
import { state } from "../../lib/appState.ts";
import { escapeHtml, isValidEmail, Toast } from "../../lib/sharedUtils.ts";
import {
  closeDialog,
  showDialog,
  showError,
  showLoading,
  showValidationMessage,
} from "../../lib/swalDialogs.ts";
import {
  applySavedOrderFormPrefs,
} from "./storefrontOrderActions.ts";
import { loadDeliveryPrefs } from "./storefrontDeliveryActions.ts";

type StringRecord = Record<string, unknown>;

function asStringRecord(value: unknown): StringRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as StringRecord
    : {};
}

function parseStringRecord(value: unknown): StringRecord {
  if (!value) return {};
  if (typeof value !== "string") return asStringRecord(value);
  try {
    return asStringRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function parseStringArray(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "")) : [];
  } catch {
    return [];
  }
}

type StorefrontMainAppAuthDeps = {
  getInputElement: (id: string) => HTMLInputElement | null;
  getFormControlValue: (id: string) => string;
  getErrorMessage: (error: unknown, fallback?: string) => string;
  updateFormState: () => void;
};

export function createStorefrontMainAppAuth(
  deps: StorefrontMainAppAuthDeps,
) {
  function prefillUserFields() {
    if (!state.currentUser) return;

    const user = state.currentUser;
    const phoneEl = deps.getInputElement("field-phone");
    const emailEl = deps.getInputElement("field-email");
    if (phoneEl && user.phone) phoneEl.value = String(user.phone);
    if (emailEl && user.email) emailEl.value = String(user.email);

    const customDefaults = parseStringRecord(user.defaultCustomFields);

    for (const [key, value] of Object.entries(customDefaults)) {
      const element = document.getElementById(`field-${key}`);
      if (
        value &&
        (element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement)
      ) {
        element.value = String(value);
      }
    }
  }

  function showUserInfo() {
    document.getElementById("login-prompt")?.classList.add("hidden");
    document.getElementById("user-info")?.classList.remove("hidden");
    document.getElementById("user-display-name")!.textContent = String(
      state.currentUser?.displayName || state.currentUser?.display_name || "",
    );

    const avatar = document.getElementById("user-avatar");
    if (avatar instanceof HTMLImageElement) {
      avatar.src = String(
        state.currentUser?.pictureUrl ||
          state.currentUser?.picture_url ||
          "https://via.placeholder.com/48",
      );
    }

    const lineNameInput = deps.getInputElement("line-name");
    if (lineNameInput) {
      lineNameInput.value = String(
        state.currentUser?.displayName || state.currentUser?.display_name || "",
      );
    }

    prefillUserFields();
    applySavedOrderFormPrefs();
    deps.updateFormState();

    setTimeout(() => {
      loadDeliveryPrefs();
      applySavedOrderFormPrefs();
    }, 100);
  }

  async function handleLineCallback(code: string, stateParam: string | null) {
    const saved = localStorage.getItem("coffee_line_state");
    localStorage.removeItem("coffee_line_state");
    if (!saved || stateParam !== saved) {
      showError("驗證失敗", "請重新登入");
      history.replaceState({}, "", "main.html");
      return;
    }

    showLoading("登入中...");
    try {
      const response = await fetch(`${API_URL}?action=customerLineLogin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          redirectUri: LINE_REDIRECT.main,
        }),
      });
      const result = await response.json();
      history.replaceState({}, "", "main.html");

      if (result.success) {
        state.currentUser = result.user;
        localStorage.setItem("coffee_user", JSON.stringify(state.currentUser));
        if (result.token) {
          localStorage.setItem("coffee_jwt", result.token);
        }
        showUserInfo();
        closeDialog();
        return;
      }

      throw new Error(result.error || "登入失敗");
    } catch (error) {
      showError("登入失敗", deps.getErrorMessage(error));
    }
  }

  function checkLoginStatus() {
    const saved = localStorage.getItem("coffee_user");
    const token = localStorage.getItem("coffee_jwt");
    if (saved && token) {
      try {
        state.currentUser = JSON.parse(saved);
        showUserInfo();
      } catch {
        localStorage.removeItem("coffee_user");
        localStorage.removeItem("coffee_jwt");
      }
      return;
    }

    localStorage.removeItem("coffee_user");
    localStorage.removeItem("coffee_jwt");
  }

  async function showProfileModal() {
    if (!state.currentUser) return;
    const user = state.currentUser;
    const fields = (state.formFields || []).filter((field) =>
      field.enabled && field.field_type !== "section_title"
    );

    const customDefaults = parseStringRecord(user.defaultCustomFields);

    let fieldsHtml = "";
    for (const field of fields) {
      const key = field.field_key || "";
      let currentVal = "";
      if (key === "phone") currentVal = String(user.phone || "");
      else if (key === "email") currentVal = String(user.email || "");
      else currentVal = String(customDefaults[key] || "");

      const escapedVal = escapeHtml(currentVal);
      const escapedLabel = escapeHtml(field.label || "");
      const escapedPlaceholder = escapeHtml(field.placeholder || "");

      if (field.field_type === "select") {
        const options = parseStringArray(field.options);
        fieldsHtml += `<div style="margin-bottom:12px">
                <label style="display:block;font-weight:600;margin-bottom:4px;color:#3C2415;font-size:14px">${escapedLabel}</label>
                <select id="profile-${key}" class="swal2-select" style="margin:0;width:100%">
                    <option value="">-- 請選擇 --</option>
                    ${
          options.map((option) =>
            `<option value="${escapeHtml(option)}" ${
              option === currentVal ? "selected" : ""
            }>${escapeHtml(option)}</option>`
          ).join("")
        }
                </select>
            </div>`;
      } else if (field.field_type === "textarea") {
        fieldsHtml += `<div style="margin-bottom:12px">
                <label style="display:block;font-weight:600;margin-bottom:4px;color:#3C2415;font-size:14px">${escapedLabel}</label>
                <textarea id="profile-${key}" class="swal2-textarea" placeholder="${escapedPlaceholder}" style="margin:0;width:100%;min-height:60px">${escapedVal}</textarea>
            </div>`;
      } else {
        fieldsHtml += `<div style="margin-bottom:12px">
                <label style="display:block;font-weight:600;margin-bottom:4px;color:#3C2415;font-size:14px">${escapedLabel}</label>
                <input id="profile-${key}" type="${
          field.field_type || "text"
        }" class="swal2-input" value="${escapedVal}" placeholder="${escapedPlaceholder}" style="margin:0;width:100%">
            </div>`;
      }
    }

    const { value: confirmed } = await showDialog({
      title: "會員資料",
      html:
        `<div style="text-align:left;max-height:60vh;overflow-y:auto;padding:4px">
            <p style="color:#888;font-size:13px;margin-bottom:16px">編輯常用資料，下次登入時將自動帶入表單。</p>
            ${fieldsHtml}
        </div>`,
      showCancelButton: true,
      confirmButtonText: "儲存",
      cancelButtonText: "取消",
      confirmButtonColor: "#3C2415",
      customClass: {
        popup: "storefront-profile-popup",
      },
      preConfirm: () => {
        const email = deps.getFormControlValue("profile-email");
        if (email && !isValidEmail(email)) {
          showValidationMessage("請填寫正確的電子郵件格式");
          return false;
        }
        return true;
      },
    });

    if (!confirmed) return;

    const profileData: StringRecord = {};
    const customFieldsData: StringRecord = {};
    for (const field of fields) {
      const key = field.field_key || "";
      const value = deps.getFormControlValue(`profile-${key}`);
      if (key === "phone") profileData.phone = value;
      else if (key === "email") profileData.email = value;
      else if (value) customFieldsData[key] = value;
    }
    profileData.defaultCustomFields = JSON.stringify(customFieldsData);

    try {
      showLoading("儲存中...");
      const response = await authFetch(`${API_URL}?action=updateUserProfile`, {
        method: "POST",
        body: JSON.stringify(profileData),
      });
      const result = await response.json();
      if (result.success && result.profile) {
        Object.assign(state.currentUser, result.profile);
        localStorage.setItem("coffee_user", JSON.stringify(state.currentUser));
        prefillUserFields();
        Toast.fire({ icon: "success", title: "會員資料已儲存" });
        return;
      }

      showError("錯誤", result.error || "儲存失敗");
    } catch (error) {
      showError("錯誤", deps.getErrorMessage(error));
    }
  }

  function logoutCurrentUser() {
    state.currentUser = null;
    localStorage.removeItem("coffee_user");
    localStorage.removeItem("coffee_jwt");
    document.getElementById("login-prompt")?.classList.remove("hidden");
    document.getElementById("user-info")?.classList.add("hidden");

    const lineNameInput = deps.getInputElement("line-name");
    if (lineNameInput) lineNameInput.value = "";

    const phoneEl = deps.getInputElement("field-phone");
    const emailEl = deps.getInputElement("field-email");
    if (phoneEl) phoneEl.value = "";
    if (emailEl) emailEl.value = "";
    deps.updateFormState();
  }

  function startMainLogin() {
    return loginWithLine(LINE_REDIRECT.main, "coffee_line_state");
  }

  return {
    checkLoginStatus,
    handleLineCallback,
    logoutCurrentUser,
    prefillUserFields,
    showProfileModal,
    showUserInfo,
    startMainLogin,
  };
}
