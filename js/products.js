// ============================================
// products.js — 商品資料整理與渲染
// ============================================

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
    const emptyState = document.createElement("p");
    emptyState.className = "text-center text-gray-500 py-8";
    emptyState.textContent = "目前沒有商品";
    container.replaceChildren(emptyState);
    return;
  }
  const fragment = document.createDocumentFragment();

  const createStepperButton = (productId, specKey, delta, text) => {
    const button = document.createElement("button");
    button.dataset.action = "cart-qty-change";
    button.dataset.pid = String(productId);
    button.dataset.spec = String(specKey);
    button.dataset.delta = String(delta);
    button.className =
      "w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90";
    button.textContent = text;
    return button;
  };

  const createSpecContainer = (productId, spec) => {
    const specContainer = document.createElement("div");
    specContainer.className = "spec-container flex-1 min-w-[80px] relative";
    specContainer.dataset.pid = String(productId);
    specContainer.dataset.spec = String(spec.key || "");

    const addButton = document.createElement("button");
    addButton.dataset.action = "add-to-cart";
    addButton.dataset.pid = String(productId);
    addButton.dataset.spec = String(spec.key || "");
    addButton.className =
      "spec-btn-add w-full text-xs sm:text-sm py-2 px-1 rounded-lg border-2 font-medium transition-all hover:shadow-md active:scale-95 flex flex-col items-center justify-center min-h-[48px]";
    addButton.style.borderColor = "var(--secondary)";
    addButton.style.color = "var(--primary)";
    addButton.style.background = "#fefdf8";

    const addLabel = document.createElement("span");
    addLabel.textContent = String(spec.label || "");
    const addPrice = document.createElement("span");
    addPrice.className = "font-bold";
    addPrice.textContent = `$${spec.price}`;
    addButton.append(addLabel, addPrice);

    const stepper = document.createElement("div");
    stepper.className =
      "spec-btn-stepper hidden w-full rounded-lg border-2 flex flex-col overflow-hidden";
    stepper.style.borderColor = "var(--secondary)";
    stepper.style.background = "white";

    const header = document.createElement("div");
    header.className =
      "text-xs sm:text-sm py-1.5 px-1 bg-amber-50 flex flex-col items-center justify-center border-b";
    header.style.borderColor = "var(--secondary)";
    header.style.color = "var(--primary)";
    const headerLabel = document.createElement("span");
    headerLabel.textContent = String(spec.label || "");
    const headerPrice = document.createElement("span");
    headerPrice.className = "font-bold";
    headerPrice.textContent = `$${spec.price}`;
    header.append(headerLabel, headerPrice);

    const controls = document.createElement("div");
    controls.className = "flex items-center justify-between px-1 py-1";
    controls.style.background = "var(--secondary)";

    const qtyWrapper = document.createElement("div");
    qtyWrapper.className =
      "flex-1 flex items-center justify-center mx-1 overflow-hidden";
    const qtyText = document.createElement("span");
    qtyText.className = "text-sm sm:text-base font-bold text-white spec-qty-text";
    qtyText.textContent = "1";
    qtyWrapper.appendChild(qtyText);

    controls.append(
      createStepperButton(productId, spec.key, -1, "−"),
      qtyWrapper,
      createStepperButton(productId, spec.key, 1, "+"),
    );

    stepper.append(header, controls);
    specContainer.append(addButton, stepper);
    return specContainer;
  };

  viewModel.categories.forEach((category) => {
    const categoryWrapper = document.createElement("div");
    categoryWrapper.className = "mb-4";

    const categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header rounded-t-xl px-4 py-2 font-semibold";
    categoryHeader.textContent = String(category.name || "");

    const categoryBody = document.createElement("div");
    categoryBody.className =
      "space-y-0 border border-t-0 rounded-b-xl overflow-hidden";
    categoryBody.style.borderColor = "#e5ddd5";

    category.products.forEach((product) => {
      const row = document.createElement("div");
      row.className = "product-row p-3 border-b flex flex-col gap-2";
      row.style.borderColor = "#f0e6db";

      const top = document.createElement("div");
      top.className = "flex items-start justify-between";
      const info = document.createElement("div");

      const name = document.createElement("div");
      name.className = "font-medium";
      name.append(String(product.name || ""));
      if (product.roastLevel) {
        const roastLevel = document.createElement("span");
        roastLevel.className =
          "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-1";
        roastLevel.textContent = String(product.roastLevel || "");
        name.appendChild(roastLevel);
      }
      info.appendChild(name);

      if (product.description) {
        const description = document.createElement("span");
        description.className = "text-xs text-gray-500";
        description.textContent = String(product.description || "");
        info.appendChild(description);
      }

      top.appendChild(info);

      const specs = document.createElement("div");
      specs.className = "flex gap-2 flex-wrap";
      product.specs.forEach((spec) => {
        specs.appendChild(createSpecContainer(product.id, spec));
      });

      row.append(top, specs);
      categoryBody.appendChild(row);
    });

    categoryWrapper.append(categoryHeader, categoryBody);
    fragment.appendChild(categoryWrapper);
  });

  container.replaceChildren(fragment);
}
