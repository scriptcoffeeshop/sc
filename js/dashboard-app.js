// ============================================
// dashboard-app.js — 後台頁初始化入口
// ============================================

import { API_URL, LINE_REDIRECT } from "./config.js?v=44";
import { esc, Toast } from "./utils.js?v=44";
import { authFetch, loginWithLine } from "./auth.js?v=44";
import {
  createOrdersActionHandlers,
  createOrdersTabLoaders,
} from "./dashboard/modules/orders.js?v=44";
import {
  createProductsActionHandlers,
  createProductsTabLoaders,
} from "./dashboard/modules/products.js?v=44";
import {
  createSettingsActionHandlers,
  createSettingsTabLoaders,
} from "./dashboard/modules/settings.js?v=44";
import {
  createUsersActionHandlers,
  createUsersTabLoaders,
} from "./dashboard/modules/users.js?v=44";

// ============ 共享狀態 ============
let currentUser = null;
let products = [];
let categories = [];
let orders = [];
let users = [];
let blacklist = [];
let bankAccounts = [];
window.promotions = [];
let dashboardSettings = {};

function getAuthUserId() {
  if (!currentUser?.userId) throw new Error("請先登入");
  return currentUser.userId;
}

// ============ 全域函式掛載（保留舊快取相容性） ============
window.loginWithLine = () =>
  loginWithLine(LINE_REDIRECT.dashboard, "coffee_admin_state");
window.logout = logout;
window.showTab = showTab;
window.loadOrders = loadOrders;
window.renderOrders = renderOrders;
window.changeOrderStatus = changeOrderStatus;
window.deleteOrderById = deleteOrderById;
window.showProductModal = showProductModal;
window.editProduct = editProduct;
window.closeProductModal = closeProductModal;
window.saveProduct = saveProduct;
window.delProduct = delProduct;
window.moveProduct = moveProduct;
window.addSpecRow = addSpecRow;
window.addCategory = addCategory;
window.editCategory = editCategory;
window.delCategory = delCategory;
window.updateCategoryOrders = updateCategoryOrders;
window.saveSettings = saveSettings;
window.loadUsers = loadUsers;
window.toggleUserRole = toggleUserRole;
window.toggleUserBlacklist = toggleUserBlacklist;
window.loadBlacklist = loadBlacklist;
window.esc = esc;
window.showAddFieldModal = showAddFieldModal;
window.editFormField = editFormField;
window.deleteFormField = deleteFormField;
window.toggleFieldEnabled = toggleFieldEnabled;
window.previewIcon = previewIcon;
window.uploadSiteIcon = uploadSiteIcon;
window.resetSectionTitle = resetSectionTitle;
window.linePayRefundOrder = linePayRefundOrder;
window.showAddBankAccountModal = showAddBankAccountModal;
window.editBankAccount = editBankAccount;
window.deleteBankAccount = deleteBankAccount;
window.showPromotionModal = showPromotionModal;
window.closePromotionModal = closePromotionModal;
window.savePromotion = savePromotion;
window.editPromotion = editPromotion;
window.delPromotion = delPromotion;
window.movePromotion = movePromotion;
window.togglePromoType = togglePromoType;

const dashboardActionHandlers = {
  "login-with-line": () => window.loginWithLine(),
  "logout": () => logout(),
  ...createOrdersActionHandlers({
    loadOrders,
    deleteOrderById,
    linePayRefundOrder,
    confirmTransferPayment: (orderId) => window.confirmTransferPayment(orderId),
    Toast,
  }),
  ...createProductsActionHandlers({
    showProductModal,
    addCategory,
    showPromotionModal,
    editProduct,
    delProduct,
    editCategory,
    delCategory,
    editPromotion,
    delPromotion,
    addSpecRow,
    closeProductModal,
    closePromotionModal,
    renderCategories,
    loadPromotions,
  }),
  ...createSettingsActionHandlers({
    uploadSiteIcon,
    resetSectionTitle,
    addDeliveryOptionAdmin,
    showAddBankAccountModal,
    saveSettings,
    showAddFieldModal,
    toggleFieldEnabled,
    editFormField,
    deleteFormField,
    editBankAccount,
    deleteBankAccount,
    loadSettings,
    loadFormFields,
  }),
  ...createUsersActionHandlers({
    loadUsers,
    toggleUserBlacklist,
    toggleUserRole,
    loadBlacklist,
  }),
};

const dashboardTabLoaders = {
  ...createOrdersTabLoaders({ loadOrders }),
  ...createProductsTabLoaders({ renderCategories, loadPromotions }),
  ...createSettingsTabLoaders({ loadSettings, loadFormFields }),
  ...createUsersTabLoaders({ loadUsers, loadBlacklist }),
};

function initializeDashboardEventDelegation() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const tabButton = target.closest("[data-tab]");
    if (tabButton) {
      event.preventDefault();
      const tab = tabButton.dataset.tab;
      if (tab) showTab(tab);
      return;
    }

    const actionButton = target.closest("[data-action]");
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    if (!action) return;
    event.preventDefault();
    switch (action) {
      case "login-with-line":
      case "logout":
      case "reload-orders":
      case "show-product-modal":
      case "add-category":
      case "show-promotion-modal":
      case "search-users":
      case "upload-site-icon":
      case "reset-section-title":
      case "add-delivery-option-admin":
      case "show-add-bank-account-modal":
      case "save-settings":
      case "show-add-field-modal":
      case "add-spec-row":
      case "close-product-modal":
      case "close-promotion-modal":
      case "refund-linepay-order":
      case "confirm-transfer-payment":
      case "copy-tracking-number":
      case "delete-order":
      case "edit-product":
      case "delete-product":
      case "remove-spec-row":
      case "edit-category":
      case "delete-category":
      case "edit-promotion":
      case "delete-promotion":
      case "remove-delivery-option-row":
      case "toggle-user-blacklist":
      case "toggle-user-role":
      case "toggle-field-enabled":
      case "edit-form-field":
      case "delete-form-field":
      case "edit-bank-account":
      case "delete-bank-account": {
        const handler = dashboardActionHandlers[action];
        if (handler) handler(actionButton, event);
        break;
      }
      default:
        break;
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (target.dataset.action !== "change-order-status") return;
    const orderId = target.dataset.orderId;
    if (!orderId) return;
    changeOrderStatus(orderId, target.value);
  });

  const orderFilter = document.getElementById("order-filter");
  if (orderFilter) {
    orderFilter.addEventListener("change", renderOrders);
  }

  const userSearchInput = document.getElementById("user-search");
  if (userSearchInput) {
    userSearchInput.addEventListener("keyup", (event) => {
      if (event.key === "Enter") loadUsers();
    });
  }

  const iconFileInput = document.getElementById("s-icon-file");
  if (iconFileInput) {
    iconFileInput.addEventListener("change", (event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement) previewIcon(input);
    });
  }

  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", saveProduct);
  }

  const promotionForm = document.getElementById("promotion-form");
  if (promotionForm) {
    promotionForm.addEventListener("submit", savePromotion);
  }
}

// ============ 初始化 ============
document.addEventListener("DOMContentLoaded", () => {
  initializeDashboardEventDelegation();
  const p = new URLSearchParams(window.location.search);
  if (p.get("code")) handleLineCallback(p.get("code"), p.get("state"));
  else checkLogin();
});

