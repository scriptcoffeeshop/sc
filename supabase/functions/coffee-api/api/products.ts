import { supabase } from "../utils/supabase.ts";
import { requireAdmin } from "../utils/auth.ts";

export async function getProducts() {
    const { data, error } = await supabase.from("coffee_products").select("*")
        .order("sort_order", { ascending: true });
    if (error) return { success: false, error: error.message };
    const products = (data || []).map((r: Record<string, unknown>) => ({
        id: r.id,
        category: r.category,
        name: r.name,
        description: r.description || "",
        price: r.price,
        weight: r.weight || "",
        origin: r.origin || "",
        roastLevel: r.roast_level || "",
        specs: r.specs || "",
        imageUrl: r.image_url || "",
        enabled: r.enabled !== false,
        sortOrder: r.sort_order || 0,
    }));
    return { success: true, products };
}

export async function addProduct(data: Record<string, unknown>, req: Request) {
    await requireAdmin(req);
    const { data: ins, error } = await supabase.from("coffee_products").insert({
        category: data.category,
        name: data.name,
        description: data.description || "",
        price: parseInt(String(data.price)) || 0,
        weight: data.weight || "",
        origin: data.origin || "",
        roast_level: data.roastLevel || "",
        specs: data.specs || "",
        image_url: data.imageUrl || "",
        enabled: data.enabled === false || data.enabled === "false" ? false : true,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    return { success: true, message: "商品已新增", id: ins.id };
}

export async function updateProduct(
    data: Record<string, unknown>,
    req: Request,
) {
    await requireAdmin(req);
    const { error } = await supabase.from("coffee_products").update({
        category: data.category,
        name: data.name,
        description: data.description || "",
        price: parseInt(String(data.price)) || 0,
        weight: data.weight || "",
        origin: data.origin || "",
        roast_level: data.roastLevel || "",
        specs: data.specs || "",
        image_url: data.imageUrl || "",
        enabled: data.enabled === true || data.enabled === "true",
    }).eq("id", data.id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: "商品已更新" };
}

export async function deleteProduct(
    data: Record<string, unknown>,
    req: Request,
) {
    await requireAdmin(req);
    const { error } = await supabase.from("coffee_products").delete().eq(
        "id",
        data.id,
    );
    if (error) return { success: false, error: error.message };
    return { success: true, message: "商品已刪除" };
}

export async function reorderProduct(
    data: Record<string, unknown>,
    req: Request,
) {
    await requireAdmin(req);
    const { data: allProds, error } = await supabase.from("coffee_products")
        .select("*").order("sort_order").order("id");
    if (error || !allProds) return { success: false, error: "讀取失敗" };

    const targetProd = allProds.find((p: Record<string, unknown>) =>
        String(p.id) === String(data.id)
    );
    if (!targetProd) return { success: false, error: "找不到商品" };

    const curCategory = targetProd.category;
    const catProds = allProds.filter((p: Record<string, unknown>) =>
        p.category === curCategory
    );

    const idx = catProds.findIndex((p: Record<string, unknown>) =>
        String(p.id) === String(data.id)
    );
    if (idx === -1) return { success: false, error: "找不到商品" };

    const dir = data.direction as string;
    const items = [...catProds];
    const [moved] = items.splice(idx, 1);

    if (dir === "top") items.unshift(moved);
    else if (dir === "bottom") items.push(moved);
    else if (dir === "up" && idx > 0) items.splice(idx - 1, 0, moved);
    else if (dir === "down" && idx < catProds.length - 1) {
        items.splice(idx + 1, 0, moved);
    } else items.splice(idx, 0, moved);

    const itemsToUpdate = items.map((item, index) => ({
        id: item.id,
        sort_order: index * 10,
    }));
    const { error: rpcError } = await supabase.rpc("batch_update_sort", {
        table_name: "coffee_products",
        items: itemsToUpdate,
    });
    if (rpcError) return { success: false, error: rpcError.message };
    return { success: true, message: "排序已更新" };
}

export async function reorderProductsBulk(
    data: Record<string, unknown>,
    req: Request,
) {
    await requireAdmin(req);
    const ids = data.ids as number[];
    if (!Array.isArray(ids)) return { success: false, error: "資料格式錯誤" };

    const itemsToUpdate = ids.map((id, index) => ({
        id,
        sort_order: index * 10,
    }));
    const { error: rpcError } = await supabase.rpc("batch_update_sort", {
        table_name: "coffee_products",
        items: itemsToUpdate,
    });
    if (rpcError) return { success: false, error: rpcError.message };
    return { success: true, message: "批量排序已更新" };
}
