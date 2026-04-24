export interface DashboardProductSpec {
  key: string;
  label: string;
  price: number;
  enabled: boolean;
}

export interface DashboardProductRecord {
  id?: number | string;
  category?: string;
  name?: string;
  description?: string;
  roastLevel?: string;
  price?: number;
  specs?: string;
  enabled?: boolean;
  weight?: string;
  origin?: string;
  imageUrl?: string;
}

export interface DashboardProductViewModel {
  id: number;
  category: string;
  name: string;
  description: string;
  roastLevel: string;
  enabled: boolean;
  statusLabel: string;
  statusClass: string;
  priceLines: Array<{
    label: string;
    price: number;
    isSpec: boolean;
  }>;
}

export interface DashboardProductFormState {
  id: string;
  category: string;
  name: string;
  description: string;
  roastLevel: string;
  enabled: boolean;
  specs: DashboardProductSpec[];
}

export const defaultSpecs: DashboardProductSpec[] = [
  { key: "quarter", label: "1/4磅", price: 0, enabled: true },
  { key: "half", label: "半磅", price: 0, enabled: true },
  { key: "drip_bag", label: "單包耳掛", price: 0, enabled: true },
];

export function cloneSpecs(
  specs: Array<Partial<DashboardProductSpec>> = defaultSpecs,
): DashboardProductSpec[] {
  return specs.map((spec) => ({
    key: String(spec.key || ""),
    label: String(spec.label || ""),
    price: Number(spec.price) || 0,
    enabled: Boolean(spec.enabled),
  }));
}

export function getProductPriceLines(
  product: DashboardProductRecord,
): DashboardProductViewModel["priceLines"] {
  try {
    const specs = product.specs ? JSON.parse(product.specs) : [];
    const enabledSpecs = specs.filter((spec: DashboardProductSpec) => spec.enabled);
    if (enabledSpecs.length > 0) {
      return enabledSpecs.map((spec: DashboardProductSpec) => ({
        label: spec.label || "",
        price: Number(spec.price) || 0,
        isSpec: true,
      }));
    }
  } catch (_error) {
  }
  return [{ label: "", price: Number(product.price) || 0, isSpec: false }];
}

export function buildProductViewModel(
  product: DashboardProductRecord,
): DashboardProductViewModel {
  const enabled = Boolean(product?.enabled);
  return {
    id: Number(product?.id) || 0,
    category: product?.category || "",
    name: product?.name || "",
    description: product?.description || "",
    roastLevel: product?.roastLevel || "",
    enabled,
    statusLabel: enabled ? "啟用" : "未啟用",
    statusClass: enabled ? "ui-text-success" : "ui-text-muted",
    priceLines: getProductPriceLines(product),
  };
}

export function buildGroupedProductsView(
  products: DashboardProductRecord[],
  categoryOrder: string[],
): Array<{ category: string; items: DashboardProductViewModel[] }> {
  const grouped: Record<string, DashboardProductViewModel[]> = {};
  products.forEach((product) => {
    const category = product?.category || "";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(buildProductViewModel(product));
  });

  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return sortedCategories.map((category) => ({
    category,
    items: grouped[category],
  }));
}

export function resetProductFormState(
  productForm: DashboardProductFormState,
): void {
  productForm.id = "";
  productForm.category = "";
  productForm.name = "";
  productForm.description = "";
  productForm.roastLevel = "";
  productForm.enabled = true;
  productForm.specs = cloneSpecs();
}

export function fillProductFormState(
  productForm: DashboardProductFormState,
  product: DashboardProductRecord,
): void {
  productForm.id = String(product.id || "");
  productForm.category = product.category || "";
  productForm.name = product.name || "";
  productForm.description = product.description || "";
  productForm.roastLevel = product.roastLevel || "";
  productForm.enabled = Boolean(product.enabled);

  let specs: DashboardProductSpec[] = [];
  try {
    if (product.specs) specs = JSON.parse(product.specs);
  } catch (_error) {
  }
  productForm.specs = specs.length ? cloneSpecs(specs) : cloneSpecs();
}

export function buildSpecsFromForm(
  specs: DashboardProductSpec[],
): DashboardProductSpec[] {
  return specs.reduce<DashboardProductSpec[]>((result, spec, index) => {
    const label = String(spec.label || "").trim();
    const price = Number(spec.price) || 0;
    const enabled = Boolean(spec.enabled);
    if (!label) return result;
    const key = String(spec.key || "").trim() ||
      label.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_").toLowerCase() ||
      `spec_${index}_${Date.now()}`;
    result.push({ key, label, price, enabled });
    return result;
  }, []);
}

export function buildSaveProductPayload(
  productForm: DashboardProductFormState,
  userId: string,
) {
  const specs = buildSpecsFromForm(productForm.specs);
  const enabledSpecs = specs.filter((spec) => spec.enabled);
  return {
    specs,
    enabledSpecs,
    payload: {
      userId,
      category: productForm.category,
      name: productForm.name,
      description: productForm.description,
      price: enabledSpecs[0]?.price || 0,
      roastLevel: productForm.roastLevel,
      specs: JSON.stringify(specs),
      enabled: productForm.enabled,
      ...(productForm.id ? { id: Number.parseInt(productForm.id, 10) } : {}),
    },
  };
}