// ============ LINE Login ============
async function handleLineCallback(code, state) {
  const saved = localStorage.getItem("coffee_admin_state");
  localStorage.removeItem("coffee_admin_state");
  if (!saved || state !== saved) {
    Swal.fire("驗證失敗", "請重新登入", "error");
    window.history.replaceState({}, "", "dashboard.html");
    return;
  }
  Swal.fire({
    title: "登入中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const r = await authFetch(
      `${API_URL}?action=lineLogin&code=${
        encodeURIComponent(code)
      }&redirectUri=${encodeURIComponent(LINE_REDIRECT.dashboard)}`,
    );
    const d = await r.json();
    window.history.replaceState({}, "", "dashboard.html");
    if (d.success && d.isAdmin) {
      currentUser = d.user;
      localStorage.setItem("coffee_admin", JSON.stringify(currentUser));
      if (d.token) localStorage.setItem("coffee_jwt", d.token);
      Swal.close();
      showAdmin();
    } else Swal.fire("錯誤", d.error || "無管理員權限", "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

function checkLogin() {
  const s = localStorage.getItem("coffee_admin");
  const t = localStorage.getItem("coffee_jwt");
  if (s && t) {
    try {
      currentUser = JSON.parse(s);
      showAdmin();
    } catch {
      localStorage.removeItem("coffee_admin");
      localStorage.removeItem("coffee_jwt");
    }
  } else {
    localStorage.removeItem("coffee_admin");
    localStorage.removeItem("coffee_jwt");
  }
}
function logout() {
  localStorage.removeItem("coffee_admin");
  localStorage.removeItem("coffee_jwt");
  currentUser = null;
  document.getElementById("login-page").classList.remove("hidden");
  document.getElementById("admin-page").classList.add("hidden");
}

async function showAdmin() {
  document.getElementById("login-page").classList.add("hidden");
  document.getElementById("admin-page").classList.remove("hidden");
  document.getElementById("admin-name").textContent = currentUser.displayName ||
    "管理員";
  await Promise.all([loadCategories(), loadProducts(), loadSettings()]);
  showTab("orders");
}

function showTab(tab) {
  [
    "orders",
    "products",
    "categories",
    "promotions",
    "settings",
    "users",
    "blacklist",
    "formfields",
  ].forEach((t) => {
    const tabBtn = document.getElementById(`tab-${t}`);
    const section = document.getElementById(`${t}-section`);
    if (tabBtn) {
      tabBtn.classList.remove("tab-active");
      tabBtn.classList.add("bg-white", "text-gray-600");
    }
    if (section) section.classList.add("hidden");
  });
  document.getElementById(`tab-${tab}`).classList.add("tab-active");
  document.getElementById(`tab-${tab}`).classList.remove(
    "bg-white",
    "text-gray-600",
  );
  document.getElementById(`${tab}-section`).classList.remove("hidden");
  const loader = dashboardTabLoaders[tab];
  if (loader) loader();
}

// ============ 訂單管理 ============
async function loadOrders() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getOrders&userId=${getAuthUserId()}&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      orders = d.orders;
      renderOrders();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderOrders() {
  const filter = document.getElementById("order-filter").value;
  const filtered = filter === "all"
    ? orders
    : orders.filter((o) => o.status === filter);
  const container = document.getElementById("orders-list");
  if (!filtered.length) {
    container.innerHTML =
      '<p class="text-center text-gray-500 py-8">沒有符合的訂單</p>';
    return;
  }

  const statusLabel = {
    pending: "待處理",
    processing: "處理中",
    shipped: "已出貨",
    completed: "已完成",
    cancelled: "已取消",
  };
  const methodLabel = {
    delivery: "🏠 配送到府",
    home_delivery: "📦 全台宅配",
    seven_eleven: "🏪 7-11",
    family_mart: "🏬 全家",
    in_store: "🚶 來店取貨",
  };
  const payMethodLabel = {
    cod: "💵 貨到付款",
    linepay: "💚 LINE Pay",
    transfer: "🏦 轉帳",
  };
  const payStatusLabel = {
    pending: "⚓ 待付款",
    paid: "✅ 已付款",
    failed: "❌ 失敗",
    cancelled: "❌ 取消",
    refunded: "↩️ 已退款",
  };

  container.innerHTML = filtered.map((o) => {
    const time = new Date(o.timestamp).toLocaleString("zh-TW");
    const addrInfo =
      (o.deliveryMethod === "delivery" || o.deliveryMethod === "home_delivery")
        ? `${o.city || ""}${o.district || ""} ${o.address || ""}`
        : `${o.storeName || ""}${o.storeId ? " [" + o.storeId + "]" : ""}${
          o.storeAddress ? " (" + o.storeAddress + ")" : ""
        }`;

    const pm = o.paymentMethod || "cod";
    const ps = o.paymentStatus || "";
    const payBadge = pm !== "cod"
      ? `<span class="text-xs px-2 py-0.5 rounded-full ${
        ps === "paid"
          ? "bg-green-50 text-green-700"
          : ps === "refunded"
          ? "bg-purple-50 text-purple-700"
          : ps === "pending"
          ? "bg-yellow-50 text-yellow-700"
          : "bg-gray-100 text-gray-600"
      }">${payMethodLabel[pm] || pm} ${payStatusLabel[ps] || ps}</span>`
      : "";
    const transferInfo = pm === "transfer"
      ? `<div class="text-xs text-blue-800 mt-2 bg-blue-50 p-2 rounded">
                 <div>🏦 <b>顧客匯出末5碼:</b> ${
        esc(o.transferAccountLast5 || "未提供")
      }</div>
                 <div class="mt-1 pb-1">⬇️ <b>匯入目標帳號:</b> ${
        esc(o.paymentId || "未提供 (舊版訂單)")
      }</div>
               </div>`
      : "";
    const refundBtn = pm === "linepay" && ps === "paid"
      ? `<button data-action="refund-linepay-order" data-order-id="${
        esc(o.orderId)
      }" class="text-xs text-purple-600 hover:text-purple-800">↩️ 退款</button>`
      : "";
    const confirmPayBtn = pm === "transfer" && ps === "pending"
      ? `<button data-action="confirm-transfer-payment" data-order-id="${
        esc(o.orderId)
      }" class="text-xs text-green-600 hover:text-green-800">✅ 確認已收款</button>`
      : "";

    let trackingHtml = "";
    if (o.trackingNumber) {
      let trackingLink = "";
      if (o.deliveryMethod === "seven_eleven") {
        trackingLink =
          `<a href="https://eservice.7-11.com.tw/e-tracking/search.aspx" target="_blank" class="text-xs text-blue-600 hover:underline ml-2">🔗 7-11貨態查詢</a>`;
      } else if (o.deliveryMethod === "family_mart") {
        trackingLink =
          `<a href="https://fmec.famiport.com.tw/FP_Entrance/QueryBox" target="_blank" class="text-xs text-blue-600 hover:underline ml-2">🔗 全家貨態查詢</a>`;
      } else if (
        o.deliveryMethod === "delivery" || o.deliveryMethod === "home_delivery"
      ) {
        trackingLink =
          `<a href="https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100" target="_blank" class="text-xs text-blue-600 hover:underline ml-2">🔗 中華郵政查詢</a>`;
      }

      trackingHtml = `
                <div class="text-xs bg-gray-100 p-2 rounded mt-2 border border-gray-200">
                    <span class="text-gray-500">物流單號：</span>
                    <span class="font-mono font-bold">${
        esc(o.trackingNumber)
      }</span>
                    <button type="button" data-action="copy-tracking-number" data-tracking-number="${
        esc(o.trackingNumber)
      }" class="ml-2 px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-700" title="複製單號">📋 複製</button>
                    ${trackingLink}
                </div>`;
    }

    return `
        <div class="border rounded-xl p-4 mb-3" style="border-color:#e5ddd5;">
            <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-sm" style="color:var(--primary)">#${o.orderId}</span>
                    <span class="delivery-tag delivery-${o.deliveryMethod}">${
      methodLabel[o.deliveryMethod] || o.deliveryMethod
    }</span>
                    <span class="status-badge status-${o.status}">${
      statusLabel[o.status] || o.status
    }</span>
                    ${payBadge}
                </div>
                <span class="text-xs text-gray-500">${time}</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm mb-2">
                <div><span class="text-gray-500">顧客：</span>${
      esc(o.lineName)
    }</div>
                <div><span class="text-gray-500">電話：</span>${
      esc(o.phone)
    }</div>
                <div class="col-span-2"><span class="text-gray-500">信箱：</span>${
      o.email
        ? `<a href="mailto:${esc(o.email)}" class="text-blue-500">${
          esc(o.email)
        }</a>`
        : "無"
    }</div>
                <div class="col-span-2"><span class="text-gray-500">地址/門市：</span>${
      esc(addrInfo)
    }</div>
                ${transferInfo}
            </div>
            ${trackingHtml}
            <div class="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded mb-2 mt-2">${
      esc(o.items)
    }</div>
            ${
      o.note
        ? `<div class="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-2">📝 ${
          esc(o.note)
        }</div>`
        : ""
    }
            <div class="flex justify-between items-center">
                <span class="font-bold" style="color:var(--accent)">$${o.total}</span>
                <div class="flex gap-2">
                    ${refundBtn}
                    ${confirmPayBtn}
                    <select data-action="change-order-status" data-order-id="${
      esc(o.orderId)
    }" class="text-xs border rounded px-2 py-1">
                        ${
      ["pending", "processing", "shipped", "completed", "cancelled"].map((s) =>
        `<option value="${s}" ${o.status === s ? "selected" : ""}>${
          statusLabel[s]
        }</option>`
      ).join("")
    }
                    </select>
                    <button data-action="delete-order" data-order-id="${
      esc(o.orderId)
    }" class="text-xs text-red-500 hover:text-red-700">刪除</button>
                </div>
            </div>
        </div>`;
  }).join("");
}

async function changeOrderStatus(orderId, status) {
  try {
    let trackingNumber = "";
    if (status === "shipped") {
      const { value: inputNum, isConfirmed } = await Swal.fire({
        title: "設定已出貨",
        text: "請輸入物流單號 (可選填)",
        input: "text",
        inputPlaceholder: "請輸入單號",
        showCancelButton: true,
        confirmButtonText: "確定",
        cancelButtonText: "取消",
        confirmButtonColor: "#3C2415",
      });
      if (!isConfirmed) {
        // 如果取消，則恢復原本的選單狀態 (重新載入一次列表)
        loadOrders();
        return;
      }
      trackingNumber = inputNum ? inputNum.trim() : "";
    }

    const payload = { userId: getAuthUserId(), orderId, status };
    if (trackingNumber) {
      payload.trackingNumber = trackingNumber;
    }

    const r = await authFetch(`${API_URL}?action=updateOrderStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "狀態已更新" });
      loadOrders();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function deleteOrderById(orderId) {
  const c = await Swal.fire({
    title: "刪除訂單？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deleteOrder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), orderId }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已刪除" });
      loadOrders();
    }
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ 商品管理 ============
async function loadProducts() {
  try {
    const r = await authFetch(`${API_URL}?action=getProducts&_=${Date.now()}`);
    const d = await r.json();
    if (d.success) {
      products = d.products;
      renderProducts();
    }
  } catch (e) {
    console.error(e);
  }
}

let productsMap = {};
function renderProducts() {
  const table = document.getElementById("products-main-table");
  table.querySelectorAll("tbody").forEach((el) => el.remove());

  if (!products.length) {
    const tbody = document.createElement("tbody");
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center py-8 text-gray-500">尚無商品</td></tr>';
    table.appendChild(tbody);
    return;
  }

  productsMap = {};
  products.forEach((p) => {
    productsMap[p.id] = p;
  });

  const grouped = {};
  products.forEach((p) => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });
  const catOrder = categories.map((c) => c.name);
  const sortedCats = Object.keys(grouped).sort((a, b) => {
    const ia = catOrder.indexOf(a), ib = catOrder.indexOf(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  sortedCats.forEach((cat) => {
    const catProds = grouped[cat];
    const tbody = document.createElement("tbody");
    tbody.className = "sortable-tbody";
    tbody.dataset.cat = cat;

    let html = "";
    catProds.forEach((p, i) => {
      let priceDisplay = `$${p.price}`;
      try {
        const specs = p.specs ? JSON.parse(p.specs) : [];
        const enabled = specs.filter((s) => s.enabled);
        if (enabled.length) {
          priceDisplay = enabled.map((s) =>
            `<div class="text-xs">${esc(s.label)}: $${s.price}</div>`
          ).join("");
        }
      } catch {}
      html += `
            <tr class="border-b" style="border-color:#f0e6db;" data-id="${p.id}">
                <td class="p-3 text-center">
                    <span class="drag-handle cursor-move text-gray-400 hover:text-amber-700 text-xl font-bold select-none px-2 inline-block" title="拖曳排序" style="touch-action: none;">☰</span>
                </td>
                <td class="p-3 text-sm">${esc(p.category)}</td>
                <td class="p-3">
                    <div class="font-medium mb-1">${esc(p.name)}</div>
                    <div class="text-xs text-gray-500">${
        esc(p.description || "")
      } ${p.roastLevel ? "・" + p.roastLevel : ""}</div>
                </td>
                <td class="p-3 text-right font-medium">${priceDisplay}</td>
                <td class="p-3 text-center"><span class="${
        p.enabled ? "text-green-600" : "text-gray-400"
      }">${p.enabled ? "啟用" : "停用"}</span></td>
                <td class="p-3 text-center">
                    <button data-action="edit-product" data-product-id="${p.id}" class="text-sm mr-2" style="color:var(--primary)">編輯</button>
                    <button data-action="delete-product" data-product-id="${p.id}" class="text-sm text-red-500">刪除</button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
    table.appendChild(tbody);

    if (typeof Sortable !== "undefined") {
      Sortable.create(tbody, {
        handle: ".drag-handle",
        animation: 150,
        onEnd: async function (evt) {
          if (evt.oldIndex === evt.newIndex) return;
          const ids = Array.from(tbody.querySelectorAll("tr[data-id]")).map(
            (tr) => parseInt(tr.dataset.id),
          );
          await updateProductOrders(ids);
        },
      });
    }
  });
}

async function moveProduct(id, dir) {
  // 保留這個 function 防止舊有代碼出錯，但不再被介面呼叫
  try {
    const r = await authFetch(`${API_URL}?action=reorderProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, direction: dir }),
    });
    const d = await r.json();
    if (d.success) loadProducts();
    else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function updateProductOrders(ids) {
  try {
    const r = await authFetch(`${API_URL}?action=reorderProductsBulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ids }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error);
    // 不強制重新 load products，保持畫面順暢，除非發生錯誤
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
    loadProducts(); // 錯誤時重新載入以恢復原狀
  }
}

// ======== 預設規格模板 ========
const defaultSpecs = [
  { key: "quarter", label: "1/4磅", price: 0, enabled: true },
  { key: "half", label: "半磅", price: 0, enabled: true },
  { key: "drip_bag", label: "單包耳掛", price: 0, enabled: true },
];

function addSpecRow(specData) {
  const container = document.getElementById("specs-container");
  const s = specData || { key: "", label: "", price: 0, enabled: true };
  const div = document.createElement("div");
  div.className = "spec-row flex items-center gap-2 p-2 rounded-lg border";
  div.style.borderColor = "#e5ddd5";
  div.innerHTML = `
        <label class="flex items-center"><input type="checkbox" class="spec-enabled w-4 h-4" ${
    s.enabled ? "checked" : ""
  }></label>
        <input type="text" class="spec-label input-field text-sm py-1" value="${
    esc(s.label)
  }" placeholder="規格名稱" style="width:90px">
        <span class="text-gray-500 text-sm">$</span>
        <input type="number" class="spec-price input-field text-sm py-1" value="${
    s.price || ""
  }" placeholder="價格" min="0" style="width:80px">
        <button type="button" data-action="remove-spec-row" class="text-red-400 hover:text-red-600 text-lg font-bold">&times;</button>
    `;
  container.appendChild(div);
}

function getSpecsFromForm() {
  const rows = document.querySelectorAll("#specs-container > div");
  const specs = [];
  rows.forEach((row) => {
    const label = row.querySelector(".spec-label").value.trim();
    const price = parseInt(row.querySelector(".spec-price").value) || 0;
    const enabled = row.querySelector(".spec-enabled").checked;
    if (label) {
      const key =
        label.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_").toLowerCase() ||
        `spec_${Date.now()}`;
      specs.push({ key, label, price, enabled });
    }
  });
  return specs;
}

function loadSpecsToForm(specsStr) {
  const container = document.getElementById("specs-container");
  container.innerHTML = "";
  let specs = [];
  try {
    if (specsStr) specs = JSON.parse(specsStr);
  } catch {}
  if (!specs.length) specs = JSON.parse(JSON.stringify(defaultSpecs));
  specs.forEach((s) => addSpecRow(s));
}

async function showProductModal() {
  if (!categories || !categories.length) await loadCategories();
  document.getElementById("pm-title").textContent = "新增商品";
  document.getElementById("product-form").reset();
  document.getElementById("pm-id").value = "";
  document.getElementById("pm-enabled").checked = true;
  updateCategorySelect();
  loadSpecsToForm("");
  document.getElementById("product-modal").classList.remove("hidden");
}

async function editProduct(id) {
  if (!categories || !categories.length) await loadCategories();
  const p = productsMap[id];
  if (!p) {
    Swal.fire("錯誤", "找不到商品", "error");
    return;
  }
  document.getElementById("pm-title").textContent = "編輯商品";
  document.getElementById("pm-id").value = p.id;
  updateCategorySelect();
  document.getElementById("pm-category").value = p.category;
  document.getElementById("pm-name").value = p.name;
  document.getElementById("pm-desc").value = p.description || "";
  document.getElementById("pm-roast").value = p.roastLevel || "";
  document.getElementById("pm-enabled").checked = p.enabled;
  loadSpecsToForm(p.specs || "");
  document.getElementById("product-modal").classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

function updateCategorySelect() {
  const sel = document.getElementById("pm-category");
  sel.innerHTML = '<option value="">選擇分類</option>' +
    categories.map((c) => `<option value="${c.name}">${c.name}</option>`).join(
      "",
    );
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById("pm-id").value;
  const specs = getSpecsFromForm();
  const enabledSpecs = specs.filter((s) => s.enabled);
  if (!enabledSpecs.length) {
    Swal.fire("錯誤", "請至少啟用一個規格", "error");
    return;
  }
  const hasZeroPrice = enabledSpecs.some((s) => !s.price || s.price <= 0);
  if (hasZeroPrice) {
    Swal.fire("錯誤", "已啟用的規格必須設定價格", "error");
    return;
  }

  const payload = {
    userId: getAuthUserId(),
    category: document.getElementById("pm-category").value,
    name: document.getElementById("pm-name").value,
    description: document.getElementById("pm-desc").value,
    price: enabledSpecs[0]?.price || 0,
    roastLevel: document.getElementById("pm-roast").value,
    specs: JSON.stringify(specs),
    enabled: document.getElementById("pm-enabled").checked,
  };
  if (id) payload.id = parseInt(id);
  try {
    const r = await authFetch(
      `${API_URL}?action=${id ? "updateProduct" : "addProduct"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: id ? "已更新" : "已新增" });
      closeProductModal();
      loadProducts();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function delProduct(id) {
  const c = await Swal.fire({
    title: "刪除商品？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deleteProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已刪除" });
      loadProducts();
    }
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ 分類管理 ============
async function loadCategories() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getCategories&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      categories = d.categories;
      renderCategories();
    }
  } catch (e) {
    console.error(e);
  }
}

let categoriesMap = {};
function renderCategories() {
  const container = document.getElementById("categories-list");
  if (!categories.length) {
    container.innerHTML =
      '<p class="text-center text-gray-500 py-4">尚無分類</p>';
    return;
  }
  categoriesMap = {};
  categories.forEach((c) => {
    categoriesMap[c.id] = c;
  });
  container.innerHTML = categories.map((c) => `
        <div class="flex items-center justify-between p-3 mb-2 rounded-lg" style="background:#faf6f2; border:1px solid #e5ddd5;" data-id="${c.id}">
            <div class="flex items-center gap-2">
                <span class="drag-handle-cat cursor-move text-gray-400 hover:text-amber-700 text-xl font-bold select-none px-1" title="拖曳排序" style="touch-action: none;">☰</span>
                <span class="font-medium">${esc(c.name)}</span>
            </div>
            <div class="flex gap-2">
                <button data-action="edit-category" data-category-id="${c.id}" class="text-sm" style="color:var(--primary)">編輯</button>
                <button data-action="delete-category" data-category-id="${c.id}" class="text-sm text-red-500">刪除</button>
            </div>
        </div>
    `).join("");

  // 掛載 Sortable 拖曳排序
  if (typeof Sortable !== "undefined") {
    if (window.categorySortable) window.categorySortable.destroy();
    window.categorySortable = Sortable.create(container, {
      handle: ".drag-handle-cat",
      animation: 150,
      onEnd: async function () {
        const ids = Array.from(container.querySelectorAll("[data-id]")).map(
          (el) => parseInt(el.dataset.id),
        );
        await updateCategoryOrders(ids);
      },
    });
  }
}

async function addCategory() {
  const name = document.getElementById("new-cat-name").value.trim();
  if (!name) return;
  try {
    const r = await authFetch(`${API_URL}?action=addCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), name }),
    });
    const d = await r.json();
    if (d.success) {
      document.getElementById("new-cat-name").value = "";
      Toast.fire({ icon: "success", title: "已新增" });
      loadCategories();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function editCategory(id) {
  const cat = categoriesMap[id];
  if (!cat) {
    Swal.fire("錯誤", "找不到分類", "error");
    return;
  }
  const oldName = cat.name;
  const { value } = await Swal.fire({
    title: "修改分類",
    input: "text",
    inputValue: oldName,
    showCancelButton: true,
    confirmButtonText: "更新",
    cancelButtonText: "取消",
  });
  if (value && value !== oldName) {
    try {
      const r = await authFetch(`${API_URL}?action=updateCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: getAuthUserId(), id, name: value }),
      });
      const d = await r.json();
      if (d.success) {
        Toast.fire({ icon: "success", title: "分類已更新，商品同步完成" });
        loadCategories();
        loadProducts();
      }
    } catch (e) {
      Swal.fire("錯誤", e.message, "error");
    }
  }
}

async function delCategory(id) {
  const c = await Swal.fire({
    title: "刪除分類？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deleteCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) loadCategories();
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function updateCategoryOrders(ids) {
  try {
    const r = await authFetch(`${API_URL}?action=reorderCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ids }),
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
    loadCategories();
  }
}

// ============ 促銷活動管理 ============
let promotionsMap = {};
async function loadPromotions() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getPromotions&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      window.promotions = d.promotions;
      renderPromotions();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderPromotions() {
  const table = document.getElementById("promotions-table");
  table.innerHTML = "";
  const proms = window.promotions || [];
  if (!proms.length) {
    table.innerHTML =
      '<tr><td colspan="5" class="text-center py-8 text-gray-500">尚無活動</td></tr>';
    return;
  }
  promotionsMap = {};

  let html = "";
  proms.forEach((p, i) => {
    promotionsMap[p.id] = p;
    const discountStr = p.discountType === "percent"
      ? `${p.discountValue} 折`
      : `折 $${p.discountValue}`;
    const conditionStr = `任選 ${p.minQuantity} 件`;
    html += `
        <tr class="border-b" style="border-color:#f0e6db;" data-id="${p.id}">
            <td class="p-3 text-center">
                <span class="drag-handle-promo cursor-move text-gray-400 hover:text-amber-700 text-xl font-bold select-none px-2 inline-block" title="拖曳排序" style="touch-action: none;">☰</span>
            </td>
            <td class="p-3 font-medium">${esc(p.name)}</td>
            <td class="p-3 text-sm text-gray-600">${conditionStr} <span class="font-bold text-red-500">${discountStr}</span></td>
            <td class="p-3 text-center"><span class="${
      p.enabled ? "text-green-600" : "text-gray-400"
    }">${p.enabled ? "啟用" : "停用"}</span></td>
            <td class="p-3 text-right">
                <button data-action="edit-promotion" data-promotion-id="${p.id}" class="text-sm mr-2" style="color:var(--primary)">編輯</button>
                <button data-action="delete-promotion" data-promotion-id="${p.id}" class="text-sm text-red-500">刪除</button>
            </td>
        </tr>`;
  });
  table.innerHTML = html;

  if (typeof Sortable !== "undefined" && table.children.length > 0) {
    if (window.promoSortable) window.promoSortable.destroy();
    window.promoSortable = Sortable.create(table, {
      handle: ".drag-handle-promo",
      animation: 150,
      onEnd: async function (evt) {
        if (evt.oldIndex === evt.newIndex) return;
        const ids = Array.from(table.querySelectorAll("tr[data-id]")).map(
          (tr) => parseInt(tr.dataset.id),
        );
        try {
          const r = await authFetch(`${API_URL}?action=reorderPromotionsBulk`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: getAuthUserId(), ids }),
          });
          const d = await r.json();
          if (!d.success) throw new Error(d.error);
        } catch (e) {
          Swal.fire("錯誤", e.message, "error");
          loadPromotions();
        }
      },
    });
  }
}

