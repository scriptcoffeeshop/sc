export function createSettingsController(deps) {
  let settingsLoadToken = 0;
  let deliverySortable = null;

  function destroyDeliverySortable() {
    if (!deliverySortable) return;
    deliverySortable.destroy();
    deliverySortable = null;
  }

  function migrateLegacyDeliveryConfig(settings) {
    const deliveryConfigStr = settings.delivery_options_config || "";
    let deliveryConfig = [];

    if (deliveryConfigStr) {
      try {
        deliveryConfig = JSON.parse(deliveryConfigStr);
      } catch (error) {
        console.error("Parsed delivery_options_config fails:", error);
      }
    }

    if (deliveryConfig.length) return deliveryConfig;

    const routingConfigStr = settings.payment_routing_config || "";
    let routingConfig = {};
    if (routingConfigStr) {
      try {
        routingConfig = JSON.parse(routingConfigStr);
      } catch {
      }
    } else {
      const linePayEnabled = String(settings.linepay_enabled) === "true";
      const transferEnabled = String(settings.transfer_enabled) === "true";
      routingConfig = {
        in_store: {
          cod: true,
          linepay: linePayEnabled,
          jkopay: linePayEnabled,
          transfer: transferEnabled,
        },
        delivery: {
          cod: true,
          linepay: linePayEnabled,
          jkopay: linePayEnabled,
          transfer: transferEnabled,
        },
        home_delivery: {
          cod: true,
          linepay: linePayEnabled,
          jkopay: linePayEnabled,
          transfer: transferEnabled,
        },
        seven_eleven: {
          cod: true,
          linepay: false,
          jkopay: false,
          transfer: false,
        },
        family_mart: {
          cod: true,
          linepay: false,
          jkopay: false,
          transfer: false,
        },
      };
    }

    return Object.values(deps.defaultDeliveryOptions).map((item) => ({
      ...item,
      payment: routingConfig[item.id] || {
        cod: true,
        linepay: false,
        jkopay: false,
        transfer: false,
      },
      fee: 0,
      free_threshold: 0,
    }));
  }

  function renderDeliveryOptionsAdmin(config) {
    const tbody = document.getElementById("delivery-routing-table");
    if (!tbody) return;
    tbody.innerHTML = "";

    config.forEach((item) => {
      configToHtml(deps.normalizeDeliveryOption(item), tbody);
    });

    destroyDeliverySortable();
    if (!deps.Sortable) return;
    deliverySortable = new deps.Sortable(tbody, {
      animation: 150,
      handle: ".cursor-move",
      ghostClass: "ui-bg-soft",
    });
  }

  function addDeliveryOptionAdmin() {
    const tempId = `custom_${Date.now()}`;
    const newConfig = deps.normalizeDeliveryOption({
      id: tempId,
      icon: "",
      icon_url: deps.getDefaultIconUrl("delivery"),
      name: "新物流方式",
      description: "設定敘述",
      enabled: true,
      fee: 0,
      free_threshold: 0,
      payment: { cod: true, linepay: false, jkopay: false, transfer: false },
    });

    const tbody = document.getElementById("delivery-routing-table");
    if (!tbody) return;
    configToHtml(newConfig, tbody, true);
  }

  function configToHtml(item, tbody, isNew = false) {
    const normalized = deps.normalizeDeliveryOption(item);
    const fallbackKey = deps.getDeliveryIconFallbackKey(normalized.id);
    const previewUrl = deps.resolveAssetUrl(normalized.icon_url) ||
      deps.getDefaultIconUrl(fallbackKey);

    const row = document.createElement("tr");
    row.className = `border-b delivery-option-row group${
      isNew ? " bg-yellow-50" : ""
    }`;
    row.style.borderColor = "#E2DCC8";
    row.dataset.id = normalized.id;
    row.dataset.defaultIconKey = fallbackKey;

    row.innerHTML = `
          <td class="p-3 text-center cursor-move ui-text-muted hover:ui-text-strong transition" data-label="排序">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
          </td>
          <td class="p-3" data-label="圖示與名稱 / 說明">
              <div class="flex flex-col gap-2 min-w-[280px]">
                  <div class="icon-upload-row">
                      <img class="icon-upload-preview do-icon-preview" src="${
      deps.esc(previewUrl)
    }" alt="配送圖示預覽">
                      <input type="hidden" class="do-icon-url" value="${
      deps.esc(normalized.icon_url)
    }">
                      <input type="file" class="do-icon-file text-xs icon-upload-file" accept="image/png,image/webp,image/jpeg,image/jpg">
                      <button type="button" data-action="upload-delivery-row-icon" class="text-xs px-2 py-1 rounded border ui-border ui-text-highlight hover:ui-primary-soft icon-upload-action">上傳圖示</button>
                  </div>
                  <p class="text-[11px] ui-text-muted truncate do-icon-url-display">${
      deps.esc(normalized.icon_url)
    }</p>
                  <div class="flex items-center gap-2">
                      <input type="text" class="border rounded p-1 icon-text-fallback text-sm do-icon" value="${
      deps.esc(normalized.icon)
    }" placeholder="備援字元">
                      <input type="text" class="border rounded p-1 flex-1 min-w-[120px] do-name" value="${
      deps.esc(normalized.name)
    }" placeholder="物流名稱">
                      <input type="hidden" class="do-id" value="${
      deps.esc(normalized.id)
    }">
                  </div>
                  <input type="text" class="border rounded p-1 w-full text-xs ui-text-strong do-desc" value="${
      deps.esc(normalized.description)
    }" placeholder="簡短說明 (例如: 到店自取)">
              </div>
          </td>
          <td class="p-3 text-center border-l ui-bg-soft/50" style="border-color:#E2DCC8" data-label="啟用">
              <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" class="sr-only peer do-enabled" ${
      normalized.enabled ? "checked" : ""
    }>
                  <div class="w-9 h-5 ui-bg-soft peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
              </label>
          </td>
          <td class="p-3 text-center border-l" style="border-color:#E2DCC8" data-label="運費">
              <input type="number" class="border rounded p-1 w-16 text-center text-sm do-fee" value="${
      normalized.fee !== undefined ? normalized.fee : 0
    }" min="0">
          </td>
          <td class="p-3 text-center border-l" style="border-color:#E2DCC8" data-label="免運門檻">
              <input type="number" class="border rounded p-1 w-20 text-center text-sm do-free-threshold" value="${
      normalized.free_threshold !== undefined ? normalized.free_threshold : 0
    }" min="0">
          </td>
          <td class="p-3 text-center border-l" style="border-color:#E2DCC8" data-label="貨到/取貨付款">
              <input type="checkbox" class="w-4 h-4 do-cod" ${
      normalized.payment?.cod ? "checked" : ""
    }>
          </td>
          <td class="p-3 text-center border-l" style="border-color:#E2DCC8" data-label="LINE Pay">
              <input type="checkbox" class="w-4 h-4 do-linepay" ${
      normalized.payment?.linepay ? "checked" : ""
    }>
          </td>
          <td class="p-3 text-center border-l" style="border-color:#E2DCC8" data-label="街口支付">
              <input type="checkbox" class="w-4 h-4 do-jkopay" ${
      normalized.payment?.jkopay ? "checked" : ""
    }>
          </td>
          <td class="p-3 text-center border-l" style="border-color:#E2DCC8" data-label="線上轉帳">
              <input type="checkbox" class="w-4 h-4 do-transfer" ${
      normalized.payment?.transfer ? "checked" : ""
    }>
          </td>
          <td class="p-3 text-center border-l" style="border-color:#E2DCC8" data-label="操作">
              <button type="button" data-action="remove-delivery-option-row" class="ui-text-danger hover:text-red-700 p-1" title="刪除此選項">
                  刪除
              </button>
          </td>
      `;
    tbody.appendChild(row);

    const previewEl = row.querySelector(".do-icon-preview");
    if (previewEl instanceof HTMLImageElement) {
      deps.setPreviewImageSource(
        previewEl,
        normalized.icon_url,
        deps.getDefaultIconUrl(fallbackKey),
      );
    }

    if (isNew) {
      setTimeout(() => row.classList.remove("bg-yellow-50"), 1500);
    }
  }

  function resetSectionTitle(section) {
    const defaults = {
      products: {
        title: "咖啡豆選購",
        color: "#268BD2",
        size: "text-lg",
        bold: true,
        iconUrl: deps.getDefaultIconUrl("products"),
      },
      delivery: {
        title: "配送方式",
        color: "#268BD2",
        size: "text-lg",
        bold: true,
        iconUrl: deps.getDefaultIconUrl("delivery"),
      },
      notes: {
        title: "訂單備註",
        color: "#268BD2",
        size: "text-base",
        bold: true,
        iconUrl: deps.getDefaultIconUrl("notes"),
      },
    };
    const settings = defaults[section];
    if (!settings) return;

    document.getElementById(`s-${section}-title`).value = settings.title;
    document.getElementById(`s-${section}-color`).value = settings.color;
    document.getElementById(`s-${section}-size`).value = settings.size;
    document.getElementById(`s-${section}-bold`).checked = settings.bold;

    const iconUrlInput = document.getElementById(`s-${section}-icon-url`);
    if (iconUrlInput) iconUrlInput.value = settings.iconUrl;

    deps.updateIconPreview({
      previewId: `s-${section}-icon-preview`,
      rawUrl: settings.iconUrl,
      fallbackUrl: settings.iconUrl,
    });

    const iconUrlDisplay = document.getElementById(
      `s-${section}-icon-url-display`,
    );
    if (iconUrlDisplay) iconUrlDisplay.textContent = settings.iconUrl;
  }

  async function loadSettings() {
    const currentLoadToken = ++settingsLoadToken;
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getSettings&_=${Date.now()}`,
      );
      const data = await response.json();
      if (currentLoadToken !== settingsLoadToken) return;
      if (!data.success) return;

      const settings = data.settings;
      deps.setDashboardSettings(settings);
      deps.applyDashboardBranding(settings);

      document.getElementById("s-ann-enabled").checked =
        String(settings.announcement_enabled) === "true";
      document.getElementById("s-announcement").value =
        settings.announcement || "";

      const autoOrderEmailCheckbox = document.getElementById(
        "s-auto-order-email-enabled",
      );
      if (autoOrderEmailCheckbox) {
        autoOrderEmailCheckbox.checked = deps.parseBooleanSetting(
          settings.order_confirmation_auto_email_enabled,
          true,
        );
      }

      const isOpen = String(settings.is_open) !== "false";
      document.querySelector(`input[name="s-open"][value="${isOpen}"]`)
        .checked = true;

      document.getElementById("s-site-title").value = settings.site_title || "";
      document.getElementById("s-site-subtitle").value =
        settings.site_subtitle || "";
      document.getElementById("s-site-emoji").value =
        settings.site_icon_emoji || "";
      document.getElementById("s-site-icon-url").value =
        settings.site_icon_url || "";

      const siteLogoFallbackUrl = deps.getDefaultIconUrl("brand");
      if (settings.site_icon_url) {
        deps.updateIconPreview({
          previewId: "s-icon-preview",
          rawUrl: settings.site_icon_url,
          fallbackUrl: siteLogoFallbackUrl,
        });
        document.getElementById("s-icon-url-display").textContent = "自訂 Logo";
      } else {
        deps.updateIconPreview({
          previewId: "s-icon-preview",
          rawUrl: siteLogoFallbackUrl,
          fallbackUrl: siteLogoFallbackUrl,
        });
        document.getElementById("s-icon-url-display").textContent =
          "未設定 (預設)";
      }

      document.getElementById("s-products-title").value =
        settings.products_section_title || "";
      document.getElementById("s-products-color").value =
        settings.products_section_color || "#268BD2";
      document.getElementById("s-products-size").value =
        settings.products_section_size || "text-lg";
      document.getElementById("s-products-bold").checked =
        String(settings.products_section_bold) !== "false";

      document.getElementById("s-delivery-title").value =
        settings.delivery_section_title || "";
      document.getElementById("s-delivery-color").value =
        settings.delivery_section_color || "#268BD2";
      document.getElementById("s-delivery-size").value =
        settings.delivery_section_size || "text-lg";
      document.getElementById("s-delivery-bold").checked =
        String(settings.delivery_section_bold) !== "false";

      document.getElementById("s-notes-title").value =
        settings.notes_section_title || "";
      document.getElementById("s-notes-color").value =
        settings.notes_section_color || "#268BD2";
      document.getElementById("s-notes-size").value =
        settings.notes_section_size || "text-base";
      document.getElementById("s-notes-bold").checked =
        String(settings.notes_section_bold) !== "false";

      ["products", "delivery", "notes"].forEach((section) => {
        const settingKey = deps.sectionIconSettingKey(section);
        const fallbackKey = section === "products"
          ? "products"
          : section === "delivery"
          ? "delivery"
          : "notes";
        const sectionIconUrl = String(
          settings[settingKey] || deps.getDefaultIconUrl(fallbackKey),
        );
        const urlInput = document.getElementById(`s-${section}-icon-url`);
        if (urlInput) urlInput.value = sectionIconUrl;
        deps.updateIconPreview({
          previewId: `s-${section}-icon-preview`,
          rawUrl: sectionIconUrl,
          fallbackUrl: deps.getDefaultIconUrl(fallbackKey),
        });
        const urlDisplay = document.getElementById(
          `s-${section}-icon-url-display`,
        );
        if (urlDisplay) urlDisplay.textContent = sectionIconUrl;
      });

      const deliveryConfig = migrateLegacyDeliveryConfig(settings);
      const normalizedDeliveryConfig = deliveryConfig.map((item) =>
        deps.normalizeDeliveryOption(item)
      );
      renderDeliveryOptionsAdmin(normalizedDeliveryConfig);

      const linePaySandboxCheckbox = document.getElementById(
        "s-linepay-sandbox",
      );
      if (linePaySandboxCheckbox) {
        const hasServerValue = Object.prototype.hasOwnProperty.call(
          settings,
          "linepay_sandbox",
        );
        if (hasServerValue) {
          const sandboxEnabled = deps.parseBooleanSetting(
            settings.linepay_sandbox,
            true,
          );
          linePaySandboxCheckbox.checked = sandboxEnabled;
          globalThis.localStorage?.setItem(
            deps.linePaySandboxCacheKey,
            String(sandboxEnabled),
          );
        } else {
          const cachedSandbox = globalThis.localStorage?.getItem(
            deps.linePaySandboxCacheKey,
          );
          linePaySandboxCheckbox.checked = cachedSandbox === null
            ? true
            : deps.parseBooleanSetting(cachedSandbox, true);
        }
      }

      const paymentOptionsStr = settings.payment_options_config || "";
      let paymentOptions = {};
      if (paymentOptionsStr) {
        try {
          paymentOptions = JSON.parse(paymentOptionsStr);
        } catch {
        }
      }

      ["cod", "linepay", "jkopay", "transfer"].forEach((method) => {
        const normalized = deps.normalizePaymentOption(
          method,
          paymentOptions[method],
        );
        const iconInput = document.getElementById(`po-${method}-icon`);
        const nameInput = document.getElementById(`po-${method}-name`);
        const descInput = document.getElementById(`po-${method}-desc`);
        const iconUrlInput = document.getElementById(`po-${method}-icon-url`);
        if (iconInput) iconInput.value = normalized.icon;
        if (nameInput) nameInput.value = normalized.name;
        if (descInput) descInput.value = normalized.description;
        if (iconUrlInput) iconUrlInput.value = normalized.icon_url;
        deps.updateIconPreview({
          previewId: `po-${method}-icon-preview`,
          rawUrl: normalized.icon_url,
          fallbackUrl: deps.getDefaultIconUrl(
            deps.getPaymentIconFallbackKey(method),
          ),
        });
        deps.updateDeliveryRoutingPaymentHeaderIcon(method, normalized.icon_url);
        const urlDisplay = document.getElementById(
          `po-${method}-icon-url-display`,
        );
        if (urlDisplay) urlDisplay.textContent = normalized.icon_url;
      });

      if (currentLoadToken !== settingsLoadToken) return;
      await deps.loadBankAccountsAdmin();
    } catch (error) {
      console.error(error);
    }
  }

  async function saveSettings() {
    try {
      const linePaySandboxChecked =
        document.getElementById("s-linepay-sandbox").checked;
      const autoOrderEmailEnabled =
        document.getElementById("s-auto-order-email-enabled")?.checked ?? true;
      const payload = {
        userId: deps.getAuthUserId(),
        settings: {
          announcement_enabled: String(
            document.getElementById("s-ann-enabled").checked,
          ),
          announcement: document.getElementById("s-announcement").value,
          order_confirmation_auto_email_enabled: String(autoOrderEmailEnabled),
          is_open:
            document.querySelector('input[name="s-open"]:checked')?.value ||
            "true",
          site_title: document.getElementById("s-site-title").value.trim(),
          site_subtitle: document.getElementById("s-site-subtitle").value
            .trim(),
          site_icon_emoji: document.getElementById("s-site-emoji").value.trim(),
          site_icon_url: deps.normalizeIconPath(
            document.getElementById("s-site-icon-url").value.trim(),
          ),

          products_section_title:
            document.getElementById("s-products-title").value.trim(),
          products_section_color:
            document.getElementById("s-products-color").value,
          products_section_size:
            document.getElementById("s-products-size").value,
          products_section_bold: String(
            document.getElementById("s-products-bold").checked,
          ),
          products_section_icon_url: deps.normalizeIconPath(
            deps.readInputValue("s-products-icon-url"),
          ),

          delivery_section_title:
            document.getElementById("s-delivery-title").value.trim(),
          delivery_section_color:
            document.getElementById("s-delivery-color").value,
          delivery_section_size:
            document.getElementById("s-delivery-size").value,
          delivery_section_bold: String(
            document.getElementById("s-delivery-bold").checked,
          ),
          delivery_section_icon_url: deps.normalizeIconPath(
            deps.readInputValue("s-delivery-icon-url"),
          ),

          notes_section_title:
            document.getElementById("s-notes-title").value.trim(),
          notes_section_color: document.getElementById("s-notes-color").value,
          notes_section_size: document.getElementById("s-notes-size").value,
          notes_section_bold: String(
            document.getElementById("s-notes-bold").checked,
          ),
          notes_section_icon_url: deps.normalizeIconPath(
            deps.readInputValue("s-notes-icon-url"),
          ),

          linepay_sandbox: String(linePaySandboxChecked),
        },
      };

      const deliveryConfig = [];
      document.querySelectorAll(".delivery-option-row").forEach((row) => {
        const id = row.querySelector(".do-id").value;
        const icon = row.querySelector(".do-icon").value.trim();
        const iconUrl = deps.normalizeIconPath(
          row.querySelector(".do-icon-url")?.value.trim() || "",
        );
        const name = row.querySelector(".do-name").value.trim();
        const description = row.querySelector(".do-desc").value.trim();
        const enabled = row.querySelector(".do-enabled").checked;
        const fee = Number.parseInt(row.querySelector(".do-fee").value, 10) || 0;
        const freeThreshold = Number.parseInt(
          row.querySelector(".do-free-threshold").value,
          10,
        ) || 0;
        const cod = row.querySelector(".do-cod").checked;
        const linepay = row.querySelector(".do-linepay").checked;
        const jkopay = row.querySelector(".do-jkopay").checked;
        const transfer = row.querySelector(".do-transfer").checked;

        if (name) {
          deliveryConfig.push({
            id,
            icon,
            icon_url: iconUrl,
            name,
            description,
            enabled,
            fee,
            free_threshold: freeThreshold,
            payment: { cod, linepay, jkopay, transfer },
          });
        }
      });

      payload.settings.delivery_options_config = JSON.stringify(deliveryConfig);
      payload.settings.payment_options_config = JSON.stringify({
        cod: {
          icon: document.getElementById("po-cod-icon").value.trim(),
          icon_url: deps.normalizeIconPath(deps.readInputValue("po-cod-icon-url")),
          name: document.getElementById("po-cod-name").value.trim(),
          description: document.getElementById("po-cod-desc").value.trim(),
        },
        linepay: {
          icon: document.getElementById("po-linepay-icon").value.trim(),
          icon_url: deps.normalizeIconPath(
            deps.readInputValue("po-linepay-icon-url"),
          ),
          name: document.getElementById("po-linepay-name").value.trim(),
          description: document.getElementById("po-linepay-desc").value.trim(),
        },
        jkopay: {
          icon: document.getElementById("po-jkopay-icon").value.trim(),
          icon_url: deps.normalizeIconPath(
            deps.readInputValue("po-jkopay-icon-url"),
          ),
          name: document.getElementById("po-jkopay-name").value.trim(),
          description: document.getElementById("po-jkopay-desc").value.trim(),
        },
        transfer: {
          icon: document.getElementById("po-transfer-icon").value.trim(),
          icon_url: deps.normalizeIconPath(
            deps.readInputValue("po-transfer-icon-url"),
          ),
          name: document.getElementById("po-transfer-name").value.trim(),
          description: document.getElementById("po-transfer-desc").value.trim(),
        },
      });

      const response = await deps.authFetch(`${deps.API_URL}?action=updateSettings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      globalThis.localStorage?.setItem(
        deps.linePaySandboxCacheKey,
        String(linePaySandboxChecked),
      );
      deps.Toast.fire({ icon: "success", title: "設定已儲存" });
      await loadSettings();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    loadSettings,
    addDeliveryOptionAdmin,
    resetSectionTitle,
    saveSettings,
  };
}
