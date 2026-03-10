// ============================================
// products.js — 商品資料整理與渲染
// ============================================

import { escapeHtml } from "./utils.js";
import { state } from "./state.js";

function isVueManagedProductsContainer(container) {
  return container?.dataset?.vueManaged === "true";
}

function parseEnabledSpecs(product) {
  let specs = [];
  try {
    specs = JSON.parse(product.specs || "[]");
  } catch {
    specs = [];
  }

  const enabled = specs.filter((spec) => spec && spec.enabled !== false);
  if (enabled.length) {
    return enabled.map((spec) => ({
      key: String(spec.key || ""),
      label: String(spec.label || ""),
      price: Number(spec.price) || 0,
    }));
  }

  return [
    {
      key: "default",
      label: "預設",
      price: Number(product.price) || 0,
    },
  ];
}

function buildProductsViewModel() {
  const { products, categories } = state;
  const grouped = {};

  products.forEach((product) => {
    const category = String(product.category || "未分類");
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({
      id: Number(product.id),
      name: String(product.name || ""),
      description: String(product.description || ""),
      roastLevel: String(product.roastLevel || ""),
      specs: parseEnabledSpecs(product),
    });
  });

  const categoryOrder = categories.map((category) => String(category.name || ""));
  const orderedCategories = Object.keys(grouped).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return {
    empty: products.length === 0,
    categories: orderedCategories.map((categoryName) => ({
      name: categoryName,
      products: grouped[categoryName],
    })),
  };
}

function emitProductsUpdated(viewModel) {
  window.dispatchEvent(
    new CustomEvent("coffee:products-updated", {
      detail: viewModel,
    }),
  );
}

/** 供 Vue 元件讀取商品資料模型 */
export function getProductsViewModel() {
  return buildProductsViewModel();
}

/** 渲染商品列表（保留非 Vue fallback） */
export function renderProducts() {
  const container = document.getElementById("products-container");
  const viewModel = buildProductsViewModel();

  if (isVueManagedProductsContainer(container)) {
    emitProductsUpdated(viewModel);
    return;
  }

  if (!container) return;
  if (viewModel.empty) {
    container.innerHTML =
      '<p class="text-center text-gray-500 py-8">目前沒有商品</p>';
    return;
  }

  let html = "";

  viewModel.categories.forEach((category) => {
    html += `<div class="mb-4">
            <div class="category-header rounded-t-xl px-4 py-2 font-semibold">${
      escapeHtml(category.name)
    }</div>
            <div class="space-y-0 border border-t-0 rounded-b-xl overflow-hidden" style="border-color:#e5ddd5;">`;

    category.products.forEach((product) => {
      const description = product.description
        ? `<span class="text-xs text-gray-500">${
          escapeHtml(product.description)
        }</span>`
        : "";
      const roastLevel = product.roastLevel
        ? `<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-1">${
          escapeHtml(product.roastLevel)
        }</span>`
        : "";

      const specsHtml = product.specs.map((spec) => {
        return `
                    <div class="spec-container flex-1 min-w-[80px] relative" data-pid="${product.id}" data-spec="${escapeHtml(spec.key)}">
                        <button data-action="add-to-cart" data-pid="${product.id}" data-spec="${escapeHtml(spec.key)}"
                            class="spec-btn-add w-full text-xs sm:text-sm py-2 px-1 rounded-lg border-2 font-medium transition-all hover:shadow-md active:scale-95 flex flex-col items-center justify-center min-h-[48px]"
                            style="border-color:var(--secondary); color:var(--primary); background:#fefdf8;">
                            <span>${escapeHtml(spec.label)}</span>
                            <span class="font-bold">$${spec.price}</span>
                        </button>

                        <div class="spec-btn-stepper hidden w-full rounded-lg border-2 flex flex-col overflow-hidden"
                            style="border-color:var(--secondary); background:white;">
                            <div class="text-xs sm:text-sm py-1.5 px-1 bg-amber-50 flex flex-col items-center justify-center border-b" style="border-color:var(--secondary); color:var(--primary);">
                                 <span>${escapeHtml(spec.label)}</span>
                                 <span class="font-bold">$${spec.price}</span>
                            </div>
                            <div class="flex items-center justify-between px-1 py-1" style="background:var(--secondary);">
                                <button data-action="cart-qty-change" data-pid="${product.id}" data-spec="${escapeHtml(spec.key)}" data-delta="-1" class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">−</button>
                                <div class="flex-1 flex items-center justify-center mx-1 overflow-hidden">
                                    <span class="text-sm sm:text-base font-bold text-white spec-qty-text">1</span>
                                </div>
                                <button data-action="cart-qty-change" data-pid="${product.id}" data-spec="${escapeHtml(spec.key)}" data-delta="1" class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90">+</button>
                            </div>
                        </div>
                    </div>
                `;
      }).join("");

      html += `
                <div class="product-row p-3 border-b flex flex-col gap-2" style="border-color:#f0e6db;">
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="font-medium">${
        escapeHtml(product.name)
      } ${roastLevel}</div>
                            ${description}
                        </div>
                    </div>
                    <div class="flex gap-2 flex-wrap">${specsHtml}</div>
                </div>`;
    });

    html += "</div></div>";
  });

  container.innerHTML = html;
}