function renderPromoProducts(selectedItems = []) {
  const list = document.getElementById("prm-products-list");
  if (!products.length) {
    list.innerHTML = '<p class="text-gray-400">目前沒有商品可選</p>';
    return;
  }

  // selectedItems 現在是 [{"productId": 1, "specKey": "..."}]
  const isSelected = (pid, skey) => {
    return selectedItems.some((i) => i.productId === pid && i.specKey === skey);
  };

  let html = "";
  products.forEach((p) => {
    let specs = [];
    try {
      specs = JSON.parse(p.specs || "[]");
    } catch (e) {}

    if (specs.length === 0) {
      // 無規格商品
      html += `
            <div class="mb-1 border-b pb-1 last:border-0" style="border-color:#f0e6db">
                <label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                    <input type="checkbox" class="promo-product-cb" data-pid="${p.id}" data-skey="" ${
        isSelected(p.id, "") ? "checked" : ""
      }>
                    <span class="text-gray-700 font-medium">[${
        esc(p.category)
      }] ${esc(p.name)}</span>
                </label>
            </div>`;
    } else {
      // 有規格商品：標題列 + 規格子選項
      html += `
            <div class="mb-2 border-b pb-1 last:border-0" style="border-color:#f0e6db">
                <div class="text-gray-700 font-medium p-1 bg-gray-50 rounded">[${
        esc(p.category)
      }] ${esc(p.name)}</div>
                <div class="pl-4 mt-1 space-y-1">
                    ${
        specs.map((s) => `
                        <label class="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded text-sm">
                            <input type="checkbox" class="promo-product-cb" data-pid="${p.id}" data-skey="${
          esc(s.key)
        }" ${isSelected(p.id, s.key) ? "checked" : ""}>
                            <span class="text-gray-600">${
          esc(s.label)
        } <span class="text-xs text-gray-400">($${s.price})</span></span>
                        </label>
                    `).join("")
      }
                </div>
            </div>`;
    }
  });

  list.innerHTML = html;
}

