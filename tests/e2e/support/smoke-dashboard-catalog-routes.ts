import { fulfillJson } from "./smoke-shared.ts";
import {
  asBoolean,
  asNumber,
  asNumberArray,
  asString,
  asTargetItems,
  getRequestBody,
  type DashboardRouteContext,
} from "./smoke-dashboard-state.ts";

export async function handleDashboardCatalogRoutes(
  ctx: DashboardRouteContext,
): Promise<boolean> {
  const { action, request, route, state } = ctx;

  if (action === "getCategories") {
    await fulfillJson(route, {
      success: true,
      categories: state.categories,
    });
    return true;
  }

  if (action === "getProducts") {
    await fulfillJson(route, {
      success: true,
      products: state.products,
    });
    return true;
  }

  if (action === "getPromotions") {
    await fulfillJson(route, {
      success: true,
      promotions: state.promotions,
    });
    return true;
  }

  if (action === "addCategory") {
    const body = getRequestBody(request);
    state.categories.push({
      id: Date.now(),
      name: asString(body.name),
    });
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "updateCategory") {
    const body = getRequestBody(request);
    state.categories = state.categories.map((category) =>
      Number(category.id) === asNumber(body.id)
        ? { ...category, name: asString(body.name || category.name) }
        : category
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "deleteCategory") {
    const body = getRequestBody(request);
    state.categories = state.categories.filter((category) =>
      Number(category.id) !== asNumber(body.id)
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "addProduct") {
    const body = getRequestBody(request);
    state.products.push({
      id: Date.now(),
      category: asString(body.category),
      name: asString(body.name),
      description: asString(body.description),
      price: asNumber(body.price),
      roastLevel: asString(body.roastLevel),
      specs: asString(body.specs, "[]"),
      enabled: asBoolean(body.enabled),
    });
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "updateProduct") {
    const body = getRequestBody(request);
    state.products = state.products.map((product) =>
      Number(product.id) === asNumber(body.id)
        ? {
          ...product,
          category: body.category !== undefined
            ? asString(body.category)
            : product.category,
          name: body.name !== undefined ? asString(body.name) : product.name,
          description: body.description !== undefined
            ? asString(body.description)
            : product.description,
          price: body.price !== undefined
            ? asNumber(body.price)
            : product.price,
          roastLevel: body.roastLevel !== undefined
            ? asString(body.roastLevel)
            : product.roastLevel,
          specs: body.specs !== undefined
            ? asString(body.specs)
            : product.specs,
          enabled: body.enabled !== undefined
            ? asBoolean(body.enabled)
            : product.enabled,
        }
        : product
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "deleteProduct") {
    const body = getRequestBody(request);
    state.products = state.products.filter((product) =>
      Number(product.id) !== asNumber(body.id)
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "addPromotion") {
    const body = getRequestBody(request);
    state.promotions.push({
      id: Date.now(),
      name: asString(body.name),
      type: asString(body.type, "bundle"),
      targetProductIds: [],
      targetItems: asTargetItems(body.targetItems),
      minQuantity: asNumber(body.minQuantity, 1),
      discountType: asString(body.discountType, "percent"),
      discountValue: asNumber(body.discountValue),
      enabled: asBoolean(body.enabled),
      startTime: null,
      endTime: null,
      sortOrder: state.promotions.length,
    });
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "updatePromotion") {
    const body = getRequestBody(request);
    state.promotions = state.promotions.map((promotion) =>
      Number(promotion.id) === asNumber(body.id)
        ? {
          ...promotion,
          name: body.name !== undefined ? asString(body.name) : promotion.name,
          type: body.type !== undefined ? asString(body.type) : promotion.type,
          targetItems: Array.isArray(body.targetItems)
            ? asTargetItems(body.targetItems)
            : promotion.targetItems,
          targetProductIds: Array.isArray(body.targetProductIds)
            ? asNumberArray(body.targetProductIds)
            : promotion.targetProductIds,
          minQuantity: body.minQuantity !== undefined
            ? asNumber(body.minQuantity, 1)
            : promotion.minQuantity,
          discountType: body.discountType !== undefined
            ? asString(body.discountType)
            : promotion.discountType,
          discountValue: body.discountValue !== undefined
            ? asNumber(body.discountValue)
            : promotion.discountValue,
          enabled: body.enabled !== undefined
            ? asBoolean(body.enabled)
            : promotion.enabled,
        }
        : promotion
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  if (action === "deletePromotion") {
    const body = getRequestBody(request);
    state.promotions = state.promotions.filter((promotion) =>
      Number(promotion.id) !== asNumber(body.id)
    );
    await fulfillJson(route, { success: true });
    return true;
  }

  return false;
}
