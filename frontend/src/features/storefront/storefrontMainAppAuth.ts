import { createApp, type App } from "vue";
import { authFetch, loginWithLine } from "../../lib/auth.ts";
import { API_URL, LINE_REDIRECT } from "../../lib/appConfig.ts";
import { state } from "../../lib/appState.ts";
import { parseJsonArray, parseJsonRecord } from "../../lib/jsonUtils.ts";
import { isValidEmail, Toast } from "../../lib/sharedUtils.ts";
import type { SessionUser } from "../../types/session";
import {
  closeDialog,
  showDialog,
  showError,
  showLoading,
  showValidationMessage,
} from "../../lib/swalDialogs.ts";
import {
  applySavedOrderFormPrefs,
} from "./storefrontOrderReceiptPrefs.ts";
import { loadDeliveryPrefs } from "./storefrontDeliveryActions.ts";
import {
  buildInitialDynamicFieldValues,
  emitStorefrontDynamicFieldValuesUpdated,
} from "./storefrontDynamicFieldValues.ts";
import StorefrontProfileForm, {
  type StorefrontProfileFieldView,
  type StorefrontProfileFormValues,
} from "./StorefrontProfileForm.vue";

type StringRecord = Record<string, unknown>;
type StorefrontProfileFormExpose = {
  getValues: () => StorefrontProfileFormValues;
};

function parseStringRecord(value: unknown): StringRecord {
  return parseJsonRecord(value);
}

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value).map((item) => String(item || ""));
}

type StorefrontMainAppAuthDeps = {
  getErrorMessage: (error: unknown, fallback?: string) => string;
  updateFormState: () => void;
};

export function buildProfileFormFields(
  fields: Array<Record<string, unknown>>,
  user: SessionUser,
): {
  fields: StorefrontProfileFieldView[];
  values: StorefrontProfileFormValues;
} {
  const customDefaults = parseStringRecord(user["defaultCustomFields"]);
  const profileFields: StorefrontProfileFieldView[] = [];
  const values: StorefrontProfileFormValues = {};

  for (const field of fields) {
    const key = String(field["field_key"] || "");
    if (!key) continue;
    let currentValue = "";
    if (key === "phone") currentValue = String(user.phone || "");
    else if (key === "email") currentValue = String(user.email || "");
    else currentValue = String(customDefaults[key] || "");

    profileFields.push({
      key,
      label: String(field["label"] || ""),
      placeholder: String(field["placeholder"] || ""),
      type: String(field["field_type"] || "text"),
      options: field["field_type"] === "select"
        ? parseStringArray(field["options"])
        : [],
    });
    values[key] = currentValue;
  }

  return { fields: profileFields, values };
}

export function buildProfileUpdatePayload(
  fields: Array<Record<string, unknown>>,
  values: StorefrontProfileFormValues,
): StringRecord {
  const profileData: StringRecord = {};
  const customFieldsData: StringRecord = {};

  for (const field of fields) {
    const key = String(field["field_key"] || "");
    if (!key) continue;
    const value = String(values[key] || "");
    if (key === "phone") profileData["phone"] = value;
    else if (key === "email") profileData["email"] = value;
    else if (value) customFieldsData[key] = value;
  }
  profileData["defaultCustomFields"] = JSON.stringify(customFieldsData);
  return profileData;
}

export function createStorefrontMainAppAuth(
  deps: StorefrontMainAppAuthDeps,
) {
  function prefillUserFields() {
    if (!state.currentUser) return;

    emitStorefrontDynamicFieldValuesUpdated(
      buildInitialDynamicFieldValues(state.formFields, state.currentUser),
    );
  }

  function showUserInfo() {
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
      const savedUser = parseJsonRecord(saved);
      const userId = String(savedUser["userId"] || "");
      if (userId) {
        state.currentUser = {
          ...savedUser,
          userId,
        } as SessionUser;
        showUserInfo();
        return;
      }
      localStorage.removeItem("coffee_user");
      localStorage.removeItem("coffee_jwt");
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
    const profileForm = buildProfileFormFields(fields, user);
    const root = document.createElement("div");
    let profileFormApp: App<Element> | null = null;
    let profileFormRef: StorefrontProfileFormExpose | null = null;
    let latestProfileValues = { ...profileForm.values };

    const { value: confirmed } = await showDialog({
      title: "會員資料",
      html: root,
      showCancelButton: true,
      confirmButtonText: "儲存",
      cancelButtonText: "取消",
      confirmButtonColor: "#3C2415",
      customClass: {
        popup: "storefront-profile-popup",
      },
      didOpen: (popup: unknown) => {
        if (
          !root.isConnected &&
          popup &&
          typeof (popup as { appendChild?: unknown }).appendChild === "function"
        ) {
          (popup as { appendChild: (node: Node) => void }).appendChild(root);
        }
        profileFormApp = createApp(StorefrontProfileForm, {
          fields: profileForm.fields,
          initialValues: profileForm.values,
        });
        profileFormRef = profileFormApp.mount(root) as unknown as
          StorefrontProfileFormExpose;
      },
      willClose: () => {
        profileFormApp?.unmount();
        profileFormApp = null;
        profileFormRef = null;
      },
      preConfirm: () => {
        const values = profileFormRef?.getValues() || profileForm.values;
        latestProfileValues = { ...values };
        const email = String(values["email"] || "");
        if (email && !isValidEmail(email)) {
          showValidationMessage("請填寫正確的電子郵件格式");
          return false;
        }
        return true;
      },
    });

    if (!confirmed) return;

    const profileData = buildProfileUpdatePayload(
      fields,
      latestProfileValues,
    );

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

    emitStorefrontDynamicFieldValuesUpdated(
      buildInitialDynamicFieldValues(state.formFields, null),
    );
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