function showPromotionModal() {
  document.getElementById("prm-title").textContent = "新增活動";
  document.getElementById("promotion-form").reset();
  document.getElementById("prm-id").value = "";
  document.getElementById("prm-enabled").checked = true;
  renderPromoProducts([]);
  document.getElementById("promotion-modal").classList.remove("hidden");
}

function editPromotion(id) {
  const p = promotionsMap[id];
  if (!p) return;
  document.getElementById("prm-title").textContent = "編輯活動";
  document.getElementById("prm-id").value = p.id;
  document.getElementById("prm-name").value = p.name;
  document.getElementById("prm-type").value = p.type || "bundle";
  document.getElementById("prm-min-qty").value = p.minQuantity || 1;
  document.getElementById("prm-discount-type").value = p.discountType ||
    "percent";
  document.getElementById("prm-discount-value").value = p.discountValue || 0;
  document.getElementById("prm-enabled").checked = p.enabled;
  // 相容舊版資料：如果沒有 targetItems，就將 targetProductIds 當作無規格商品轉換
  let targetItems = p.targetItems || [];
  if (
    targetItems.length === 0 && p.targetProductIds &&
    p.targetProductIds.length > 0
  ) {
    targetItems = p.targetProductIds.map((id) => ({
      productId: id,
      specKey: "",
    }));
  }
  renderPromoProducts(targetItems);
  document.getElementById("promotion-modal").classList.remove("hidden");
}

function closePromotionModal() {
  document.getElementById("promotion-modal").classList.add("hidden");
}

function togglePromoType() {}

