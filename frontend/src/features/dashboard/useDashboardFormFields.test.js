import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload) {
  return { json: async () => payload };
}

async function loadFormFieldsModule() {
  vi.resetModules();
  return await import("./useDashboardFormFields.js");
}

describe("useDashboardFormFields", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("loads form fields and derives dashboard-friendly view models", async () => {
    const module = await loadFormFieldsModule();
    const authFetch = vi.fn(async () =>
      jsonResponse({
        success: true,
        fields: [
          {
            id: 1,
            field_key: "receipt_type",
            label: "收據類型",
            field_type: "select",
            placeholder: "請選擇",
            required: true,
            enabled: false,
            delivery_visibility: JSON.stringify({
              delivery: false,
              seven_eleven: true,
            }),
          },
          {
            id: 2,
            field_key: "note",
            label: "備註",
            field_type: "textarea",
            placeholder: "補充說明",
            required: false,
            enabled: true,
          },
        ],
      })
    );

    module.configureDashboardFormFieldsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      getDashboardSettings: () => ({ delivery_options_config: "[]" }),
      Sortable: null,
      Swal: { fire: vi.fn() },
      Toast: { fire: vi.fn() },
    });

    await module.dashboardFormFieldsActions.loadFormFields();
    const dashboard = module.useDashboardFormFields();

    expect(dashboard.formFieldsView.value).toEqual([
      {
        id: 1,
        label: "收據類型",
        fieldTypeLabel: "下拉選單",
        required: true,
        enabled: false,
        fieldKey: "receipt_type",
        placeholder: "請選擇",
        hiddenDeliveryMethodsText: "在 delivery 時隱藏",
        toggleEnabledValue: "true",
        toggleEnabledTitle: "啟用",
        toggleEnabledIcon: "關",
      },
      {
        id: 2,
        label: "備註",
        fieldTypeLabel: "多行文字",
        required: false,
        enabled: true,
        fieldKey: "note",
        placeholder: "補充說明",
        hiddenDeliveryMethodsText: "",
        toggleEnabledValue: "false",
        toggleEnabledTitle: "停用",
        toggleEnabledIcon: "開",
      },
    ]);
  });

  it("edits fields and toggles enabled state through update endpoints", async () => {
    const module = await loadFormFieldsModule();
    const updatePayloads = [];
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getFormFieldsAdmin")) {
        return jsonResponse({
          success: true,
          fields: [{
            id: 1,
            field_key: "receipt_type",
            label: "收據",
            field_type: "select",
            placeholder: "",
            required: false,
            enabled: true,
            options: JSON.stringify(["二聯式"]),
            delivery_visibility: null,
          }],
        });
      }
      if (String(url).includes("updateFormField")) {
        updatePayloads.push(JSON.parse(String(options.body || "{}")));
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const Swal = {
      fire: vi.fn(async (options) => {
        if (options?.title === "編輯欄位") {
          return {
            value: {
              label: "收據類型",
              fieldType: "select",
              placeholder: "請選擇",
              options: JSON.stringify(["二聯式", "三聯式"]),
              required: true,
              deliveryVisibility: JSON.stringify({ delivery: false }),
            },
          };
        }
        return {};
      }),
    };
    const Toast = { fire: vi.fn() };

    module.configureDashboardFormFieldsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      getDashboardSettings: () => ({ delivery_options_config: "[]" }),
      Sortable: null,
      Swal,
      Toast,
    });

    await module.dashboardFormFieldsActions.loadFormFields();
    await module.dashboardFormFieldsActions.editFormField(1);
    await module.dashboardFormFieldsActions.toggleFieldEnabled(1, false);

    expect(updatePayloads[0]).toMatchObject({
      userId: "admin-user",
      id: 1,
      label: "收據類型",
      fieldType: "select",
      placeholder: "請選擇",
      options: JSON.stringify(["二聯式", "三聯式"]),
      required: true,
      deliveryVisibility: JSON.stringify({ delivery: false }),
    });
    expect(updatePayloads[1]).toMatchObject({
      userId: "admin-user",
      id: 1,
      enabled: false,
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "已更新",
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "已停用",
    });
  });

  it("normalizes all-visible delivery visibility when adding new fields", async () => {
    const module = await loadFormFieldsModule();
    let addPayload = null;
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getFormFieldsAdmin")) {
        return jsonResponse({ success: true, fields: [] });
      }
      if (String(url).includes("addFormField")) {
        addPayload = JSON.parse(String(options.body || "{}"));
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const Swal = {
      fire: vi.fn(async (options) => {
        if (options?.title === "新增欄位") {
          document.body.innerHTML = `
            <input id="swal-fk" value="receipt_title">
            <input id="swal-fl" value="收據抬頭">
            <select id="swal-ft">
              <option value="text" selected>文字</option>
            </select>
            <input id="swal-fp" value="請輸入收據抬頭">
            <input id="swal-fo" value="">
            <input id="swal-fr" type="checkbox" checked>
            <div id="swal-dv"></div>
          `;
          options.didOpen?.();
          return { value: options.preConfirm() };
        }
        return {};
      }),
      showValidationMessage: vi.fn(),
      showLoading: vi.fn(),
    };
    const Toast = { fire: vi.fn() };

    module.configureDashboardFormFieldsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      getDashboardSettings: () => ({
        delivery_options_config: JSON.stringify([
          { id: "delivery", label: "宅配" },
          { id: "seven_eleven", label: "7-11" },
        ]),
      }),
      Sortable: null,
      Swal,
      Toast,
    });

    await module.dashboardFormFieldsActions.showAddFieldModal();

    expect(addPayload).toMatchObject({
      userId: "admin-user",
      fieldKey: "receipt_title",
      label: "收據抬頭",
      fieldType: "text",
      placeholder: "請輸入收據抬頭",
      required: true,
      deliveryVisibility: null,
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "欄位已新增",
    });
  });

  it("persists sortable field order from the rendered DOM", async () => {
    const module = await loadFormFieldsModule();
    let sortableOptions = null;
    let reorderPayload = null;
    const sortableInstance = { destroy: vi.fn() };
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getFormFieldsAdmin")) {
        return jsonResponse({
          success: true,
          fields: [
            {
              id: 1,
              field_key: "receipt_type",
              label: "收據類型",
              field_type: "select",
              placeholder: "",
              required: false,
              enabled: true,
            },
            {
              id: 2,
              field_key: "note",
              label: "備註",
              field_type: "textarea",
              placeholder: "",
              required: false,
              enabled: true,
            },
          ],
        });
      }
      if (String(url).includes("reorderFormFields")) {
        reorderPayload = JSON.parse(String(options.body || "{}"));
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const Toast = { fire: vi.fn() };
    const Sortable = {
      create: vi.fn((element, options) => {
        sortableOptions = options;
        return sortableInstance;
      }),
    };

    module.configureDashboardFormFieldsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      getDashboardSettings: () => ({ delivery_options_config: "[]" }),
      Sortable,
      Swal: { fire: vi.fn() },
      Toast,
    });

    await module.dashboardFormFieldsActions.loadFormFields();
    const listElement = document.createElement("div");
    listElement.innerHTML = `
      <div class="drag-handle" data-field-id="2"></div>
      <div class="drag-handle" data-field-id="1"></div>
    `;

    module.dashboardFormFieldsActions.registerFormFieldsListElement(listElement);
    await Promise.resolve();
    await Promise.resolve();
    await sortableOptions.onEnd();

    expect(Sortable.create).toHaveBeenCalledWith(
      listElement,
      expect.objectContaining({
        handle: ".drag-handle",
        animation: 150,
      }),
    );
    expect(reorderPayload).toMatchObject({
      userId: "admin-user",
      ids: [2, 1],
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "排序已更新",
    });

    module.dashboardFormFieldsActions.registerFormFieldsListElement(null);
    expect(sortableInstance.destroy).toHaveBeenCalled();
  });
});
