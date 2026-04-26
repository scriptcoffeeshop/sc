import { asJsonRecord, parseJsonArray } from "../../lib/jsonUtils.ts";

export type PromotionTargetItem = {
  productId: number;
  specKey: string;
};

export interface DashboardPromotionRecord {
  [key: string]: unknown;
  id?: number | string;
  name?: string;
  type?: string;
  targetItems?: PromotionTargetItem[];
  targetProductIds?: Array<number | string>;
  minQuantity?: number | string;
  discountType?: string;
  discountValue?: number | string;
  enabled?: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface DashboardProductRecord {
  [key: string]: unknown;
  id?: number | string;
  category?: string;
  name?: string;
  price?: number | string;
  specs?: string;
}

export type DashboardProductSpec = {
  key?: string;
  label?: string;
  price?: number | string;
};

export type PromotionProductOption = {
  productId: number;
  specKey: string;
  label: string;
  price: number;
};

export type PromotionProductGroup = {
  productId: number;
  category: string;
  name: string;
  options: PromotionProductOption[];
};

export type PromotionFormState = {
  id: string;
  name: string;
  type: string;
  minQuantity: number;
  discountType: string;
  discountValue: number;
  enabled: boolean;
  targetItems: PromotionTargetItem[];
};

export function normalizePromotion(value: unknown): DashboardPromotionRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as DashboardPromotionRecord
    : {};
}

export function buildPromotionViewModel(promotion: DashboardPromotionRecord) {
  const isPercent = promotion?.discountType === "percent";
  const enabled = Boolean(promotion?.enabled);
  return {
    id: Number(promotion?.id) || 0,
    name: String(promotion?.name || ""),
    conditionText: `任選 ${Number(promotion?.minQuantity) || 0} 件`,
    discountText: isPercent
      ? `${promotion?.discountValue} 折`
      : `折 $${promotion?.discountValue}`,
    enabled,
    statusLabel: enabled ? "啟用" : "未啟用",
    statusClass: enabled ? "ui-text-success" : "ui-text-muted",
  };
}

export function normalizeTargetItems(
  sourcePromotion: DashboardPromotionRecord,
): PromotionTargetItem[] {
  const targetItems = Array.isArray(sourcePromotion?.targetItems)
    ? sourcePromotion.targetItems
    : [];
  if (targetItems.length > 0) {
    return targetItems.map((item) => ({
      productId: Number(item?.productId) || 0,
      specKey: String(item?.specKey || ""),
    })).filter((item) => item.productId > 0);
  }

  if (
    Array.isArray(sourcePromotion?.targetProductIds) &&
    sourcePromotion.targetProductIds.length > 0
  ) {
    return sourcePromotion.targetProductIds.map((targetId) => ({
      productId: Number(targetId) || 0,
      specKey: "",
    })).filter((item) => item.productId > 0);
  }

  return [];
}

export function parseProductSpecs(
  product: DashboardProductRecord,
): DashboardProductSpec[] {
  return parseJsonArray(product?.specs).map((item) => {
    const spec = asJsonRecord(item);
    return {
      key: String(spec["key"] || ""),
      label: String(spec["label"] || ""),
      price: Number(spec["price"]) || 0,
    };
  });
}

export function buildPromotionProductGroups(products: DashboardProductRecord[]) {
  return products.map((product): PromotionProductGroup => {
    const specs = parseProductSpecs(product);
    if (!specs.length) {
      return {
        productId: Number(product?.id) || 0,
        category: String(product?.category || ""),
        name: String(product?.name || ""),
        options: [{
          productId: Number(product?.id) || 0,
          specKey: "",
          label: `${product?.name || ""}`,
          price: Number(product?.price) || 0,
        }],
      };
    }

    return {
      productId: Number(product?.id) || 0,
      category: String(product?.category || ""),
      name: String(product?.name || ""),
      options: specs.map((spec) => ({
        productId: Number(product?.id) || 0,
        specKey: String(spec?.key || ""),
        label: String(spec?.label || ""),
        price: Number(spec?.price) || 0,
      })),
    };
  }).filter((group) => group.productId > 0);
}