async function savePromotion(e) {
  e.preventDefault();
  const id = document.getElementById("prm-id").value;
  const cbs = document.querySelectorAll(".promo-product-cb:checked");
  const targetItems = Array.from(cbs).map((cb) => ({
    productId: parseInt(cb.dataset.pid),
    specKey: cb.dataset.skey || "",
  }));

  const payload = {
    userId: getAuthUserId(),
    name: document.getElementById("prm-name").value.trim(),
    type: document.getElementById("prm-type").value,
    targetItems,
    minQuantity: parseInt(document.getElementById("prm-min-qty").value) || 1,
    discountType: document.getElementById("prm-discount-type").value,
    discountValue:
      parseFloat(document.getElementById("prm-discount-value").value) || 0,
    enabled: document.getElementById("prm-enabled").checked,
  };
  if (id) payload.id = parseInt(id);

  try {
    const r = await authFetch(
      `${API_URL}?action=${id ? "updatePromotion" : "addPromotion"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: id ? "已更新" : "已新增" });
      closePromotionModal();
      loadPromotions();
    } else throw new Error(d.error);
  } catch (err) {
    Swal.fire("錯誤", err.message, "error");
  }
}

async function delPromotion(id) {
  const c = await Swal.fire({
    title: "刪除活動？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deletePromotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已刪除" });
      loadPromotions();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}
function movePromotion() {}

// ============ 設定 ============
async function loadSettings() {
  try {
    const r = await authFetch(`${API_URL}?action=getSettings&_=${Date.now()}`);
    const d = await r.json();
    if (d.success) {
      const s = d.settings;
      dashboardSettings = s;
      document.getElementById("s-ann-enabled").checked =
        String(s.announcement_enabled) === "true";
      document.getElementById("s-announcement").value = s.announcement || "";
      const isOpen = String(s.is_open) !== "false";
      document.querySelector(`input[name="s-open"][value="${isOpen}"]`)
        .checked = true;
      // 品牌設定
      document.getElementById("s-site-title").value = s.site_title || "";
      document.getElementById("s-site-subtitle").value = s.site_subtitle || "";
      document.getElementById("s-site-emoji").value = s.site_icon_emoji || "";
      // Icon 預覽
      if (s.site_icon_url) {
        document.getElementById("s-icon-preview").src = s.site_icon_url;
        document.getElementById("s-icon-preview").classList.remove("hidden");
        document.getElementById("s-icon-url-display").textContent =
          s.site_icon_url;
      }
      // 區塊標題
      document.getElementById("s-products-title").value =
        s.products_section_title || "";
      document.getElementById("s-products-color").value =
        s.products_section_color || "#6F4E37";
      document.getElementById("s-products-size").value =
        s.products_section_size || "text-lg";
      document.getElementById("s-products-bold").checked =
        String(s.products_section_bold) !== "false";

      document.getElementById("s-delivery-title").value =
        s.delivery_section_title || "";
      document.getElementById("s-delivery-color").value =
        s.delivery_section_color || "#6F4E37";
      document.getElementById("s-delivery-size").value =
        s.delivery_section_size || "text-lg";
      document.getElementById("s-delivery-bold").checked =
        String(s.delivery_section_bold) !== "false";

      document.getElementById("s-notes-title").value = s.notes_section_title ||
        "";
      document.getElementById("s-notes-color").value = s.notes_section_color ||
        "#6F4E37";
      document.getElementById("s-notes-size").value = s.notes_section_size ||
        "text-base";
      document.getElementById("s-notes-bold").checked =
        String(s.notes_section_bold) !== "false";

      // 物流與金流對應設定載入
      const deliveryConfigStr = s.delivery_options_config || "";
      let deliveryConfig = [];

      if (deliveryConfigStr) {
        try {
          deliveryConfig = JSON.parse(deliveryConfigStr);
        } catch (e) {
          console.error("Parsed delivery_options_config fails:", e);
        }
      }

      // 如果從未設定過 delivery_options_config，則進行舊版資料轉移 (Migration)
      if (!deliveryConfig.length) {
        // 嘗試讀取舊版金流對應
        const routingConfigStr = s.payment_routing_config || "";
        let routingConfig = {};
        if (routingConfigStr) {
          try {
            routingConfig = JSON.parse(routingConfigStr);
          } catch (e) {}
        } else {
          const le = String(s.linepay_enabled) === "true";
          const te = String(s.transfer_enabled) === "true";
          routingConfig = {
            in_store: { cod: true, linepay: le, transfer: te },
            delivery: { cod: true, linepay: le, transfer: te },
            home_delivery: { cod: true, linepay: le, transfer: te },
            seven_eleven: { cod: true, linepay: false, transfer: false },
            family_mart: { cod: true, linepay: false, transfer: false },
          };
        }

        // 將舊資料結構轉換為新版陣列
        deliveryConfig = [
          {
            id: "in_store",
            icon: "🚶",
            name: "來店自取",
            description: "到店自取",
            enabled: true,
            payment: routingConfig["in_store"] ||
              { cod: true, linepay: false, transfer: false },
          },
          {
            id: "delivery",
            icon: "🛵",
            name: "配送到府 (限新竹)",
            description: "專人外送",
            enabled: true,
            payment: routingConfig["delivery"] ||
              { cod: true, linepay: false, transfer: false },
          },
          {
            id: "home_delivery",
            icon: "📦",
            name: "全台宅配",
            description: "宅配到府",
            enabled: true,
            payment: routingConfig["home_delivery"] ||
              { cod: true, linepay: false, transfer: false },
          },
          {
            id: "seven_eleven",
            icon: "🏪",
            name: "7-11 取件",
            description: "超商門市",
            enabled: true,
            payment: routingConfig["seven_eleven"] ||
              { cod: true, linepay: false, transfer: false },
          },
          {
            id: "family_mart",
            icon: "🏬",
            name: "全家取件",
            description: "超商門市",
            enabled: true,
            payment: routingConfig["family_mart"] ||
              { cod: true, linepay: false, transfer: false },
          },
        ];
      }

      renderDeliveryOptionsAdmin(deliveryConfig);

      document.getElementById("s-linepay-sandbox").checked =
        String(s.linepay_sandbox) !== "false";

      // 金流選項顯示設定載入
      const paymentOptionsStr = s.payment_options_config || "";
      let paymentOptions = {};
      if (paymentOptionsStr) {
        try {
          paymentOptions = JSON.parse(paymentOptionsStr);
        } catch (e) {}
      }

      document.getElementById("po-cod-icon").value = paymentOptions.cod?.icon ||
        "💵";
      document.getElementById("po-cod-name").value = paymentOptions.cod?.name ||
        "取件 / 到付";
      document.getElementById("po-cod-desc").value =
        paymentOptions.cod?.description || "取貨時付現或宅配到付";

      document.getElementById("po-linepay-icon").value =
        paymentOptions.linepay?.icon || "💚";
      document.getElementById("po-linepay-name").value =
        paymentOptions.linepay?.name || "LINE Pay";
      document.getElementById("po-linepay-desc").value =
        paymentOptions.linepay?.description || "線上安全付款";

      document.getElementById("po-transfer-icon").value =
        paymentOptions.transfer?.icon || "🏦";
      document.getElementById("po-transfer-name").value =
        paymentOptions.transfer?.name || "線上轉帳";
      document.getElementById("po-transfer-desc").value =
        paymentOptions.transfer?.description || "ATM / 網銀匯款";

      // 載入匯款帳號
      await loadBankAccountsAdmin();
    }
  } catch (e) {
    console.error(e);
  }
}

// ============ 物流選項管理 ============
function renderDeliveryOptionsAdmin(config) {
  const tbody = document.getElementById("delivery-routing-table");
  if (!tbody) return;
  tbody.innerHTML = "";

  config.forEach((item) => {
    configToHtml(item, tbody);
  });

  // 重新綁定 Sortable (如果已經存在則銷毀重建)
  if (window.deliverySortable) {
    window.deliverySortable.destroy();
  }
  window.deliverySortable = new Sortable(tbody, {
    animation: 150,
    handle: ".cursor-move",
    ghostClass: "bg-gray-100",
  });
}

function addDeliveryOptionAdmin() {
  const tempId = "custom_" + Date.now();
  const newConfig = {
    id: tempId,
    icon: "📦",
    name: "新物流方式",
    description: "設定敘述",
    enabled: true,
    fee: 0,
    free_threshold: 0,
    payment: { cod: true, linepay: false, transfer: false },
  };

  const tbody = document.getElementById("delivery-routing-table");
  if (!tbody) return;

  configToHtml(newConfig, tbody, true);
}

function configToHtml(item, tbody, isNew = false) {
  const tr = document.createElement("tr");
  tr.className = "border-b delivery-option-row group" +
    (isNew ? " bg-yellow-50" : "");
  tr.style.borderColor = "#e5ddd5";
  tr.dataset.id = item.id;

  tr.innerHTML = `
        <td class="p-3 text-center cursor-move text-gray-400 hover:text-gray-600 transition">
            ☰
        </td>
        <td class="p-3">
            <div class="flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <input type="text" class="border rounded p-1 w-12 text-center text-xl do-icon" value="${
    esc(item.icon)
  }" placeholder="圖示">
                    <input type="text" class="border rounded p-1 flex-1 min-w-[120px] do-name" value="${
    esc(item.name)
  }" placeholder="物流名稱">
                    <input type="hidden" class="do-id" value="${esc(item.id)}">
                </div>
                <input type="text" class="border rounded p-1 w-full text-xs text-gray-600 do-desc" value="${
    esc(item.description)
  }" placeholder="簡短說明 (例如: 到店自取)">
            </div>
        </td>
        <td class="p-3 text-center border-l bg-gray-50/50" style="border-color:#e5ddd5">
            <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" class="sr-only peer do-enabled" ${
    item.enabled ? "checked" : ""
  }>
                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
            </label>
        </td>
        <td class="p-3 text-center border-l" style="border-color:#e5ddd5">
            <input type="number" class="border rounded p-1 w-16 text-center text-sm do-fee" value="${
    item.fee !== undefined ? item.fee : 0
  }" min="0">
        </td>
        <td class="p-3 text-center border-l" style="border-color:#e5ddd5">
            <input type="number" class="border rounded p-1 w-20 text-center text-sm do-free-threshold" value="${
    item.free_threshold !== undefined ? item.free_threshold : 0
  }" min="0">
        </td>
        <td class="p-3 text-center border-l" style="border-color:#e5ddd5">
            <input type="checkbox" class="w-4 h-4 do-cod" ${
    item.payment?.cod ? "checked" : ""
  }>
        </td>
        <td class="p-3 text-center border-l" style="border-color:#e5ddd5">
            <input type="checkbox" class="w-4 h-4 do-linepay" ${
    item.payment?.linepay ? "checked" : ""
  }>
        </td>
        <td class="p-3 text-center border-l" style="border-color:#e5ddd5">
            <input type="checkbox" class="w-4 h-4 do-transfer" ${
    item.payment?.transfer ? "checked" : ""
  }>
        </td>
        <td class="p-3 text-center border-l" style="border-color:#e5ddd5">
            <button type="button" data-action="remove-delivery-option-row" class="text-red-500 hover:text-red-700 p-1" title="刪除此選項">
                🗑️
            </button>
        </td>
    `;
  tbody.appendChild(tr);

  if (isNew) {
    setTimeout(() => tr.classList.remove("bg-yellow-50"), 1500);
  }
}

function resetSectionTitle(section) {
  const defaults = {
    products: {
      title: "🪶 咖啡豆選購",
      color: "#6F4E37",
      size: "text-lg",
      bold: true,
    },
    delivery: {
      title: "🚚 配送方式",
      color: "#6F4E37",
      size: "text-lg",
      bold: true,
    },
    notes: {
      title: "📝 訂單備註",
      color: "#6F4E37",
      size: "text-base",
      bold: true,
    },
  };
  const d = defaults[section];
  if (!d) return;
  document.getElementById(`s-${section}-title`).value = d.title;
  document.getElementById(`s-${section}-color`).value = d.color;
  document.getElementById(`s-${section}-size`).value = d.size;
  document.getElementById(`s-${section}-bold`).checked = d.bold;
}

async function saveSettings() {
  try {
    const payload = {
      userId: getAuthUserId(),
      settings: {
        announcement_enabled: String(
          document.getElementById("s-ann-enabled").checked,
        ),
        announcement: document.getElementById("s-announcement").value,
        is_open:
          document.querySelector('input[name="s-open"]:checked')?.value ||
          "true",
        site_title: document.getElementById("s-site-title").value.trim(),
        site_subtitle: document.getElementById("s-site-subtitle").value.trim(),
        site_icon_emoji: document.getElementById("s-site-emoji").value.trim(),

        products_section_title: document.getElementById("s-products-title")
          .value.trim(),
        products_section_color:
          document.getElementById("s-products-color").value,
        products_section_size: document.getElementById("s-products-size").value,
        products_section_bold: String(
          document.getElementById("s-products-bold").checked,
        ),

        delivery_section_title: document.getElementById("s-delivery-title")
          .value.trim(),
        delivery_section_color:
          document.getElementById("s-delivery-color").value,
        delivery_section_size: document.getElementById("s-delivery-size").value,
        delivery_section_bold: String(
          document.getElementById("s-delivery-bold").checked,
        ),

        notes_section_title: document.getElementById("s-notes-title").value
          .trim(),
        notes_section_color: document.getElementById("s-notes-color").value,
        notes_section_size: document.getElementById("s-notes-size").value,
        notes_section_bold: String(
          document.getElementById("s-notes-bold").checked,
        ),

        linepay_sandbox: String(
          document.getElementById("s-linepay-sandbox").checked,
        ),
      },
    };

    const deliveryConfig = [];
    document.querySelectorAll(".delivery-option-row").forEach((row) => {
      const id = row.querySelector(".do-id").value;
      const icon = row.querySelector(".do-icon").value.trim();
      const name = row.querySelector(".do-name").value.trim();
      const desc = row.querySelector(".do-desc").value.trim();
      const enabled = row.querySelector(".do-enabled").checked;

      const fee = parseInt(row.querySelector(".do-fee").value) || 0;
      const free_threshold =
        parseInt(row.querySelector(".do-free-threshold").value) || 0;

      const cod = row.querySelector(".do-cod").checked;
      const linepay = row.querySelector(".do-linepay").checked;
      const transfer = row.querySelector(".do-transfer").checked;

      if (name) {
        deliveryConfig.push({
          id,
          icon,
          name,
          description: desc,
          enabled,
          fee,
          free_threshold,
          payment: { cod, linepay, transfer },
        });
      }
    });

    payload.settings.delivery_options_config = JSON.stringify(deliveryConfig);

    payload.settings.payment_options_config = JSON.stringify({
      cod: {
        icon: document.getElementById("po-cod-icon").value.trim(),
        name: document.getElementById("po-cod-name").value.trim(),
        description: document.getElementById("po-cod-desc").value.trim(),
      },
      linepay: {
        icon: document.getElementById("po-linepay-icon").value.trim(),
        name: document.getElementById("po-linepay-name").value.trim(),
        description: document.getElementById("po-linepay-desc").value.trim(),
      },
      transfer: {
        icon: document.getElementById("po-transfer-icon").value.trim(),
        name: document.getElementById("po-transfer-name").value.trim(),
        description: document.getElementById("po-transfer-desc").value.trim(),
      },
    });

    const r = await authFetch(`${API_URL}?action=updateSettings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (d.success) Toast.fire({ icon: "success", title: "設定已儲存" });
    else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ 用戶管理 ============
