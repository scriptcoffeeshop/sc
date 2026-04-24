import type {
  StorefrontCartSummary,
  StorefrontShippingDisplayState,
} from "./storefrontCartSummary.ts";

interface StorefrontCartUiItem {
  productId?: number | string;
  productName?: string;
  specKey?: string;
  specLabel?: string;
  qty?: number | string;
  unitPrice?: number | string;
}

export function clearElement(element: Element | null | undefined) {
  element?.replaceChildren();
}

export function createTotalPriceContent(
  summary: Partial<StorefrontCartSummary>,
  shippingState: Partial<StorefrontShippingDisplayState>,
) {
  if ((summary.totalDiscount || 0) > 0 || shippingState.showBadge) {
    const wrapper = document.createElement("div");
    wrapper.className = "flex flex-col items-start justify-center";

    const badges = document.createElement("div");
    badges.className = "flex items-center mb-0.5";

    if ((summary.totalDiscount || 0) > 0) {
      const discountBadge = document.createElement("span");
      discountBadge.textContent = `折 -$${summary.totalDiscount || 0}`;
      discountBadge.style.backgroundColor = "#fee2e2";
      discountBadge.style.color = "#dc2626";
      discountBadge.style.fontSize = "11px";
      discountBadge.style.padding = "2px 6px";
      discountBadge.style.borderRadius = "4px";
      discountBadge.style.marginRight = "4px";
      badges.appendChild(discountBadge);
    }

    if (shippingState.showBadge) {
      const shippingBadge = document.createElement("span");
      shippingBadge.textContent = shippingState.isFreeShipping
        ? "免運費"
        : `運費 $${shippingState.shippingFee || 0}`;
      shippingBadge.style.backgroundColor = shippingState.isFreeShipping
        ? "#dbeafe"
        : "#f3f4f6";
      shippingBadge.style.color = shippingState.isFreeShipping
        ? "#2563eb"
        : "#4b5563";
      shippingBadge.style.fontSize = "11px";
      shippingBadge.style.padding = "2px 6px";
      shippingBadge.style.borderRadius = "4px";
      badges.appendChild(shippingBadge);
    }

    const total = document.createElement("div");
    total.className = "text-xl font-bold leading-tight";
    total.textContent = `應付總額: $${summary.finalTotal || 0}`;

    wrapper.append(badges, total);
    return wrapper;
  }

  const total = document.createElement("div");
  total.className = "text-xl font-bold";
  total.textContent = `總金額: $${summary.finalTotal || 0}`;
  return total;
}

function createCartQuantityButton(idx: number, delta: number, text: string) {
  const button = document.createElement("button");
  button.className = "quantity-btn";
  button.dataset.action = "cart-item-qty";
  button.dataset.idx = String(idx);
  button.dataset.delta = String(delta);
  button.style.width = "28px";
  button.style.height = "28px";
  button.style.fontSize = "14px";
  button.textContent = text;
  return button;
}

export function renderCartItemsList(
  container: Element,
  items: StorefrontCartUiItem[],
  summary: Pick<StorefrontCartSummary, "discountedItemKeys">,
) {
  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const isDiscounted = summary.discountedItemKeys &&
      summary.discountedItemKeys.has(`${item.productId}-${item.specKey}`);

    const row = document.createElement("div");
    row.className = "flex items-center justify-between py-3 border-b";
    row.style.borderColor = "#f0e6db";

    const info = document.createElement("div");
    info.className = "flex-1 mr-3";

    const title = document.createElement("div");
    title.className = "font-medium text-sm flex items-center flex-wrap";
    title.append(String(item.productName || ""));
    if (isDiscounted) {
      const discountBadge = document.createElement("span");
      discountBadge.className =
        "ml-2 inline-block bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded leading-tight";
      discountBadge.textContent = "適用優惠";
      title.appendChild(discountBadge);
    }

    const specLine = document.createElement("div");
    specLine.className = "text-xs text-gray-500";
    specLine.textContent = `${String(item.specLabel || "")} · $${item.unitPrice}`;

    info.append(title, specLine);

    const controls = document.createElement("div");
    controls.className = "flex items-center gap-1";
    const qty = document.createElement("span");
    qty.className = "w-8 text-center font-medium";
    qty.textContent = String(item.qty || 0);
    controls.append(
      createCartQuantityButton(index, -1, "−"),
      qty,
      createCartQuantityButton(index, 1, "+"),
    );

    const totalArea = document.createElement("div");
    totalArea.className = "text-right ml-3 min-w-[60px]";

    const total = document.createElement("div");
    total.className = "font-semibold text-sm";
    total.style.color = "var(--accent)";
    total.textContent = `$${(Number(item.qty) || 0) * (Number(item.unitPrice) || 0)}`;

    const removeButton = document.createElement("button");
    removeButton.dataset.action = "remove-cart-item";
    removeButton.dataset.idx = String(index);
    removeButton.className = "text-xs text-red-400 hover:text-red-600";
    removeButton.textContent = "移除";

    totalArea.append(total, removeButton);
    row.append(info, controls, totalArea);
    fragment.appendChild(row);
  });

  container.replaceChildren(fragment);
}

