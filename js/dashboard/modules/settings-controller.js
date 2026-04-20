export function createSettingsController(deps) {
  let settingsLoadToken = 0;

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
      const siteIconUrlInput = document.getElementById("s-site-icon-url");
      if (siteIconUrlInput instanceof HTMLInputElement) {
        siteIconUrlInput.value = settings.site_icon_url || "";
      }

      const siteLogoFallbackUrl = deps.getDefaultIconUrl("brand");
      if (settings.site_icon_url) {
        deps.updateIconPreview({
          previewId: "s-icon-preview",
          rawUrl: settings.site_icon_url,
          fallbackUrl: siteLogoFallbackUrl,
        });
        const iconUrlDisplay = document.getElementById("s-icon-url-display");
        if (iconUrlDisplay) iconUrlDisplay.textContent = "自訂 Logo";
      } else {
        deps.updateIconPreview({
          previewId: "s-icon-preview",
          rawUrl: siteLogoFallbackUrl,
          fallbackUrl: siteLogoFallbackUrl,
        });
        const iconUrlDisplay = document.getElementById("s-icon-url-display");
        if (iconUrlDisplay) {
          iconUrlDisplay.textContent = "未設定 (預設)";
        }
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

      deps.replaceSettingsConfig(settings);

      if (currentLoadToken !== settingsLoadToken) return;
      await deps.loadBankAccountsAdmin();
    } catch (error) {
      console.error(error);
    }
  }

  async function saveSettings() {
    try {
      const settingsConfig = deps.buildSettingsConfig();
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
            deps.readInputValue("s-site-icon-url"),
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

          linepay_sandbox: String(settingsConfig.linePaySandboxChecked),
          delivery_options_config: settingsConfig.deliveryOptionsConfig,
          payment_options_config: settingsConfig.paymentOptionsConfig,
        },
      };

      const response = await deps.authFetch(`${deps.API_URL}?action=updateSettings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      globalThis.localStorage?.setItem(
        deps.linePaySandboxCacheKey,
        String(settingsConfig.linePaySandboxChecked),
      );
      deps.Toast.fire({ icon: "success", title: "設定已儲存" });
      await loadSettings();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    loadSettings,
    resetSectionTitle,
    saveSettings,
  };
}