async function loadUsers() {
  try {
    const search = document.getElementById("user-search").value;
    Swal.fire({
      title: "載入中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const r = await authFetch(
      `${API_URL}?action=getUsers&userId=${getAuthUserId()}&search=${
        encodeURIComponent(search)
      }&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      users = d.users;
      renderUsers();
      Swal.close();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

function renderUsers() {
  const tbody = document.getElementById("users-table");
  if (!users.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center py-8 text-gray-500">無符合條件的用戶</td></tr>';
    return;
  }
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  tbody.innerHTML = users.map((u) => {
    const isUserSuperAdmin = u.role === "SUPER_ADMIN";
    const isAdmin = u.role === "ADMIN" || u.role === "SUPER_ADMIN";
    const isBlocked = u.status === "BLACKLISTED";
    const lastLogin = u.lastLogin
      ? new Date(u.lastLogin).toLocaleString("zh-TW")
      : "無紀錄";

    let actions = "";
    if (isBlocked) {
      actions += `<button data-action="toggle-user-blacklist" data-user-id="${
        esc(u.userId)
      }" data-blocked="false" class="text-green-600 hover:text-green-800 text-sm font-medium mr-3">解除封鎖</button>`;
    } else {
      actions += `<button data-action="toggle-user-blacklist" data-user-id="${
        esc(u.userId)
      }" data-blocked="true" class="text-red-500 hover:text-red-700 text-sm font-medium mr-3">封鎖</button>`;
    }

    if (isSuperAdmin && !isUserSuperAdmin) {
      if (isAdmin) {
        actions += `<button data-action="toggle-user-role" data-user-id="${
          esc(u.userId)
        }" data-new-role="USER" class="text-red-600 hover:text-red-800 text-sm font-medium">移除管理員</button>`;
      } else {actions +=
          `<button data-action="toggle-user-role" data-user-id="${
            esc(u.userId)
          }" data-new-role="ADMIN" class="text-purple-600 hover:text-purple-800 text-sm font-medium">設為管理員</button>`;}
    }

    return `
        <tr class="border-b" style="border-color:#f0e6db;">
            <td class="p-3"><img src="${
      esc(u.pictureUrl) || "https://via.placeholder.com/40"
    }" class="w-10 h-10 rounded-full border"></td>
            <td class="p-3">
                <div class="font-medium text-gray-800">${
      esc(u.displayName)
    }</div>
                <div class="text-xs text-gray-500">${esc(u.email || "")} ${
      u.phone ? "・" + esc(u.phone) : ""
    }</div>
                <div class="text-xs text-gray-500 mt-1">🏠 ${
      u.defaultDeliveryMethod === "delivery"
        ? `宅配 (${esc(u.defaultCity)}${esc(u.defaultDistrict)} ${
          esc(u.defaultAddress)
        })`
        : u.defaultDeliveryMethod === "in_store"
        ? "來店自取"
        : u.defaultDeliveryMethod
        ? `${u.defaultDeliveryMethod === "seven_eleven" ? "7-11" : "全家"} (${
          esc(u.defaultStoreName)
        } - ${esc(u.defaultStoreId)})`
        : "尚未設定"
    }</div>
                <div class="text-xs text-gray-400 font-mono mt-1 opacity-50">${
      esc(u.userId)
    }</div>
            </td>
            <td class="p-3">
                <div>${
      isAdmin
        ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">管理員</span>'
        : '<span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">用戶</span>'
    }</div>
                <div class="mt-1">${
      isBlocked
        ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">黑名單</span>'
        : '<span class="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">正常</span>'
    }</div>
                <div class="text-xs text-gray-400 mt-1">登入：${lastLogin}</div>
            </td>
            <td class="p-3 text-right">${actions}</td>
        </tr>`;
  }).join("");
}

async function toggleUserRole(targetUserId, newRole) {
  const c = await Swal.fire({
    title: `設為 ${newRole === "ADMIN" ? "管理員" : "一般用戶"}？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "確定",
  });
  if (!c.isConfirmed) return;
  try {
    Swal.fire({
      title: "處理中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const r = await authFetch(`${API_URL}?action=updateUserRole`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, newRole }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "權限已更新" });
      loadUsers();
    } else throw new Error(d.error);
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function toggleUserBlacklist(targetUserId, isBlocked) {
  if (isBlocked) {
    const { value: reason } = await Swal.fire({
      title: "封鎖用戶",
      input: "text",
      inputPlaceholder: "請輸入封鎖原因（例如惡意棄單）",
      showCancelButton: true,
      confirmButtonText: "封鎖",
    });
    if (reason === undefined) return;
    try {
      Swal.fire({
        title: "處理中...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const r = await authFetch(`${API_URL}?action=addToBlacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, reason }),
      });
      const d = await r.json();
      if (d.success) {
        Toast.fire({ icon: "success", title: "已加入黑名單" });
        loadUsers();
        if (
          document.getElementById("tab-blacklist").classList.contains(
            "tab-active",
          )
        ) loadBlacklist();
      } else throw new Error(d.error);
    } catch (e) {
      Swal.fire("錯誤", e.message, "error");
    }
  } else {
    const c = await Swal.fire({
      title: "解除封鎖？",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "確定解除",
    });
    if (!c.isConfirmed) return;
    try {
      Swal.fire({
        title: "處理中...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const r = await authFetch(`${API_URL}?action=removeFromBlacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const d = await r.json();
      if (d.success) {
        Toast.fire({ icon: "success", title: "已解除封鎖" });
        loadUsers();
        if (
          document.getElementById("tab-blacklist").classList.contains(
            "tab-active",
          )
        ) loadBlacklist();
      } else throw new Error(d.error);
    } catch (e) {
      Swal.fire("錯誤", e.message, "error");
    }
  }
}

// ============ 黑名單 ============
async function loadBlacklist() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getBlacklist&userId=${getAuthUserId()}&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      blacklist = d.blacklist;
      renderBlacklist();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderBlacklist() {
  const tbody = document.getElementById("blacklist-table");
  if (!blacklist.length) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="text-center py-8 text-gray-500">目前沒有封鎖名單</td></tr>';
    return;
  }
  tbody.innerHTML = blacklist.map((b) => {
    const dt = b.blockedAt
      ? new Date(b.blockedAt).toLocaleString("zh-TW")
      : "無紀錄";
    return `
        <tr class="border-b" style="border-color:#f0e6db;">
            <td class="p-3">
                <div class="font-medium">${esc(b.displayName)}</div>
                <div class="text-xs text-gray-400 font-mono">${
      esc(b.lineUserId)
    }</div>
            </td>
            <td class="p-3">
                <div class="text-sm">${dt}</div>
                <div class="text-xs text-red-500 mt-1">${
      esc(b.reason) || "(無原因)"
    }</div>
            </td>
            <td class="p-3 text-right">
                <button data-action="toggle-user-blacklist" data-user-id="${
      esc(b.lineUserId)
    }" data-blocked="false" class="text-green-600 hover:text-green-800 text-sm font-medium">解除封鎖</button>
            </td>
        </tr>`;
  }).join("");
}

