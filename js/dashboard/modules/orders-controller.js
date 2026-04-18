export function createOrdersController(deps) {
  function getOrders() {
    return Array.isArray(deps.getOrders?.()) ? deps.getOrders() : [];
  }

  function getSelectedOrderIdsState() {
    const selectedOrderIds = deps.getSelectedOrderIdsState?.();
    return selectedOrderIds instanceof Set ? selectedOrderIds : new Set();
  }

  function setSelectedOrderIdsState(nextSelectedOrderIds) {
    const value = nextSelectedOrderIds instanceof Set
      ? nextSelectedOrderIds
      : new Set(nextSelectedOrderIds || []);
    deps.setSelectedOrderIdsState?.(value);
  }

  function isVueManagedOrdersList(
    container = document.getElementById("orders-list"),
  ) {
    return container?.dataset?.vueManaged === "true";
  }

  function getTrackingLinkInfo(order) {
    const customTrackingUrl = deps.normalizeTrackingUrl(order.trackingUrl || "");
    if (customTrackingUrl) {
      return {
        url: customTrackingUrl,
        label: "物流追蹤頁面",
      };
    }
    if (!order.trackingNumber) return null;
    if (order.deliveryMethod === "seven_eleven") {
      return {
        url: "https://eservice.7-11.com.tw/e-tracking/search.aspx",
        label: "7-11貨態查詢",
      };
    }
    if (order.deliveryMethod === "family_mart") {
      return {
        url: "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
        label: "全家貨態查詢",
      };
    }
    if (
      order.deliveryMethod === "delivery" ||
      order.deliveryMethod === "home_delivery"
    ) {
      return {
        url: "https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100",
        label: "中華郵政查詢",
      };
    }
    return null;
  }

  function buildReceiptSummaryHtml(receiptInfo) {
    if (!receiptInfo) return "";
    return `<div class="text-xs text-amber-800 ui-primary-soft p-2 rounded mt-2 border border-amber-100">
            <div><span class="ui-text-subtle">統一編號：</span>${
      deps.esc(receiptInfo.taxId) || "未填寫"
    }</div>
            <div><span class="ui-text-subtle">收據買受人：</span>${
      deps.esc(receiptInfo.buyer) || "未填寫"
    }</div>
            <div><span class="ui-text-subtle">收據地址：</span>${
      deps.esc(receiptInfo.address) || "未填寫"
    }</div>
            <div><span class="ui-text-subtle">壓印日期：</span>${
      receiptInfo.needDateStamp ? "需要" : "不需要"
    }</div>
          </div>`;
  }

  function buildOrderViewModel(order) {
    const paymentMethod = order.paymentMethod || "cod";
    const paymentStatus = String(order.paymentStatus || "").trim();
    const paymentExpiresAt = String(order.paymentExpiresAt || "").trim();
    const paymentLastCheckedAt = String(order.paymentLastCheckedAt || "").trim();
    const paymentProviderStatusCode = String(order.paymentProviderStatusCode || "")
      .trim();
    const paymentExpiresAtText = deps.formatOrderDateTimeText(paymentExpiresAt);
    const paymentLastCheckedAtText = deps.formatOrderDateTimeText(
      paymentLastCheckedAt,
    );
    const showPaymentDeadline = paymentMethod !== "cod" &&
      Boolean(paymentExpiresAtText) &&
      ["pending", "processing", "expired"].includes(paymentStatus);
    const showPaymentMeta = paymentMethod !== "cod" && (
      showPaymentDeadline ||
      Boolean(paymentLastCheckedAtText) ||
      Boolean(paymentProviderStatusCode)
    );
    const trackingLink = getTrackingLinkInfo(order);
    const receiptInfo = deps.normalizeReceiptInfo(order.receiptInfo);
    const addressInfo =
      (order.deliveryMethod === "delivery" || order.deliveryMethod === "home_delivery")
        ? `${order.city || ""}${order.district || ""} ${order.address || ""}`
        : `${order.storeName || ""}${order.storeId ? ` [${order.storeId}]` : ""}${
          order.storeAddress ? ` (${order.storeAddress})` : ""
        }`;

    return {
      orderId: String(order.orderId || ""),
      timestampText: new Date(order.timestamp).toLocaleString("zh-TW"),
      deliveryMethod: order.deliveryMethod || "",
      deliveryLabel: deps.orderMethodLabel[order.deliveryMethod] ||
        order.deliveryMethod,
      status: order.status || "",
      statusLabel: deps.orderStatusLabel[order.status] || order.status || "",
      paymentMethod,
      paymentStatus,
      paymentMethodLabel: deps.orderPayMethodLabel[paymentMethod] || paymentMethod,
      paymentStatusLabel: deps.orderPayStatusLabel[paymentStatus] || paymentStatus,
      payBadgeClass: paymentStatus === "paid"
        ? "bg-green-50 text-green-700"
        : paymentStatus === "processing"
        ? "bg-blue-50 text-blue-700"
        : paymentStatus === "pending"
        ? "bg-yellow-50 text-yellow-700"
        : paymentStatus === "failed" || paymentStatus === "cancelled" ||
            paymentStatus === "expired"
        ? "bg-red-50 text-red-700"
        : paymentStatus === "refunded"
        ? "bg-purple-50 text-purple-700"
        : "ui-bg-soft ui-text-strong",
      paymentExpiresAt,
      paymentExpiresAtText,
      paymentLastCheckedAt,
      paymentLastCheckedAtText,
      paymentProviderStatusCode,
      showPaymentDeadline,
      showPaymentMeta,
      isSelected: getSelectedOrderIdsState().has(order.orderId),
      lineUserId: order.lineUserId || "",
      lineName: order.lineName || "",
      phone: order.phone || "",
      email: order.email || "",
      addressInfo,
      transferAccountLast5: order.transferAccountLast5 || "",
      paymentId: order.paymentId || "",
      showTransferInfo: paymentMethod === "transfer",
      shippingProvider: order.shippingProvider || "",
      trackingNumber: order.trackingNumber || "",
      trackingLinkUrl: trackingLink?.url || "",
      trackingLinkLabel: trackingLink?.label || "",
      hasShippingInfo: Boolean(
        order.trackingNumber || order.shippingProvider || trackingLink,
      ),
      items: order.items || "",
      note: order.note || "",
      cancelReason: String(order.cancelReason || "").trim(),
      showCancellationReason:
        String(order.status || "") === "cancelled" &&
        Boolean(String(order.cancelReason || "").trim()),
      receiptInfo,
      showReceiptInfo: Boolean(receiptInfo),
      total: Number(order.total) || 0,
      showSendLineButton: Boolean(order.lineUserId),
      showSendEmailButton: Boolean(order.email),
      showRefundButton:
        (paymentMethod === "linepay" || paymentMethod === "jkopay") &&
        paymentStatus === "paid",
      refundButtonText: paymentMethod === "jkopay" ? "街口退款" : "LINE退款",
      showConfirmTransferButton:
        paymentMethod === "transfer" && paymentStatus === "pending",
    };
  }

  function emitDashboardOrdersUpdated(filteredOrders) {
    if (!isVueManagedOrdersList()) return;
    window.dispatchEvent(
      new CustomEvent("coffee:dashboard-orders-updated", {
        detail: {
          orders: filteredOrders.map(buildOrderViewModel),
          statusOptions: deps.orderStatusOptions,
        },
      }),
    );
  }

  function getOrderFilterValue(id, fallback = "all") {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) {
      return fallback;
    }
    if (el.value === undefined || el.value === null) return fallback;
    return String(el.value).trim();
  }

  function parseDateBound(dateStr, isEnd = false) {
    if (!dateStr) return null;
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    if (isEnd) {
      parsed.setHours(23, 59, 59, 999);
    }
    return parsed;
  }

  function getFilteredOrders() {
    const status = getOrderFilterValue("order-filter");
    const paymentMethod = getOrderFilterValue("order-payment-filter");
    const paymentStatus = getOrderFilterValue("order-payment-status-filter");
    const deliveryMethod = getOrderFilterValue("order-delivery-filter");
    const dateFrom = parseDateBound(getOrderFilterValue("order-date-from", ""));
    const dateTo = parseDateBound(getOrderFilterValue("order-date-to", ""), true);
    const minAmountRaw = getOrderFilterValue("order-amount-min", "");
    const maxAmountRaw = getOrderFilterValue("order-amount-max", "");
    const minAmount = minAmountRaw === "" ? null : Number(minAmountRaw);
    const maxAmount = maxAmountRaw === "" ? null : Number(maxAmountRaw);

    return getOrders().filter((order) => {
      if (status !== "all" && order.status !== status) return false;

      const pm = order.paymentMethod || "cod";
      if (paymentMethod !== "all" && pm !== paymentMethod) return false;

      const ps = String(order.paymentStatus || "");
      if (paymentStatus !== "all") {
        if (paymentStatus === "empty" && ps !== "") return false;
        if (paymentStatus !== "empty" && ps !== paymentStatus) return false;
      }

      if (deliveryMethod !== "all" && order.deliveryMethod !== deliveryMethod) {
        return false;
      }

      const ts = new Date(order.timestamp);
      if (dateFrom && ts < dateFrom) return false;
      if (dateTo && ts > dateTo) return false;

      const total = Number(order.total) || 0;
      if (minAmount !== null && !Number.isNaN(minAmount) && total < minAmount) {
        return false;
      }
      if (maxAmount !== null && !Number.isNaN(maxAmount) && total > maxAmount) {
        return false;
      }

      return true;
    });
  }

  function syncSelectedOrderIdsWithOrders() {
    const selected = [...getSelectedOrderIdsState()].filter((orderId) =>
      getOrders().some((order) => order.orderId === orderId)
    );
    setSelectedOrderIdsState(new Set(selected));
    return selected;
  }

  function updateOrdersSelectionUi(filteredOrders) {
    const selected = syncSelectedOrderIdsWithOrders();

    const selectedCountEl = document.getElementById("orders-selected-count");
    if (selectedCountEl) {
      selectedCountEl.textContent = `已選 ${selected.length} 筆`;
    }

    const selectAllEl = document.getElementById("orders-select-all");
    if (!(selectAllEl instanceof HTMLInputElement)) return;
    const filteredIds = filteredOrders.map((order) => order.orderId);
    const selectedVisible = filteredIds.filter((id) =>
      getSelectedOrderIdsState().has(id)
    ).length;
    selectAllEl.checked = filteredIds.length > 0 &&
      selectedVisible === filteredIds.length;
    selectAllEl.indeterminate = selectedVisible > 0 &&
      selectedVisible < filteredIds.length;
  }

  function renderOrdersSummary(filteredOrders) {
    const summaryEl = document.getElementById("orders-summary");
    if (!summaryEl) return;
    const totalAmount = filteredOrders.reduce(
      (sum, order) => sum + (Number(order.total) || 0),
      0,
    );
    summaryEl.textContent =
      `總訂單 ${getOrders().length} 筆｜篩選結果 ${filteredOrders.length} 筆｜金額合計 $${
        totalAmount.toLocaleString("zh-TW")
      }`;
  }

  function getTrackingLinkHtml(order) {
    const trackingLink = getTrackingLinkInfo(order);
    if (!trackingLink) return "";
    return `<a href="${
      deps.esc(trackingLink.url)
    }" target="_blank" class="text-xs ui-text-highlight hover:underline ml-2">${
      deps.esc(trackingLink.label)
    }</a>`;
  }

  async function loadOrders() {
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getOrders&userId=${deps.getAuthUserId()}&_=${
          Date.now()
        }`,
      );
      const data = await response.json();
      if (!data.success) return;
      deps.setOrders(Array.isArray(data.orders) ? data.orders : []);
      syncSelectedOrderIdsWithOrders();
      renderOrders();
    } catch (error) {
      console.error(error);
    }
  }

  function renderOrders() {
    const filtered = getFilteredOrders();
    const container = document.getElementById("orders-list");
    renderOrdersSummary(filtered);
    updateOrdersSelectionUi(filtered);

    if (isVueManagedOrdersList(container)) {
      emitDashboardOrdersUpdated(filtered);
      return;
    }

    if (!filtered.length) {
      if (container) {
        container.innerHTML =
          '<p class="text-center ui-text-subtle py-8">沒有符合的訂單</p>';
      }
      return;
    }

    if (!container) return;

    container.innerHTML = filtered.map((order) => {
      const time = new Date(order.timestamp).toLocaleString("zh-TW");
      const isSelected = getSelectedOrderIdsState().has(order.orderId);
      const receiptInfo = deps.normalizeReceiptInfo(order.receiptInfo);
      const addrInfo =
        (order.deliveryMethod === "delivery" ||
            order.deliveryMethod === "home_delivery")
          ? `${order.city || ""}${order.district || ""} ${order.address || ""}`
          : `${order.storeName || ""}${order.storeId ? " [" + order.storeId + "]" : ""}${
            order.storeAddress ? " (" + order.storeAddress + ")" : ""
          }`;

      const pm = order.paymentMethod || "cod";
      const ps = String(order.paymentStatus || "").trim();
      const paymentExpiresAtText = deps.formatOrderDateTimeText(
        order.paymentExpiresAt,
      );
      const paymentLastCheckedAtText = deps.formatOrderDateTimeText(
        order.paymentLastCheckedAt,
      );
      const paymentProviderStatusCode = String(order.paymentProviderStatusCode || "")
        .trim();
      const canOnlineRefund = (pm === "linepay" || pm === "jkopay") &&
        ps === "paid";
      const refundBtn = canOnlineRefund
        ? `<button data-action="refund-onlinepay-order" data-payment-method="${
          deps.esc(pm)
        }" data-order-id="${
          deps.esc(order.orderId)
        }" class="text-xs ui-text-violet hover:opacity-80 inline-flex items-center gap-1.5"><svg viewBox="0 0 24 24" aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-15-6l-3 2"></path></svg>退款</button>`
        : "";
      const payBadge = pm !== "cod"
        ? `<span class="text-xs px-2 py-0.5 rounded-full ui-border ${
          ps === "paid"
            ? "ui-text-success ui-bg-card-strong"
            : ps === "processing"
            ? "bg-blue-50 text-blue-700"
            : ps === "pending"
            ? "ui-text-warning ui-bg-card-strong"
            : ps === "failed" || ps === "cancelled" || ps === "expired"
            ? "bg-red-50 text-red-700"
            : ps === "refunded"
            ? "ui-text-violet ui-bg-card-strong"
            : "ui-bg-soft ui-text-strong"
        }">${deps.orderPayMethodLabel[pm] || pm} ${
          deps.orderPayStatusLabel[ps] || ps
        }</span>`
        : "";
      const paymentMetaHtml = pm !== "cod"
        ? `<div class="text-xs ui-bg-soft p-2 rounded mt-2 border ui-border">
            ${
          paymentExpiresAtText &&
            (ps === "pending" || ps === "processing" || ps === "expired")
            ? `<div><span class="ui-text-subtle">付款期限：</span>${
              deps.esc(paymentExpiresAtText)
            }</div>`
            : ""
        }
            ${
          paymentLastCheckedAtText
            ? `<div${
              paymentExpiresAtText ? ' class="mt-1"' : ""
            }><span class="ui-text-subtle">最近同步：</span>${
              deps.esc(paymentLastCheckedAtText)
            }</div>`
            : ""
        }
            ${
          paymentProviderStatusCode
            ? `<div${
              (paymentExpiresAtText || paymentLastCheckedAtText)
                ? ' class="mt-1"'
                : ""
            }><span class="ui-text-subtle">金流狀態碼：</span>${
              deps.esc(paymentProviderStatusCode)
            }</div>`
            : ""
        }
        </div>`
        : "";
      const transferInfo = pm === "transfer"
        ? `<div class="text-xs ui-text-highlight mt-2 ui-primary-soft p-2 rounded">
                 <div><b>顧客匯出末5碼:</b> ${
          deps.esc(order.transferAccountLast5 || "未提供")
        }</div>
                 <div class="mt-1 pb-1"><b>匯入目標帳號:</b> ${
          deps.esc(order.paymentId || "未提供 (舊版訂單)")
        }</div>
               </div>`
        : "";
      const confirmPayBtn = pm === "transfer" && ps === "pending"
        ? `<button data-action="confirm-transfer-payment" data-order-id="${
          deps.esc(order.orderId)
        }" class="text-xs ui-text-success hover:text-green-800">確認已收款</button>`
        : "";
      const sendLineBtn = order.lineUserId
        ? `<button data-action="send-order-flex" data-order-id="${
          deps.esc(order.orderId)
        }" class="text-xs ui-text-success hover:opacity-80">LINE通知</button>`
        : "";
      const sendEmailBtn = order.email
        ? `<button data-action="send-order-email" data-order-id="${
          deps.esc(order.orderId)
        }" class="text-xs ui-text-strong hover:opacity-80">發送信件</button>`
        : "";

      const trackingLinkHtml = getTrackingLinkHtml(order);
      const hasShippingInfo = !!order.trackingNumber || !!order.shippingProvider ||
        !!trackingLinkHtml;
      const shippingProviderHtml = order.shippingProvider
        ? `<div><span class="ui-text-subtle">物流商：</span>${
          deps.esc(order.shippingProvider)
        }</div>`
        : "";
      const trackingNumberHtml = order.trackingNumber
        ? `<div class="mt-1"><span class="ui-text-subtle">物流單號：</span>
                    <span class="font-mono font-bold">${
          deps.esc(order.trackingNumber)
        }</span>
                    <button type="button" data-action="copy-tracking-number" data-tracking-number="${
          deps.esc(order.trackingNumber)
        }" class="ml-2 px-2 py-0.5 ui-bg-soft hover:ui-bg-soft rounded ui-text-strong" title="複製單號">複製</button></div>`
        : "";
      const trackingHtml = hasShippingInfo
        ? `<div class="text-xs ui-bg-soft p-2 rounded mt-2 border ui-border">
                    ${shippingProviderHtml}
                    ${trackingNumberHtml}
                    ${
          trackingLinkHtml ? `<div class="mt-1">${trackingLinkHtml}</div>` : ""
        }
                </div>`
        : "";
      const receiptHtml = buildReceiptSummaryHtml(receiptInfo);

      return `
        <div class="border ui-border rounded-xl p-4 mb-3">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <label class="inline-flex items-center cursor-pointer">
                        <input type="checkbox" data-action="toggle-order-selection" data-order-id="${
        deps.esc(order.orderId)
      }" class="w-4 h-4" ${isSelected ? "checked" : ""}>
                    </label>
                    <span class="font-bold text-sm ui-text-highlight">#${order.orderId}</span>
                    <span class="delivery-tag delivery-${order.deliveryMethod}">${
        deps.orderMethodLabel[order.deliveryMethod] || order.deliveryMethod
      }</span>
                    <span class="status-badge status-${order.status}">${
        deps.orderStatusLabel[order.status] || order.status
      }</span>
                    ${payBadge}
                </div>
                <span class="text-xs ui-text-subtle">${time}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm mb-2">
                <div><span class="ui-text-subtle">顧客：</span>${
        deps.esc(order.lineName)
      }</div>
                <div><span class="ui-text-subtle">電話：</span>${
        deps.esc(order.phone)
      }</div>
                <div class="col-span-2"><span class="ui-text-subtle">信箱：</span>${
        order.email
          ? `<a href="mailto:${deps.esc(order.email)}" class="ui-text-highlight">${
            deps.esc(order.email)
          }</a>`
          : "無"
      }</div>
                <div class="col-span-2"><span class="ui-text-subtle">地址/門市：</span>${
        deps.esc(addrInfo)
      }</div>
                ${transferInfo}
            </div>
            ${trackingHtml}
            ${paymentMetaHtml}
            ${receiptHtml}
            <div class="text-sm ui-text-strong whitespace-pre-line ui-bg-soft p-3 rounded mb-2 mt-2">${
        deps.esc(order.items)
      }</div>
            ${
        order.note
          ? `<div class="text-sm ui-text-warning ui-primary-soft p-2 rounded mb-2"> ${
            deps.esc(order.note)
          }</div>`
          : ""
      }
            ${
        order.status === "cancelled" && String(order.cancelReason || "").trim()
          ? `<div class="text-sm text-red-700 bg-red-50 p-2 rounded mb-2 border border-red-100"><span class="ui-text-subtle">取消原因：</span>${
            deps.esc(String(order.cancelReason || "").trim())
          }</div>`
          : ""
      }
            <div class="flex justify-between items-center">
                <span class="font-bold ui-text-warning">$${order.total}</span>
                <div class="flex gap-2">
                    ${sendLineBtn}
                    ${sendEmailBtn}
                    ${refundBtn}
                    ${confirmPayBtn}
                    <select data-action="change-order-status" data-order-id="${
        deps.esc(order.orderId)
      }" data-current-status="${
        deps.esc(order.status || "")
      }" class="text-xs border rounded px-2 py-1">
                        ${
        deps.orderStatusOptions.map((status) =>
          `<option value="${status}" ${order.status === status ? "selected" : ""}>${
            deps.orderStatusLabel[status]
          }</option>`
        ).join("")
      }
                    </select>
                    <button data-action="confirm-order-status" data-order-id="${
        deps.esc(order.orderId)
      }" class="confirm-status-btn hidden text-xs px-2 py-1 rounded font-medium">確認</button>
                    <button data-action="delete-order" data-order-id="${
        deps.esc(order.orderId)
      }" class="text-xs ui-text-danger hover:text-red-700">刪除</button>
                </div>
            </div>
        </div>`;
    }).join("");
  }

  async function deleteOrderById(orderId) {
    const confirmation = await deps.Swal.fire({
      title: "刪除訂單？",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC322F",
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    });
    if (!confirmation.isConfirmed) return;
    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=deleteOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), orderId }),
      });
      const data = await response.json();
      if (!data.success) return;
      const nextSelectedOrderIds = getSelectedOrderIdsState();
      nextSelectedOrderIds.delete(orderId);
      setSelectedOrderIdsState(nextSelectedOrderIds);
      deps.Toast.fire({ icon: "success", title: "已刪除" });
      loadOrders();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  function toggleOrderSelection(orderId, checked) {
    const nextSelectedOrderIds = getSelectedOrderIdsState();
    if (checked) nextSelectedOrderIds.add(orderId);
    else nextSelectedOrderIds.delete(orderId);
    setSelectedOrderIdsState(nextSelectedOrderIds);
    const filtered = getFilteredOrders();
    updateOrdersSelectionUi(filtered);
    emitDashboardOrdersUpdated(filtered);
  }

  function toggleSelectAllOrders(checked) {
    const nextSelectedOrderIds = getSelectedOrderIdsState();
    getFilteredOrders().forEach((order) => {
      if (checked) nextSelectedOrderIds.add(order.orderId);
      else nextSelectedOrderIds.delete(order.orderId);
    });
    setSelectedOrderIdsState(nextSelectedOrderIds);
    renderOrders();
  }

  function getSelectedOrderIds() {
    return [...getSelectedOrderIdsState()].filter((orderId) =>
      getOrders().some((order) => order.orderId === orderId)
    );
  }

  async function batchUpdateOrders() {
    const orderIds = getSelectedOrderIds();
    if (!orderIds.length) {
      deps.Swal.fire("提醒", "請先勾選至少一筆訂單", "warning");
      return;
    }

    const status = getOrderFilterValue("batch-order-status", "");
    if (!status) {
      deps.Swal.fire("提醒", "請先選擇批次狀態", "warning");
      return;
    }

    let trackingNumber;
    let shippingProvider;
    let trackingUrl;
    if (status === "shipped") {
      const { value, isConfirmed } = await deps.Swal.fire({
        title: "批次出貨設定",
        html: `
        <div class="text-left space-y-2">
          <label class="text-sm ui-text-strong block">共用物流單號（可選）</label>
          <input id="swal-batch-tracking-number" class="swal2-input" placeholder="請輸入物流單號">
          <label class="text-sm ui-text-strong block">共用物流商（可選）</label>
          <input id="swal-batch-shipping-provider" class="swal2-input" placeholder="例如：黑貓宅急便">
          <label class="text-sm ui-text-strong block">共用物流追蹤網址（可選）</label>
          <input id="swal-batch-tracking-url" class="swal2-input" placeholder="https://...">
        </div>
      `,
        showCancelButton: true,
        confirmButtonText: "確定",
        cancelButtonText: "取消",
        confirmButtonColor: "#268BD2",
        focusConfirm: false,
        preConfirm: () => {
          const trackingNumEl = document.getElementById(
            "swal-batch-tracking-number",
          );
          const providerEl = document.getElementById(
            "swal-batch-shipping-provider",
          );
          const urlEl = document.getElementById("swal-batch-tracking-url");
          const trackingNumberValue = String(trackingNumEl?.value || "").trim();
          const shippingProviderValue = String(providerEl?.value || "").trim();
          const trackingUrlValue = String(urlEl?.value || "").trim();
          if (trackingUrlValue && !/^https?:\/\//i.test(trackingUrlValue)) {
            deps.Swal.showValidationMessage(
              "物流追蹤網址需以 http:// 或 https:// 開頭",
            );
            return false;
          }
          return {
            trackingNumber: trackingNumberValue,
            shippingProvider: shippingProviderValue,
            trackingUrl: trackingUrlValue,
          };
        },
      });
      if (!isConfirmed) return;
      trackingNumber = value?.trackingNumber || "";
      shippingProvider = value?.shippingProvider || "";
      trackingUrl = value?.trackingUrl || "";
    }

    const paymentStatus = getOrderFilterValue(
      "batch-payment-status",
      "__keep__",
    );
    const payload = {
      userId: deps.getAuthUserId(),
      orderIds,
      status,
    };
    if (paymentStatus !== "__keep__") payload.paymentStatus = paymentStatus;
    if (status === "shipped") {
      payload.trackingNumber = trackingNumber;
      payload.shippingProvider = shippingProvider;
      payload.trackingUrl = trackingUrl;
    }

    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=batchUpdateOrderStatus`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (data.success) {
        deps.Toast.fire({ icon: "success", title: data.message || "批次更新完成" });
      } else {
        const msg = data.error || "批次更新失敗";
        await deps.Swal.fire("提醒", msg, data.updatedCount ? "warning" : "error");
      }
      await loadOrders();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function batchDeleteOrders() {
    const orderIds = getSelectedOrderIds();
    if (!orderIds.length) {
      deps.Swal.fire("提醒", "請先勾選至少一筆訂單", "warning");
      return;
    }

    const confirmDelete = await deps.Swal.fire({
      title: `確定刪除 ${orderIds.length} 筆訂單？`,
      text: "此動作無法復原",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC322F",
      confirmButtonText: "批次刪除",
      cancelButtonText: "取消",
    });
    if (!confirmDelete.isConfirmed) return;

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=batchDeleteOrders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deps.getAuthUserId(),
          orderIds,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "批次刪除失敗");
      setSelectedOrderIdsState(new Set());
      deps.Toast.fire({ icon: "success", title: data.message || "批次刪除完成" });
      await loadOrders();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  function csvEscape(value) {
    const str = String(value ?? "").replace(/\r?\n/g, " | ");
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function buildOrdersCsv(orderList) {
    const header = [
      "訂單編號",
      "建立時間",
      "顧客",
      "電話",
      "Email",
      "配送方式",
      "訂單狀態",
      "付款方式",
      "付款狀態",
      "付款期限",
      "付款確認時間",
      "付款同步時間",
      "金流狀態碼",
      "金額",
      "物流商",
      "物流單號",
      "追蹤網址",
      "地址或門市",
      "訂單內容",
      "備註",
      "是否索取收據",
      "收據統一編號",
      "收據買受人",
      "收據地址",
      "收據壓印日期",
    ];
    const rows = orderList.map((order) => {
      const receiptInfo = deps.normalizeReceiptInfo(order.receiptInfo);
      const addrInfo =
        (order.deliveryMethod === "delivery" ||
            order.deliveryMethod === "home_delivery")
          ? `${order.city || ""}${order.district || ""} ${order.address || ""}`.trim()
          : `${order.storeName || ""}${order.storeId ? ` [${order.storeId}]` : ""}${
            order.storeAddress ? ` (${order.storeAddress})` : ""
          }`.trim();
      return [
        order.orderId || "",
        order.timestamp || "",
        order.lineName || "",
        order.phone || "",
        order.email || "",
        deps.orderMethodLabel[order.deliveryMethod] || order.deliveryMethod || "",
        deps.orderStatusLabel[order.status] || order.status || "",
        deps.orderPayMethodLabel[order.paymentMethod || "cod"] ||
        order.paymentMethod ||
        "",
        deps.orderPayStatusLabel[order.paymentStatus || ""] ||
        order.paymentStatus ||
        "",
        order.paymentExpiresAt || "",
        order.paymentConfirmedAt || "",
        order.paymentLastCheckedAt || "",
        order.paymentProviderStatusCode || "",
        Number(order.total) || 0,
        order.shippingProvider || "",
        order.trackingNumber || "",
        order.trackingUrl || "",
        addrInfo,
        order.items || "",
        order.note || "",
        receiptInfo ? "是" : "否",
        receiptInfo?.taxId || "",
        receiptInfo?.buyer || "",
        receiptInfo?.address || "",
        receiptInfo ? (receiptInfo.needDateStamp ? "需要" : "不需要") : "",
      ];
    });
    return [header, ...rows].map((cols) => cols.map(csvEscape).join(",")).join(
      "\r\n",
    );
  }

  function triggerCsvDownload(fileName, csvText) {
    const blob = new Blob(["\uFEFF" + csvText], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function getCsvTimestamp() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `${y}${m}${d}-${h}${min}`;
  }

  function exportFilteredOrdersCsv() {
    const filtered = getFilteredOrders();
    if (!filtered.length) {
      deps.Swal.fire("提醒", "目前沒有可匯出的訂單", "warning");
      return;
    }
    const csvText = buildOrdersCsv(filtered);
    triggerCsvDownload(`orders-filtered-${getCsvTimestamp()}.csv`, csvText);
    deps.Toast.fire({ icon: "success", title: `已匯出 ${filtered.length} 筆` });
  }

  function exportSelectedOrdersCsv() {
    const selectedIds = new Set(getSelectedOrderIds());
    const selectedOrders = getOrders().filter((order) =>
      selectedIds.has(order.orderId)
    );
    if (!selectedOrders.length) {
      deps.Swal.fire("提醒", "請先勾選要匯出的訂單", "warning");
      return;
    }
    const csvText = buildOrdersCsv(selectedOrders);
    triggerCsvDownload(`orders-selected-${getCsvTimestamp()}.csv`, csvText);
    deps.Toast.fire({
      icon: "success",
      title: `已匯出 ${selectedOrders.length} 筆`,
    });
  }

  return {
    loadOrders,
    renderOrders,
    deleteOrderById,
    toggleOrderSelection,
    toggleSelectAllOrders,
    batchUpdateOrders,
    batchDeleteOrders,
    exportFilteredOrdersCsv,
    exportSelectedOrdersCsv,
  };
}
