const ICON_PREVIEW_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="7" y="7" width="50" height="50" rx="12" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="3"/><path d="M20 41l9-10 7 7 8-10 7 13H20z" fill="#94A3B8"/><circle cx="25" cy="24" r="4" fill="#94A3B8"/></svg>',
)}`;

const ICON_LIBRARY_TARGET_MAP = {
  products: {
    label: "商品區塊 Icon",
    inputId: "s-products-icon-url",
    displayId: "s-products-icon-url-display",
    previewId: "s-products-icon-preview",
    fallbackKey: "products",
  },
  delivery: {
    label: "配送區塊 Icon",
    inputId: "s-delivery-icon-url",
    displayId: "s-delivery-icon-url-display",
    previewId: "s-delivery-icon-preview",
    fallbackKey: "delivery",
  },
  notes: {
    label: "備註區塊 Icon",
    inputId: "s-notes-icon-url",
    displayId: "s-notes-icon-url-display",
    previewId: "s-notes-icon-preview",
    fallbackKey: "notes",
  },
  cod: {
    label: "貨到/取貨付款 Icon",
    inputId: "po-cod-icon-url",
    displayId: "po-cod-icon-url-display",
    previewId: "po-cod-icon-preview",
    fallbackKey: "cod",
  },
  linepay: {
    label: "LINE Pay Icon",
    inputId: "po-linepay-icon-url",
    displayId: "po-linepay-icon-url-display",
    previewId: "po-linepay-icon-preview",
    fallbackKey: "linepay",
  },
  jkopay: {
    label: "街口支付 Icon",
    inputId: "po-jkopay-icon-url",
    displayId: "po-jkopay-icon-url-display",
    previewId: "po-jkopay-icon-preview",
    fallbackKey: "jkopay",
  },
  transfer: {
    label: "線上轉帳 Icon",
    inputId: "po-transfer-icon-url",
    displayId: "po-transfer-icon-url-display",
    previewId: "po-transfer-icon-preview",
    fallbackKey: "transfer",
  },
};

export function createIconAssetsController(deps) {
  function getRowFallbackIconUrl(row) {
    const key = row?.dataset?.defaultIconKey || "delivery";
    return deps.getDefaultIconUrl(key);
  }

  function pushPreviewCandidate(candidates, seen, value) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  }

  function buildPreviewSrcCandidates(rawUrl, fallbackUrl = "") {
    const candidates = [];
    const seen = new Set();
    const rawValues = [rawUrl, fallbackUrl];

    rawValues.forEach((value) => {
      const normalizedValue = deps.normalizeIconPath(value || "");
      const resolved = deps.resolveAssetUrl(normalizedValue);
      if (!resolved) return;

      pushPreviewCandidate(candidates, seen, resolved);

      if (
        typeof window !== "undefined" &&
        /^\/(?:sc\/)?icons\//.test(resolved)
      ) {
        pushPreviewCandidate(
          candidates,
          seen,
          `${window.location.origin}${resolved}`,
        );
      }

      if (/^(?:https?:|data:|blob:|\/\/)/i.test(resolved)) {
        if (/^(?:data:|blob:|\/\/)/i.test(resolved)) return;
        try {
          const parsed = new URL(resolved);
          const normalizedPath = parsed.pathname || "";
          if (normalizedPath.startsWith("/sc/icons/")) {
            const rootPath =
              `/icons/${normalizedPath.slice("/sc/icons/".length)}`;
            pushPreviewCandidate(candidates, seen, rootPath);
            pushPreviewCandidate(
              candidates,
              seen,
              `${parsed.origin}${rootPath}`,
            );
          } else if (normalizedPath.startsWith("/icons/")) {
            const scPath = `/sc${normalizedPath}`;
            pushPreviewCandidate(candidates, seen, scPath);
            pushPreviewCandidate(
              candidates,
              seen,
              `${parsed.origin}${scPath}`,
            );
          }
        } catch {
        }
        return;
      }

      if (resolved.startsWith("/sc/")) {
        const rootPath = resolved.replace(/^\/sc\//, "/");
        pushPreviewCandidate(candidates, seen, rootPath);
        if (typeof window !== "undefined") {
          pushPreviewCandidate(
            candidates,
            seen,
            `${window.location.origin}${rootPath}`,
          );
        }
        return;
      }

      if (resolved.startsWith("/icons/")) {
        const scPath = `/sc${resolved}`;
        pushPreviewCandidate(candidates, seen, scPath);
        if (typeof window !== "undefined") {
          pushPreviewCandidate(
            candidates,
            seen,
            `${window.location.origin}${scPath}`,
          );
        }
      }
    });

    return candidates;
  }

  function setPreviewImageSource(preview, rawUrl, fallbackUrl = "") {
    if (!(preview instanceof HTMLImageElement)) return "";
    const candidates = buildPreviewSrcCandidates(rawUrl, fallbackUrl);
    const applyPlaceholder = () => {
      preview.onerror = null;
      preview.src = ICON_PREVIEW_PLACEHOLDER;
      preview.classList.add("is-placeholder");
      preview.classList.remove("hidden");
    };

    if (!candidates.length) {
      applyPlaceholder();
      return "";
    }

    let candidateIndex = 0;
    const applyCandidate = () => {
      preview.classList.remove("is-placeholder");
      preview.src = candidates[candidateIndex];
      preview.classList.remove("hidden");
    };

    preview.onerror = () => {
      candidateIndex += 1;
      if (candidateIndex < candidates.length) {
        applyCandidate();
        return;
      }
      applyPlaceholder();
    };

    applyCandidate();
    return candidates[0];
  }

  function updateIconPreview({ previewId, rawUrl, fallbackUrl = "" }) {
    const preview = document.getElementById(previewId);
    if (!(preview instanceof HTMLImageElement)) return "";
    return setPreviewImageSource(preview, rawUrl, fallbackUrl);
  }

  function validateIconFile(file) {
    if (!file) {
      deps.Swal.fire("提示", "請先選擇圖片檔案", "info");
      return false;
    }
    if (!String(file.type || "").startsWith("image/")) {
      deps.Swal.fire("錯誤", "請選擇圖片檔案 (PNG/JPG/WebP)", "error");
      return false;
    }
    return true;
  }

  async function fileToBase64(file) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result || "");
        resolve(value.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function updateDeliveryRoutingPaymentHeaderIcon(method, rawUrl = "") {
    return updateIconPreview({
      previewId: `dr-${method}-icon-preview`,
      rawUrl,
      fallbackUrl: deps.getDefaultIconUrl(
        deps.getPaymentIconFallbackKey(method),
      ),
    });
  }

  function setIconUrlToField({
    inputId,
    displayId,
    previewId,
    url,
    fallbackKey = "",
  }) {
    const normalizedUrl = deps.normalizeIconPath(url);
    const finalUrl = normalizedUrl || String(url || "").trim();
    const input = document.getElementById(inputId);
    if (input) input.value = finalUrl;
    const display = document.getElementById(displayId);
    if (display) {
      const resolvedDisplayUrl = deps.resolveAssetUrl(finalUrl) || finalUrl;
      display.textContent = resolvedDisplayUrl;
    }
    if (previewId) {
      updateIconPreview({
        previewId,
        rawUrl: finalUrl,
        fallbackUrl: deps.getDefaultIconUrl(fallbackKey),
      });
    }

    const paymentInputMatch = /^po-(cod|linepay|jkopay|transfer)-icon-url$/.exec(
      String(inputId || ""),
    );
    if (paymentInputMatch) {
      updateDeliveryRoutingPaymentHeaderIcon(paymentInputMatch[1], finalUrl);
    }
  }

  function applyIconFromLibrary(button) {
    const targetSelect = document.getElementById("icon-library-target");
    const targetKey = String(targetSelect?.value || "site").trim();
    const target = ICON_LIBRARY_TARGET_MAP[targetKey];
    if (!target) {
      deps.Swal.fire("錯誤", "請先選擇有效的套用目標", "error");
      return;
    }

    const iconKey = String(button?.dataset?.iconKey || "").trim();
    const rawUrl = String(button?.dataset?.iconUrl || "").trim();
    const iconUrl = rawUrl || deps.getDefaultIconUrl(iconKey);
    if (!iconUrl) {
      deps.Swal.fire("錯誤", "找不到要套用的 icon 路徑", "error");
      return;
    }

    setIconUrlToField({
      inputId: target.inputId,
      displayId: target.displayId,
      previewId: target.previewId,
      url: iconUrl,
      fallbackKey: target.fallbackKey,
    });
    deps.Toast.fire({
      icon: "success",
      title: `已套用到${target.label}`,
    });
  }

  async function uploadAssetFile(file, settingKey = "") {
    const base64 = await fileToBase64(file);
    const response = await deps.authFetch(`${deps.API_URL}?action=uploadAsset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: deps.getAuthUserId(),
        fileData: base64,
        fileName: file.name,
        contentType: file.type,
        settingKey,
      }),
    });
    return await response.json();
  }

  function previewIcon(input) {
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = String(event?.target?.result || "");
      if (!dataUrl) return;

      if (input.classList.contains("do-icon-file")) {
        const row = input.closest(".delivery-option-row");
        const preview = row?.querySelector(".do-icon-preview");
        if (preview instanceof HTMLImageElement) {
          setPreviewImageSource(preview, dataUrl, getRowFallbackIconUrl(row));
        }
        return;
      }

      const previewId = input.dataset.previewTarget;
      if (previewId) {
        updateIconPreview({
          previewId,
          rawUrl: dataUrl,
          fallbackUrl: deps.getDefaultIconUrl(input.dataset.fallbackKey || ""),
        });
      }
    };
    reader.readAsDataURL(file);
  }

  async function uploadSiteIcon() {
    const fileInput = document.getElementById("s-site-icon-upload");
    const file = fileInput?.files?.[0];
    if (!validateIconFile(file)) return;

    deps.Swal.fire({
      title: "上傳中...",
      allowOutsideClick: false,
      didOpen: () => deps.Swal.showLoading(),
    });

    try {
      const data = await uploadAssetFile(file, "site_icon_url");
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      document.getElementById("s-site-icon-url").value = data.url;
      updateIconPreview({
        previewId: "s-icon-preview",
        rawUrl: data.url,
        fallbackUrl: deps.getDefaultIconUrl("brand"),
      });
      document.getElementById("s-icon-url-display").textContent =
        "自訂 Logo (儲存後生效)";
      deps.Toast.fire({
        icon: "success",
        title: "品牌 Logo 已上傳！請記得點擊儲存設定。",
      });
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    } finally {
      if (fileInput) fileInput.value = "";
    }
  }

  async function resetSiteIcon() {
    document.getElementById("s-site-icon-url").value = "";
    updateIconPreview({
      previewId: "s-icon-preview",
      rawUrl: deps.getDefaultIconUrl("brand"),
      fallbackUrl: deps.getDefaultIconUrl("brand"),
    });
    document.getElementById("s-icon-url-display").textContent = "未設定 (預設)";
    deps.Toast.fire({
      icon: "success",
      title: "已恢復預設 Logo！請記得點擊儲存設定。",
    });
  }

  async function uploadSectionIcon(button) {
    const section = button?.dataset?.section;
    if (!section) return;

    const fileInput = document.getElementById(`s-${section}-icon-file`);
    const file = fileInput?.files?.[0];
    if (!validateIconFile(file)) return;

    deps.Swal.fire({
      title: "上傳中...",
      allowOutsideClick: false,
      didOpen: () => deps.Swal.showLoading(),
    });

    try {
      const settingKey = deps.sectionIconSettingKey(section);
      const data = await uploadAssetFile(file, settingKey);
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      const fallbackKey = section === "products"
        ? "products"
        : section === "delivery"
        ? "delivery"
        : "notes";
      setIconUrlToField({
        inputId: `s-${section}-icon-url`,
        displayId: `s-${section}-icon-url-display`,
        previewId: `s-${section}-icon-preview`,
        url: data.url,
        fallbackKey,
      });
      deps.Toast.fire({ icon: "success", title: "區塊圖示已更新" });
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function uploadPaymentIcon(button) {
    const method = button?.dataset?.method;
    if (!method) return;

    const fileInput = document.getElementById(`po-${method}-icon-file`);
    const file = fileInput?.files?.[0];
    if (!validateIconFile(file)) return;

    deps.Swal.fire({
      title: "上傳中...",
      allowOutsideClick: false,
      didOpen: () => deps.Swal.showLoading(),
    });

    try {
      const data = await uploadAssetFile(file, "");
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      setIconUrlToField({
        inputId: `po-${method}-icon-url`,
        displayId: `po-${method}-icon-url-display`,
        previewId: `po-${method}-icon-preview`,
        url: data.url,
        fallbackKey: deps.getPaymentIconFallbackKey(method),
      });
      deps.Toast.fire({ icon: "success", title: "付款圖示已更新" });
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function uploadDeliveryRowIcon(button) {
    const row = button?.closest?.(".delivery-option-row");
    if (!row) return;
    const fileInput = row.querySelector(".do-icon-file");
    const file = fileInput?.files?.[0];
    if (!validateIconFile(file)) return;

    deps.Swal.fire({
      title: "上傳中...",
      allowOutsideClick: false,
      didOpen: () => deps.Swal.showLoading(),
    });

    try {
      const data = await uploadAssetFile(file, "");
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      const normalizedUrl = deps.normalizeIconPath(data.url);
      const finalUrl = normalizedUrl || String(data.url || "").trim();
      const urlInput = row.querySelector(".do-icon-url");
      const urlDisplay = row.querySelector(".do-icon-url-display");
      const preview = row.querySelector(".do-icon-preview");
      if (urlInput) urlInput.value = finalUrl;
      if (urlDisplay) {
        const resolvedDisplayUrl = deps.resolveAssetUrl(finalUrl) || finalUrl;
        urlDisplay.textContent = resolvedDisplayUrl;
      }
      if (preview instanceof HTMLImageElement) {
        setPreviewImageSource(preview, finalUrl, getRowFallbackIconUrl(row));
      }
      deps.Toast.fire({ icon: "success", title: "物流圖示已更新" });
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    previewIcon,
    setPreviewImageSource,
    updateIconPreview,
    applyIconFromLibrary,
    uploadSiteIcon,
    resetSiteIcon,
    uploadSectionIcon,
    uploadPaymentIcon,
    uploadDeliveryRowIcon,
    updateDeliveryRoutingPaymentHeaderIcon,
  };
}