// ============ 表單欄位管理 ============
let formFields = [];

async function loadFormFields() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getFormFieldsAdmin&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      formFields = d.fields || [];
      renderFormFields();
    }
  } catch (e) {
    console.error(e);
  }
}

const FIELD_TYPE_LABELS = {
  text: "文字",
  email: "Email",
  tel: "電話",
  number: "數字",
  select: "下拉選單",
  checkbox: "勾選框",
  textarea: "多行文字",
  section_title: "區塊標題",
};

function renderFormFields() {
  const container = document.getElementById("formfields-list");
  if (!formFields.length) {
    container.innerHTML =
      '<p class="text-center text-gray-500 py-8">尚無自訂欄位</p>';
    return;
  }
  container.innerHTML = `
        <div class="space-y-2" id="formfields-sortable">
            ${
    formFields.map((f) => {
      const typeBadge = FIELD_TYPE_LABELS[f.field_type] || f.field_type;
      const requiredBadge = f.required
        ? '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">必填</span>'
        : "";
      const enabledClass = f.enabled ? "" : "opacity-50";
      const isProtected = false;
      return `
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl border ${enabledClass}" style="border-color:#e5ddd5;" data-field-id="${f.id}">
                    <span class="cursor-grab text-gray-400 drag-handle">⠿</span>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-medium">${esc(f.label)}</span>
                            <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">${typeBadge}</span>
                            ${requiredBadge}
                            ${
        !f.enabled
          ? '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">已停用</span>'
          : ""
      }
                            ${
        isProtected
          ? '<span class="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">🔒 系統</span>'
          : ""
      }
                        </div>
                        <div class="text-xs text-gray-400 mt-1">key: ${
        esc(f.field_key)
      } ${f.placeholder ? "・" + esc(f.placeholder) : ""}</div>
                        ${
        (() => {
          if (!f.delivery_visibility) return "";
          try {
            const vis = JSON.parse(f.delivery_visibility);
            const hidden = Object.entries(vis).filter(([, v]) => v === false)
              .map(([k]) => k);
            if (!hidden.length) return "";
            return `<div class="text-xs text-orange-500 mt-1">🚫 在 ${
              hidden.join(", ")
            } 時隱藏</div>`;
          } catch {
            return "";
          }
        })()
      }
                    </div>
                    <div class="flex gap-1 items-center">
                        <button data-action="toggle-field-enabled" data-field-id="${f.id}" data-enabled="${!f
        .enabled}" class="text-sm px-2 py-1 rounded hover:bg-gray-100" title="${
        f.enabled ? "停用" : "啟用"
      }">${f.enabled ? "🟢" : "⚪"}</button>
                        <button data-action="edit-form-field" data-field-id="${f.id}" class="text-sm px-2 py-1 rounded hover:bg-gray-100" title="編輯">✏️</button>
                        ${
        !isProtected
          ? `<button data-action="delete-form-field" data-field-id="${f.id}" class="text-sm px-2 py-1 rounded hover:bg-red-50 text-red-500" title="刪除">🗑</button>`
          : ""
      }
                    </div>
                </div>`;
    }).join("")
  }
        </div>`;

  // 拖拽排序
  if (typeof Sortable !== "undefined") {
    new Sortable(document.getElementById("formfields-sortable"), {
      handle: ".drag-handle",
      animation: 150,
      onEnd: async () => {
        const ids = [
          ...document.querySelectorAll("#formfields-sortable [data-field-id]"),
        ].map((el) => parseInt(el.dataset.fieldId));
        try {
          await authFetch(`${API_URL}?action=reorderFormFields`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: getAuthUserId(), ids }),
          });
          Toast.fire({ icon: "success", title: "排序已更新" });
        } catch (e) {
          console.error(e);
        }
      },
    });
  }
}

/** 渲染配送方式可見性 Checkbox 到 #swal-dv 容器 */
function renderDeliveryVisibilityCheckboxes(existingVisibility) {
  const container = document.getElementById("swal-dv");
  if (!container) return;
  // 從 delivery_options_config 取得所有配送方式
  const configStr = dashboardSettings?.delivery_options_config || "";
  let deliveryOptions = [];
  if (configStr) {
    try {
      deliveryOptions = JSON.parse(configStr);
    } catch {}
  }
  if (!deliveryOptions.length) {
    container.innerHTML =
      '<p class="text-xs text-gray-400">尚未設定配送方式</p>';
    return;
  }
  let vis = {};
  if (existingVisibility) {
    try {
      vis = JSON.parse(existingVisibility);
    } catch {}
  }
  container.innerHTML = deliveryOptions.map((opt) => {
    const checked = vis[opt.id] !== false; // null/undefined/true 都是 checked
    return `<label class="flex items-center gap-1 text-sm cursor-pointer px-2 py-1 rounded-lg border" style="border-color:#e5ddd5">
            <input type="checkbox" class="dv-cb" data-delivery-id="${
      esc(opt.id)
    }" ${checked ? "checked" : ""}> ${esc(opt.label || opt.id)}
        </label>`;
  }).join("");
}

/** 收集 #swal-dv 中的勾選狀態，回傳 JSON 字串或 null */
function collectDeliveryVisibility() {
  const cbs = document.querySelectorAll(".dv-cb");
  if (!cbs.length) return null;
  const vis = {};
  cbs.forEach((cb) => {
    vis[cb.dataset.deliveryId] = cb.checked;
  });
  return JSON.stringify(vis);
}