export function renderShippingNoticePanel(
  shippingNotice: Element | null,
  shippingState: StorefrontShippingDisplayState,
  deliveryName: string,
  summary: StorefrontCartSummary,
) {
  if (!shippingNotice) return;

  if (!shippingState.showNotice) {
    shippingNotice.classList.add("hidden");
    shippingNotice.replaceChildren();
    return;
  }

  const shippingNoticeTitle = shippingState.hasFreeThreshold
    ? `未達 ${deliveryName}免運門檻`
    : `${deliveryName}運費`;

  const wrapper = document.createElement("div");
  wrapper.className = "px-3 py-2 rounded-lg mb-1";
  wrapper.style.background = "#fef2f2";
  wrapper.style.border = "1px solid #fca5a5";

  const header = document.createElement("div");
  header.className = "flex justify-between items-center text-sm font-semibold";
  header.style.color = "#991b1b";
  const title = document.createElement("span");
  title.textContent = shippingNoticeTitle;
  const amount = document.createElement("span");
  amount.textContent = `+$${shippingState.shippingFee}`;
  header.append(title, amount);
  wrapper.appendChild(header);

  if (shippingState.hasFreeThreshold) {
    const diff = shippingState.freeThreshold - summary.totalAfterDiscount;
    if (diff > 0) {
      const hint = document.createElement("div");
      hint.className = "text-xs mt-1";
      hint.style.color = "#b91c1c";
      hint.textContent = `還差 $${diff} 即可免運`;
      wrapper.appendChild(hint);
    }
  }

  shippingNotice.replaceChildren(wrapper);
  shippingNotice.classList.remove("hidden");
}

function createDiscountRow(text: string, amountText: string, className: string) {
  const row = document.createElement("div");
  row.className = `flex justify-between items-center mb-1 ${className}`;
  const label = document.createElement("span");
  label.textContent = text;
  const value = document.createElement("span");
  value.textContent = amountText;
  row.append(label, value);
  return row;
}

export function renderDiscountSection(
  discountSection: Element | null,
  summary: StorefrontCartSummary,
  shippingState: StorefrontShippingDisplayState,
  deliveryName: string,
) {
  if (!discountSection) return;

  const hasPromos = summary.totalDiscount > 0 && summary.appliedPromos &&
    summary.appliedPromos.length > 0;

  if (!hasPromos && !shippingState.isFreeShipping) {
    discountSection.classList.add("hidden");
    discountSection.replaceChildren();
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "border-b border-dashed border-[#e5ddd5] pb-2 mb-2";

  const title = document.createElement("div");
  title.className = "font-semibold text-gray-700 mb-2";
  title.textContent = "已套用優惠與折抵：";
  wrapper.appendChild(title);

  if (hasPromos) {
    summary.appliedPromos.forEach((promo) => {
      wrapper.appendChild(
        createDiscountRow(String(promo.name || ""), `-$${promo.amount}`, "text-red-600"),
      );
    });
  }

  if (shippingState.isFreeShipping) {
    const thresholdText = shippingState.hasFreeThreshold
      ? ` (滿$${shippingState.freeThreshold})`
      : "";
    wrapper.appendChild(
      createDiscountRow(
        `${deliveryName}免運${thresholdText}`,
        "免運費",
        "text-blue-600",
      ),
    );
  }

  discountSection.replaceChildren(wrapper);
  discountSection.classList.remove("hidden");
}
