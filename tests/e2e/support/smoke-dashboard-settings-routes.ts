import { fulfillJson } from "./smoke-shared.ts";
import {
  asNumber,
  asString,
  getRequestBody,
  type DashboardRouteContext,
} from "./smoke-dashboard-state.ts";

function buildDashboardSettingsPayload() {
  return {
    site_title: "Script Coffee",
    site_subtitle: "咖啡豆｜耳掛",
    site_icon_emoji: "☕",
    site_icon_url: "",
    announcement_enabled: "false",
    announcement: "",
    order_confirmation_auto_email_enabled: "true",
    is_open: "true",
    products_section_title: "咖啡豆選購",
    products_section_color: "#268BD2",
    products_section_size: "text-lg",
    products_section_bold: "true",
    delivery_section_title: "配送方式",
    delivery_section_color: "#268BD2",
    delivery_section_size: "text-lg",
    delivery_section_bold: "true",
    notes_section_title: "訂單備註",
    notes_section_color: "#268BD2",
    notes_section_size: "text-base",
    notes_section_bold: "true",
    linepay_sandbox: "true",
    delivery_options_config: JSON.stringify([
      {
        id: "delivery",
        icon: "",
        icon_url: "/icons/delivery_method.png",
        name: "配送到府",
        description: "新竹配送",
        enabled: true,
        fee: 60,
        free_threshold: 999,
        payment: {
          cod: true,
          linepay: true,
          jkopay: true,
          transfer: true,
        },
      },
    ]),
    payment_options_config: JSON.stringify({
      cod: {
        icon: "",
        icon_url: "",
        name: "貨到/取貨付款",
        description: "到付",
      },
      linepay: {
        icon: "",
        icon_url: "",
        name: "LINE Pay",
        description: "線上安全付款",
      },
      jkopay: {
        icon: "",
        icon_url: "",
        name: "街口支付",
        description: "街口支付線上付款",
      },
      transfer: {
        icon: "",
        icon_url: "",
        name: "線上轉帳",
        description: "ATM / 網銀匯款",
      },
    }),
  };
}

export async function handleDashboardSettingsRoutes(
  ctx: DashboardRouteContext,
): Promise<boolean> {
  const { action, options, request, route, state } = ctx;

  if (action === "getSettings") {
    await fulfillJson(route, {
      success: true,
      settings: buildDashboardSettingsPayload(),
    });
    return true;
  }

  if (action === "getBankAccounts") {
    await fulfillJson(route, {
      success: true,
      accounts: state.bankAccounts,
    });
    return true;
  }

  if (action === "getFormFieldsAdmin") {
    await fulfillJson(route, {
      success: true,
      fields: state.formFields,
    });
    return true;
  }

  if (action === "updateSettings") {
    options.onUpdateSettings?.(request);
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "addFormField") {
    const body = getRequestBody(request);
    state.formFields.push({
      id: Date.now(),
      field_key: asString(body.fieldKey),
      label: asString(body.label),
      field_type: asString(body.fieldType, "text"),
      placeholder: asString(body.placeholder),
      options: asString(body.options),
      required: Boolean(body.required),
      enabled: true,
      delivery_visibility: body.deliveryVisibility
        ? asString(body.deliveryVisibility)
        : null,
    });
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "updateFormField") {
    const body = getRequestBody(request);
    state.formFields = state.formFields.map((field) =>
      Number(field.id) === asNumber(body.id)
        ? {
          ...field,
          label: body.label !== undefined ? asString(body.label) : field.label,
          field_type: body.fieldType !== undefined
            ? asString(body.fieldType)
            : field.field_type,
          placeholder: body.placeholder !== undefined
            ? asString(body.placeholder)
            : field.placeholder,
          options: body.options !== undefined
            ? asString(body.options)
            : field.options,
          required: body.required !== undefined
            ? Boolean(body.required)
            : field.required,
          enabled: body.enabled !== undefined
            ? Boolean(body.enabled)
            : field.enabled,
          delivery_visibility: body.deliveryVisibility !== undefined
            ? body.deliveryVisibility
              ? asString(body.deliveryVisibility)
              : null
            : field.delivery_visibility,
        }
        : field
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "deleteFormField") {
    const body = getRequestBody(request);
    state.formFields = state.formFields.filter((field) =>
      Number(field.id) !== asNumber(body.id)
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "uploadAsset") {
    options.onUploadAsset?.(request);
    await fulfillJson(route, {
      success: true,
      url: options.uploadAssetUrl || "icons/uploaded-brand.png",
    });
    return true;
  }

  if (action === "addBankAccount") {
    const body = getRequestBody(request);
    state.bankAccounts.push({
      id: Date.now(),
      bankCode: asString(body.bankCode),
      bankName: asString(body.bankName),
      accountNumber: asString(body.accountNumber),
      accountName: asString(body.accountName),
    });
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "deleteBankAccount") {
    const body = getRequestBody(request);
    state.bankAccounts = state.bankAccounts.filter((account) =>
      Number(account.id) !== asNumber(body.id)
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "updateBankAccount") {
    const body = getRequestBody(request);
    state.bankAccounts = state.bankAccounts.map((account) =>
      Number(account.id) === asNumber(body.id)
        ? {
          ...account,
          bankCode: asString(body.bankCode || account.bankCode),
          bankName: asString(body.bankName || account.bankName),
          accountNumber: asString(body.accountNumber || account.accountNumber),
          accountName: asString(body.accountName || account.accountName || ""),
        }
        : account
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "reorderBankAccounts") {
    const body = getRequestBody(request);
    const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
    const orderMap = new Map(
      ids.map((id, index) => [id, index]),
    );
    state.bankAccounts = [...state.bankAccounts].sort((left, right) =>
      (orderMap.get(Number(left.id)) ?? Number.MAX_SAFE_INTEGER) -
      (orderMap.get(Number(right.id)) ?? Number.MAX_SAFE_INTEGER)
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  return false;
}