async function showAddFieldModal() {
  const { value: formValues } = await Swal.fire({
    title: "新增欄位",
    html: `
            <div style="text-align:left;">
                <label class="block text-sm mb-1 font-medium">欄位識別碼 (英文，唯一)</label>
                <input id="swal-fk" class="swal2-input" placeholder="例：receipt_type" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                <input id="swal-fl" class="swal2-input" placeholder="例：📄 開立收據" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">類型</label>
                <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                    <option value="text">文字</option>
                    <option value="email">Email</option>
                    <option value="tel">電話</option>
                    <option value="number">數字</option>
                    <option value="select">下拉選單</option>
                    <option value="checkbox">勾選框</option>
                    <option value="textarea">多行文字</option>
                </select>
                <label class="block text-sm mb-1 font-medium">提示文字 (placeholder)</label>
                <input id="swal-fp" class="swal2-input" placeholder="例：請選擇" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">選項 (僅下拉選單，逗號分隔)</label>
                <input id="swal-fo" class="swal2-input" placeholder="例：二聯式,三聯式,免開" style="margin:0 0 12px 0;width:100%">
                <label class="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" id="swal-fr"> <span class="text-sm">必填</span>
                </label>
                <div class="mt-3 pt-3 border-t" style="border-color:#e5ddd5">
                    <label class="block text-sm mb-1 font-medium">🚚 配送方式可見性</label>
                    <p class="text-xs text-gray-400 mb-2">取消勾選 = 該配送方式下不顯示此欄位，全勾 = 全部顯示</p>
                    <div id="swal-dv" class="flex flex-wrap gap-2"></div>
                </div>
            </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "新增",
    cancelButtonText: "取消",
    confirmButtonColor: "#3C2415",
    didOpen: () => renderDeliveryVisibilityCheckboxes(null),
    preConfirm: () => {
      const fieldKey = document.getElementById("swal-fk").value.trim();
      const label = document.getElementById("swal-fl").value.trim();
      if (!fieldKey || !label) {
        Swal.showValidationMessage("識別碼和名稱為必填");
        return false;
      }
      const fieldType = document.getElementById("swal-ft").value;
      const placeholder = document.getElementById("swal-fp").value.trim();
      const optionsRaw = document.getElementById("swal-fo").value.trim();
      const options = optionsRaw
        ? JSON.stringify(
          optionsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        )
        : "";
      const required = document.getElementById("swal-fr").checked;
      const deliveryVisibility = collectDeliveryVisibility();
      return {
        fieldKey,
        label,
        fieldType,
        placeholder,
        options,
        required,
        deliveryVisibility,
      };
    },
  });

  // Swal didOpen callback 不能在這裡，改用 setTimeout
  // 實際上我們需要在 Swal 打開後渲染配送方式 checkbox
  // 但 SweetAlert2 的 didOpen 已在上面的 html 欄位處處理
  // 所以我們在這邊用 Swal.getHtmlContainer 不太方便
  // 改用另一個方式：在 showAddFieldModal 和 editFormField 中使用 didOpen

  if (!formValues) return;

  // 如果全部都是 true 就存 null（= 全部顯示）
  if (formValues.deliveryVisibility) {
    try {
      const vis = JSON.parse(formValues.deliveryVisibility);
      if (Object.values(vis).every((v) => v === true)) {
        formValues.deliveryVisibility = null;
      }
    } catch {}
  }

  try {
    Swal.fire({
      title: "新增中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const r = await authFetch(`${API_URL}?action=addFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ...formValues }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "欄位已新增" });
      loadFormFields();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function editFormField(id) {
  const f = formFields.find((x) => x.id === id);
  if (!f) return;

  const optionsStr = (() => {
    try {
      return JSON.parse(f.options || "[]").join(",");
    } catch {
      return "";
    }
  })();

  const { value: formValues } = await Swal.fire({
    title: "編輯欄位",
    html: `
            <div style="text-align:left;">
                <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                <input id="swal-fl" class="swal2-input" value="${
      esc(f.label)
    }" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">類型</label>
                <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                    ${
      Object.entries(FIELD_TYPE_LABELS).map(([k, v]) =>
        `<option value="${k}" ${
          k === f.field_type ? "selected" : ""
        }>${v}</option>`
      ).join("")
    }
                </select>
                <label class="block text-sm mb-1 font-medium">提示文字</label>
                <input id="swal-fp" class="swal2-input" value="${
      esc(f.placeholder || "")
    }" style="margin:0 0 12px 0;width:100%">
                <label class="block text-sm mb-1 font-medium">選項 (下拉選單，逗號分隔)</label>
                <input id="swal-fo" class="swal2-input" value="${
      esc(optionsStr)
    }" style="margin:0 0 12px 0;width:100%">
                <label class="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" id="swal-fr" ${
      f.required ? "checked" : ""
    }> <span class="text-sm">必填</span>
                </label>
                <div class="mt-3 pt-3 border-t" style="border-color:#e5ddd5">
                    <label class="block text-sm mb-1 font-medium">🚚 配送方式可見性</label>
                    <p class="text-xs text-gray-400 mb-2">取消勾選 = 該配送方式下不顯示此欄位</p>
                    <div id="swal-dv" class="flex flex-wrap gap-2"></div>
                </div>
            </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "儲存",
    cancelButtonText: "取消",
    confirmButtonColor: "#3C2415",
    didOpen: () =>
      renderDeliveryVisibilityCheckboxes(f.delivery_visibility || null),
    preConfirm: () => {
      const label = document.getElementById("swal-fl").value.trim();
      if (!label) {
        Swal.showValidationMessage("名稱為必填");
        return false;
      }
      const fieldType = document.getElementById("swal-ft").value;
      const placeholder = document.getElementById("swal-fp").value.trim();
      const optionsRaw = document.getElementById("swal-fo").value.trim();
      const options = optionsRaw
        ? JSON.stringify(
          optionsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        )
        : "";
      const required = document.getElementById("swal-fr").checked;
      const deliveryVisibility = collectDeliveryVisibility();
      return {
        label,
        fieldType,
        placeholder,
        options,
        required,
        deliveryVisibility,
      };
    },
  });

  if (!formValues) return;

  if (formValues.deliveryVisibility) {
    try {
      const vis = JSON.parse(formValues.deliveryVisibility);
      if (Object.values(vis).every((v) => v === true)) {
        formValues.deliveryVisibility = null;
      }
    } catch {}
  }

  try {
    const r = await authFetch(`${API_URL}?action=updateFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, ...formValues }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已更新" });
      loadFormFields();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function deleteFormField(id) {
  const f = formFields.find((x) => x.id === id);
  const confirm = await Swal.fire({
    title: "確認刪除",
    text: `確定要刪除「${f?.label || ""}」欄位嗎？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    confirmButtonColor: "#ef4444",
  });
  if (!confirm.isConfirmed) return;

  try {
    const r = await authFetch(`${API_URL}?action=deleteFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已刪除" });
      loadFormFields();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function toggleFieldEnabled(id, enabled) {
  try {
    const r = await authFetch(`${API_URL}?action=updateFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, enabled }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: enabled ? "已啟用" : "已停用" });
      loadFormFields();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ Icon 上傳 ============
function previewIcon(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("s-icon-preview").src = e.target.result;
    document.getElementById("s-icon-preview").classList.remove("hidden");
  };
  reader.readAsDataURL(file);
}

async function uploadSiteIcon() {
  const input = document.getElementById("s-icon-file");
  const file = input.files[0];
  if (!file) {
    Swal.fire("提示", "請先選擇圖片檔案", "info");
    return;
  }
  if (file.size > 500 * 1024) {
    Swal.fire("錯誤", "圖片大小不能超過 500KB", "error");
    return;
  }

  Swal.fire({
    title: "上傳中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]); // 去掉 data:image/...;base64, 前綴
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const r = await authFetch(`${API_URL}?action=uploadSiteIcon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getAuthUserId(),
        fileData: base64,
        fileName: file.name,
        contentType: file.type,
      }),
    });
    const d = await r.json();
    if (d.success) {
      document.getElementById("s-icon-url-display").textContent = d.url;
      Toast.fire({ icon: "success", title: "圖示已上傳並套用" });
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ LINE Pay 退款 ============
async function linePayRefundOrder(orderId) {
  const c = await Swal.fire({
    title: "LINE Pay 退款",
    text: `確定要對訂單 #${orderId} 進行退款嗎？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#7c3aed",
    confirmButtonText: "確認退款",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;

  Swal.fire({
    title: "退款處理中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const r = await authFetch(`${API_URL}?action=linePayRefund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), orderId }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "退款成功" });
      loadOrders();
    } else Swal.fire("退款失敗", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

// ============ 轉帳確認收款 ============
window.confirmTransferPayment = async function (orderId) {
  const c = await Swal.fire({
    title: "確認收款",
    text: `確認已收到訂單 #${orderId} 的匯款？`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "確認已收款",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=updateOrderStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getAuthUserId(),
        orderId,
        status: "processing",
        paymentStatus: "paid",
      }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "已確認收款" });
      loadOrders();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
};

// ============ 匯款帳號管理 ============
async function loadBankAccountsAdmin() {
  try {
    const r = await authFetch(
      `${API_URL}?action=getBankAccounts&_=${Date.now()}`,
    );
    const d = await r.json();
    if (d.success) {
      bankAccounts = d.accounts || [];
      renderBankAccountsAdmin();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderBankAccountsAdmin() {
  const container = document.getElementById("bank-accounts-admin-list");
  if (!container) return;
  if (!bankAccounts.length) {
    container.innerHTML = '<p class="text-sm text-gray-500">尚無匯款帳號</p>';
    return;
  }
  container.innerHTML = bankAccounts.map((b) => `
        <div class="flex items-center justify-between p-3 mb-2 rounded-lg" style="background:#faf6f2; border:1px solid #e5ddd5;">
            <div>
                <div class="font-medium">${esc(b.bankName)} (${
    esc(b.bankCode)
  })</div>
                <div class="text-sm font-mono text-gray-600">${
    esc(b.accountNumber)
  }</div>
                ${
    b.accountName
      ? `<div class="text-xs text-gray-400">戶名: ${esc(b.accountName)}</div>`
      : ""
  }
            </div>
            <div class="flex gap-2">
                <button data-action="edit-bank-account" data-bank-account-id="${b.id}" class="text-sm" style="color:var(--primary)">編輯</button>
                <button data-action="delete-bank-account" data-bank-account-id="${b.id}" class="text-sm text-red-500">刪除</button>
            </div>
        </div>
    `).join("");
}

async function showAddBankAccountModal() {
  const { value: formValues } = await Swal.fire({
    title: "新增匯款帳號",
    html: `<div style="text-align:left;">
            <label class="block text-sm mb-1 font-medium">銀行代碼</label>
            <input id="swal-bc" class="swal2-input" placeholder="例：013" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">銀行名稱</label>
            <input id="swal-bn" class="swal2-input" placeholder="例：國泰世華" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">帳號</label>
            <input id="swal-an" class="swal2-input" placeholder="帳號號碼" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">戶名（選填）</label>
            <input id="swal-am" class="swal2-input" placeholder="戶名" style="margin:0 0 12px 0;width:100%">
        </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "新增",
    cancelButtonText: "取消",
    preConfirm: () => ({
      bankCode: document.getElementById("swal-bc").value.trim(),
      bankName: document.getElementById("swal-bn").value.trim(),
      accountNumber: document.getElementById("swal-an").value.trim(),
      accountName: document.getElementById("swal-am").value.trim(),
    }),
  });
  if (!formValues || !formValues.bankCode || !formValues.accountNumber) return;
  try {
    const r = await authFetch(`${API_URL}?action=addBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ...formValues }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "帳號已新增" });
      loadBankAccountsAdmin();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function editBankAccount(id) {
  const b = bankAccounts.find((a) => a.id === id);
  if (!b) return;
  const { value: formValues } = await Swal.fire({
    title: "編輯匯款帳號",
    html: `<div style="text-align:left;">
            <label class="block text-sm mb-1 font-medium">銀行代碼</label>
            <input id="swal-bc" class="swal2-input" value="${
      esc(b.bankCode)
    }" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">銀行名稱</label>
            <input id="swal-bn" class="swal2-input" value="${
      esc(b.bankName)
    }" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">帳號</label>
            <input id="swal-an" class="swal2-input" value="${
      esc(b.accountNumber)
    }" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">戶名（選填）</label>
            <input id="swal-am" class="swal2-input" value="${
      esc(b.accountName || "")
    }" style="margin:0 0 12px 0;width:100%">
        </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "更新",
    cancelButtonText: "取消",
    preConfirm: () => ({
      bankCode: document.getElementById("swal-bc").value.trim(),
      bankName: document.getElementById("swal-bn").value.trim(),
      accountNumber: document.getElementById("swal-an").value.trim(),
      accountName: document.getElementById("swal-am").value.trim(),
    }),
  });
  if (!formValues) return;
  try {
    const r = await authFetch(`${API_URL}?action=updateBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, ...formValues }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "帳號已更新" });
      loadBankAccountsAdmin();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}

async function deleteBankAccount(id) {
  const c = await Swal.fire({
    title: "刪除帳號？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!c.isConfirmed) return;
  try {
    const r = await authFetch(`${API_URL}?action=deleteBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const d = await r.json();
    if (d.success) {
      Toast.fire({ icon: "success", title: "帳號已刪除" });
      loadBankAccountsAdmin();
    } else Swal.fire("錯誤", d.error, "error");
  } catch (e) {
    Swal.fire("錯誤", e.message, "error");
  }
}
