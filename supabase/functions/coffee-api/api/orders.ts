import { supabase } from "../utils/supabase.ts";
import { extractAuth, requireAdmin, requireAuth } from "../utils/auth.ts";
import {
  FRONTEND_URL,
  SMTP_USER,
  VALID_ORDER_STATUSES,
} from "../utils/config.ts";
import { sanitize } from "../utils/html.ts";
import { sendEmail } from "../utils/email.ts";
import { requestLinePayAPI } from "../utils/linepay.ts";

// Note: registerOrUpdateUser is currently in api/auth.ts.
// For now, I'll copy or move it to a shared place if needed.
// Actually, I'll move it to utils/user-updater.ts or similar if I want to keep it dry.
// But as per plan, I'll keep it simple for now and maybe just import it if I export it.

// For now, let's assume we can import it from auth.ts if we export it,
// but it's better to avoid circular dependencies if later auth imports orders.
// I'll move registerOrUpdateUser to utils/users.ts.

import { registerOrUpdateUser } from "../utils/users.ts";

export async function submitOrder(data: Record<string, unknown>, req: Request) {
  const auth = await extractAuth(req);
  const lineUserId = auth?.userId || "";
  const phoneNum = String(data.phone || "").replace(/[\s-]/g, "");

  if (lineUserId || phoneNum) {
    let q = supabase.from("coffee_users").select(
      "status, blocked_at, blacklist_reason",
    );
    if (lineUserId) q = q.eq("line_user_id", lineUserId);
    else q = q.eq("phone", phoneNum);

    const { data: userRow } = await q.maybeSingle();
    if (userRow && (userRow.status === "BLACKLISTED" || userRow.blocked_at)) {
      const reason = userRow.blacklist_reason || "違反系統使用規範";
      return { success: false, error: `帳號已被停權，原因：${reason}` };
    }
  }

  if (!data.lineName || !data.phone) {
    return { success: false, error: "缺少必要資訊" };
  }

  const cartItems = data.items as Array<
    { productId: number; specKey: string; qty: number }
  >;
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return { success: false, error: "購物車是空的" };
  }

  const productIds = [...new Set(cartItems.map((c) => c.productId))];
  const { data: products, error: pErr } = await supabase.from("coffee_products")
    .select("id, name, price, specs, enabled").in("id", productIds);
  if (pErr || !products) return { success: false, error: "無法讀取商品資料" };

  const productMap = new Map<number, any>(products.map((p: any) => [p.id, p]));
  let total = 0;
  const orderLines: string[] = [];

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      return { success: false, error: `商品 ID ${item.productId} 不存在` };
    }
    if (product.enabled === false) {
      return { success: false, error: `商品「${product.name}」已下架` };
    }

    let unitPrice = product.price;
    let specLabel = "";
    if (product.specs) {
      if (!item.specKey) {
        return { success: false, error: `商品「${product.name}」必須選擇規格` };
      }
      try {
        const specs = typeof product.specs === "string"
          ? JSON.parse(product.specs)
          : product.specs;
        const specList = Array.isArray(specs) ? specs : [];
        const spec = specList.find((s: any) =>
          s.key === item.specKey || s.label === item.specKey
        );
        if (!spec) {
          return {
            success: false,
            error: `商品「${product.name}」的規格「${item.specKey}」不存在`,
          };
        }
        if (!spec.enabled) {
          return {
            success: false,
            error: `商品「${product.name}」的規格「${item.specKey}」已停止供應`,
          };
        }
        unitPrice = spec.price ?? product.price;
        specLabel = spec.label || item.specKey;
      } catch {
        return { success: false, error: `商品「${product.name}」規格解析失敗` };
      }
    } else {
      if (item.specKey) {
        return {
          success: false,
          error: `商品「${product.name}」無可選規格，請重新整理商品列表`,
        };
      }
    }

    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    const lineTotal = qty * unitPrice;
    total += lineTotal;
    orderLines.push(
      `${product.name}${
        specLabel ? ` (${specLabel})` : ""
      } x ${qty} (${lineTotal}元)`,
    );
  }

  const deliveryMethod = String(data.deliveryMethod || "delivery");
  const validMethods = [
    "delivery",
    "home_delivery",
    "seven_eleven",
    "family_mart",
    "in_store",
  ];
  if (!validMethods.includes(deliveryMethod)) {
    return { success: false, error: "無效的配送方式" };
  }

  const paymentMethod = String(data.paymentMethod || "cod");
  const validPayments = ["cod", "linepay", "transfer"];
  if (!validPayments.includes(paymentMethod)) {
    return { success: false, error: "無效的付款方式" };
  }

  const { data: settingsData } = await supabase.from("coffee_settings")
    .select("key, value")
    .in("key", [
      "delivery_options_config",
      "payment_routing_config",
      "linepay_enabled",
      "transfer_enabled",
    ]);

  let deliveryConfig: any[] = [];
  let routingConfig: any = null;
  let le = false;
  let te = false;

  settingsData?.forEach((r: any) => {
    if (r.key === "delivery_options_config") {
      try {
        deliveryConfig = JSON.parse(r.value);
      } catch (e) {}
    } else if (r.key === "payment_routing_config") {
      try {
        routingConfig = JSON.parse(r.value);
      } catch (e) {}
    } else if (r.key === "linepay_enabled") {
      le = String(r.value) === "true";
    } else if (r.key === "transfer_enabled") {
      te = String(r.value) === "true";
    }
  });

  if (!deliveryConfig.length) {
    if (!routingConfig) {
      routingConfig = {
        in_store: { cod: true, linepay: le, transfer: te },
        delivery: { cod: true, linepay: le, transfer: te },
        home_delivery: { cod: true, linepay: le, transfer: te },
        seven_eleven: { cod: true, linepay: false, transfer: false },
        family_mart: { cod: true, linepay: false, transfer: false },
      };
    }
    deliveryConfig = [
      {
        id: "in_store",
        enabled: true,
        payment: routingConfig["in_store"] ||
          { cod: true, linepay: false, transfer: false },
      },
      {
        id: "delivery",
        enabled: true,
        payment: routingConfig["delivery"] ||
          { cod: true, linepay: false, transfer: false },
      },
      {
        id: "home_delivery",
        enabled: true,
        payment: routingConfig["home_delivery"] ||
          { cod: true, linepay: false, transfer: false },
      },
      {
        id: "seven_eleven",
        enabled: true,
        payment: routingConfig["seven_eleven"] ||
          { cod: true, linepay: false, transfer: false },
      },
      {
        id: "family_mart",
        enabled: true,
        payment: routingConfig["family_mart"] ||
          { cod: true, linepay: false, transfer: false },
      },
    ];
  }

  const { data: activePromos } = await supabase.from("coffee_promotions")
    .select("*").eq("enabled", true);
  let totalDiscount = 0;
  const appliedPromos: any[] = [];

  if (activePromos) {
    for (const prm of activePromos) {
      if (prm.type !== "bundle") continue;
      const targetIds = typeof prm.target_product_ids === "string"
        ? JSON.parse(prm.target_product_ids)
        : (prm.target_product_ids || []);
      const targetItems = typeof prm.target_items === "string"
        ? JSON.parse(prm.target_items)
        : (prm.target_items || []);

      let matchQty = 0;
      let matchItemsSubtotal = 0;
      for (const item of cartItems) {
        // 檢查是否符合新版 targetItems
        const matchInItems = targetItems.some((t: any) => {
          if (t.productId !== item.productId) return false;
          if (!t.specKey) return true; // 適用所有規格
          return t.specKey === item.specKey;
        });
        // 檢查舊版 targetProductIds
        const matchInOldIds = targetIds.includes(item.productId);

        if (matchInItems || matchInOldIds) {
          matchQty += item.qty;
          const product = productMap.get(item.productId);
          if (!product) continue;

          let uPrice = Number(product.price) || 0;
          if (product.specs) {
            try {
              const specs = typeof product.specs === "string"
                ? JSON.parse(product.specs)
                : product.specs;
              if (Array.isArray(specs)) {
                const spec = specs.find((s: any) =>
                  s.key === item.specKey || s.label === item.specKey ||
                  s.name === item.specKey
                );
                if (spec && typeof spec.price === "number") uPrice = spec.price;
              }
            } catch {}
          }
          matchItemsSubtotal += item.qty * uPrice;
        }
      }
      if (matchQty >= (prm.min_quantity || 1)) {
        let dAmt = 0;
        if (prm.discount_type === "percent") {
          const discountValue = Number(prm.discount_value) || 0;
          dAmt = Math.round(matchItemsSubtotal * (100 - discountValue) / 100);
        } else if (prm.discount_type === "amount") {
          const minQty = Number(prm.min_quantity) || 1;
          const sets = Math.floor(matchQty / minQty);
          dAmt = sets * (Number(prm.discount_value) || 0);
        }
        if (dAmt > 0) {
          totalDiscount += dAmt;
          appliedPromos.push({ name: prm.name, amount: dAmt });
        }
      }
    }
  }

  const selectedDeliveryOpt = deliveryConfig.find((d: any) =>
    d.id === deliveryMethod
  );
  if (!selectedDeliveryOpt || !selectedDeliveryOpt.enabled) {
    return { success: false, error: "該取貨方式已停用或不存在" };
  }

  const paymentConfig: any = selectedDeliveryOpt.payment || {};
  if (!paymentConfig[paymentMethod]) {
    return {
      success: false,
      error: `該取貨方式目前不支援此付款方式：${paymentMethod}`,
    };
  }

  let shippingFee = 0;
  const fee = Number(selectedDeliveryOpt.fee) || 0;
  const freeThreshold = Number(selectedDeliveryOpt.free_threshold) || 0;
  const afterDiscount = Math.max(0, total - totalDiscount);
  if (freeThreshold <= 0 || afterDiscount < freeThreshold) {
    shippingFee = fee;
  }

  if (appliedPromos.length > 0) {
    orderLines.push("---");
    appliedPromos.forEach((p) => {
      orderLines.push(`🎁 ${p.name} (-$${p.amount})`);
    });
  }
  total = Math.max(0, total - totalDiscount);

  orderLines.push(`🚚 運費: $${shippingFee}`);
  total += shippingFee;

  const ordersText = orderLines.join("\n");

  if (deliveryMethod === "delivery") {
    const city = String(data.city || "");
    if (!["竹北市", "新竹市"].includes(city)) {
      return { success: false, error: "配送範圍僅限竹北市及新竹市" };
    }
    if (!data.address) {
      return { success: false, error: "請填寫配送地址" };
    }
  }

  if (deliveryMethod === "seven_eleven" || deliveryMethod === "family_mart") {
    if (!data.storeName) {
      return { success: false, error: "請選擇取貨門市" };
    }
  }

  const phone = String(data.phone).replace(/[\s-]/g, "");
  if (!/^(09\d{8}|0[2-8]\d{7,8})$/.test(phone)) {
    return { success: false, error: "電話格式不正確" };
  }

  const now = new Date();

  if (lineUserId || phone) {
    const oneMinuteAgo = new Date(now.getTime() - 60000).toISOString();
    let query = supabase.from("coffee_orders").select("id").gte(
      "created_at",
      oneMinuteAgo,
    );
    if (lineUserId) {
      query = query.eq("line_user_id", lineUserId);
    } else {
      query = query.eq("phone", phone);
    }
    const { data: recentOrders } = await query.limit(1);
    if (recentOrders && recentOrders.length > 0) {
      return { success: false, error: "送出訂單過於頻繁，請於一分鐘後再試" };
    }
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const orderId = `C${now.getFullYear()}${pad(now.getMonth() + 1)}${
    pad(now.getDate())
  }${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${
    pad(Math.floor(Math.random() * 100))
  }`;

  const { error } = await supabase.from("coffee_orders").insert({
    id: orderId,
    created_at: now.toISOString(),
    line_user_id: lineUserId,
    line_name: String(data.lineName).trim(),
    phone,
    email: String(data.email || "").trim(),
    items: ordersText,
    total,
    delivery_method: deliveryMethod,
    city: data.city || "",
    district: data.district || "",
    address: data.address || "",
    store_type: deliveryMethod === "seven_eleven"
      ? "7-11"
      : deliveryMethod === "family_mart"
      ? "全家"
      : "",
    store_id: data.storeId || "",
    store_name: data.storeName || "",
    store_address: data.storeAddress || "",
    status: "pending",
    note: data.note || "",
    custom_fields: data.customFields || "",
    payment_method: paymentMethod,
    payment_status: paymentMethod === "cod" ? "" : "pending",
    transfer_account_last5: paymentMethod === "transfer"
      ? String(data.transferAccountLast5 || "")
      : "",
    payment_id: paymentMethod === "transfer"
      ? String(data.transferTargetAccount || "")
      : "",
  });

  if (error) return { success: false, error: error.message };

  if (lineUserId) {
    try {
      await registerOrUpdateUser({
        userId: lineUserId,
        displayName: String(data.lineName),
        pictureUrl: "",
        phone,
        email: String(data.email || "").trim(),
        deliveryMethod,
        city: String(data.city || ""),
        district: String(data.district || ""),
        address: String(data.address || ""),
        storeId: String(data.storeId || ""),
        storeName: String(data.storeName || ""),
        storeAddress: String(data.storeAddress || ""),
      });
    } catch { /* ignore */ }
  }

  if (data.email) {
    const methodMap: Record<string, string> = {
      delivery: "配送到府",
      home_delivery: "全台宅配",
      seven_eleven: "7-11 取貨/取貨付款",
      family_mart: "全家取貨/取貨付款",
      in_store: "來店自取",
    };
    const paymentMap: Record<string, string> = {
      cod: "貨到付款",
      linepay: "LINE Pay",
      transfer: "銀行轉帳",
    };
    const isDelivery = deliveryMethod === "delivery" ||
      deliveryMethod === "home_delivery";
    const deliveryText = isDelivery
      ? `${data.city}${data.district} ${data.address}`
      : `${data.storeName} (${data.storeAddress})`;
    const paymentText = paymentMap[paymentMethod] || paymentMethod;
    let transferHtml = "";
    if (paymentMethod === "transfer") {
      const targetAccount = sanitize(String(data.transferTargetAccount || ""));
      const last5 = sanitize(String(data.transferAccountLast5 || ""));
      transferHtml =
        `<br><span style="color: #D32F2F; font-size: 14px; display: inline-block; margin-top: 4px;">請匯款至：${targetAccount}<br>您的帳號後五碼：${last5}</span>`;
    }

    let customFieldsHtml = "";
    if (data.customFields && typeof data.customFields === "string") {
      try {
        const parsedFields = JSON.parse(data.customFields);
        if (Object.keys(parsedFields).length > 0) {
          customFieldsHtml =
            '<h3 style="color: #6F4E37; border-bottom: 2px solid #e5ddd5; padding-bottom: 8px; margin-top: 20px;">其他資訊</h3>';
          for (const [key, val] of Object.entries(parsedFields)) {
            customFieldsHtml += `<p style="margin: 0 0 5px 0;"><strong>${
              sanitize(key)
            }：</strong> ${sanitize(String(val))}</p>`;
          }
        }
      } catch {
        customFieldsHtml =
          `<p style="margin: 10px 0 0 0;"><strong>其他資訊：</strong> ${
            sanitize(data.customFields)
          }</p>`;
      }
    }

    const content = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  <div style="background-color: #6F4E37; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">☕ 咖啡訂購確認</h1>
  </div>
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
      sanitize(data.lineName)
    }，您的訂單已成立！</h2>
    <p>感謝您的訂購，我們已收到您的訂單資訊，將盡速為您安排出貨。</p>
    <div style="background-color: #f9f6f0; border-left: 4px solid #6F4E37; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${orderId}</p>
      <p style="margin: 0 0 10px 0;"><strong>聯絡電話：</strong> ${
      sanitize(phone)
    }</p>
      <p style="margin: 0 0 10px 0;"><strong>配送方式：</strong> ${
      methodMap[deliveryMethod] || deliveryMethod
    }<br><span style="color: #666; font-size: 14px;">${
      sanitize(deliveryText)
    }</span></p>
      <p style="margin: 0 0 10px 0;"><strong>付款方式：</strong> ${paymentText}${transferHtml}</p>
      <p style="margin: 0;"><strong>訂單備註：</strong> ${
      sanitize(data.note) || "無"
    }</p>
    </div>
    ${customFieldsHtml}
    <h3 style="color: #6F4E37; border-bottom: 2px solid #e5ddd5; padding-bottom: 8px; margin-top: 30px;">訂單明細</h3>
    <pre style="font-family: inherit; background-color: #faf9f7; padding: 15px; border: 1px solid #e5ddd5; border-radius: 5px; white-space: pre-wrap; font-size: 14px; color: #444; margin-top: 10px;">${
      sanitize(ordersText)
    }</pre>
    <div style="text-align: right; margin-top: 20px;">
      <h3 style="color: #e63946; font-size: 22px; margin: 0;">總金額：$${total}</h3>
    </div>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>`;
    await sendEmail(
      String(data.email),
      `[咖啡訂購] 訂單編號 ${orderId} 成立確認信`,
      content,
    );
    if (SMTP_USER) {
      await sendEmail(
        SMTP_USER,
        `[新訂單通知] 訂單編號 ${orderId} 成立`,
        content,
      );
    }
  }

  if (paymentMethod === "linepay") {
    try {
      const confirmUrl =
        `${FRONTEND_URL}/main.html?lpAction=confirm&orderId=${orderId}`;
      const cancelUrl =
        `${FRONTEND_URL}/main.html?lpAction=cancel&orderId=${orderId}`;

      const reqBody = {
        amount: total,
        currency: "TWD",
        orderId: orderId,
        packages: [{
          id: "1",
          amount: total,
          products: [{
            name: `咖啡訂單 ${orderId}`,
            quantity: 1,
            price: total,
          }],
        }],
        redirectUrls: { confirmUrl, cancelUrl },
      };

      const lpRes = await requestLinePayAPI(
        "POST",
        "/v3/payments/request",
        reqBody,
      );

      if (lpRes.returnCode === "0000" && lpRes.info) {
        const transactionId = String(lpRes.info.transactionId);
        await supabase.from("coffee_orders").update({
          payment_id: transactionId,
        }).eq("id", orderId);
        return {
          success: true,
          orderId,
          total,
          paymentUrl: lpRes.info.paymentUrl?.web ||
            lpRes.info.paymentUrl?.app || "",
          transactionId,
        };
      } else {
        await supabase.from("coffee_orders").update({
          payment_status: "failed",
        }).eq("id", orderId);
        return {
          success: false,
          error: `LINE Pay 請求失敗: ${
            lpRes.returnMessage || lpRes.returnCode
          }`,
          orderId,
        };
      }
    } catch (e) {
      await supabase.from("coffee_orders").update({ payment_status: "failed" })
        .eq("id", orderId);
      return {
        success: false,
        error: "LINE Pay 付款請求失敗: " + String(e),
        orderId,
      };
    }
  }

  return { success: true, message: "訂單已送出", orderId, total };
}

export async function getOrders(req: Request) {
  await requireAdmin(req);
  const { data, error } = await supabase.from("coffee_orders").select("*")
    .order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  const orders = (data || []).map((r: Record<string, unknown>) => ({
    orderId: r.id,
    timestamp: r.created_at,
    lineName: r.line_name,
    phone: r.phone,
    email: r.email,
    items: r.items,
    total: r.total,
    deliveryMethod: r.delivery_method,
    city: r.city,
    district: r.district,
    address: r.address,
    storeType: r.store_type,
    storeId: r.store_id,
    storeName: r.store_name,
    storeAddress: r.store_address,
    status: r.status,
    note: r.note,
    lineUserId: r.line_user_id,
    paymentMethod: r.payment_method || "cod",
    paymentStatus: r.payment_status || "",
    paymentId: r.payment_id || "",
    transferAccountLast5: r.transfer_account_last5 || "",
    trackingNumber: r.tracking_number || "",
  }));
  return { success: true, orders };
}

export async function getMyOrders(req: Request) {
  const auth = await requireAuth(req);
  const { data } = await supabase.from("coffee_orders").select("*").eq(
    "line_user_id",
    auth.userId,
  ).order("created_at", { ascending: false });
  const orders = (data || []).map((r: Record<string, unknown>) => ({
    orderId: r.id,
    timestamp: r.created_at,
    items: r.items,
    total: r.total,
    deliveryMethod: r.delivery_method,
    status: r.status,
    storeName: r.store_name,
    storeAddress: r.store_address,
    city: r.city,
    address: r.address,
    paymentMethod: r.payment_method || "cod",
    paymentStatus: r.payment_status || "",
    trackingNumber: r.tracking_number || "",
  }));
  return { success: true, orders };
}

export async function updateOrderStatus(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);

  const newStatus = String(data.status);
  if (!VALID_ORDER_STATUSES.includes(newStatus)) {
    return {
      success: false,
      error: "無效的訂單狀態，允許值：" + VALID_ORDER_STATUSES.join(", "),
    };
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (data.paymentStatus) {
    updates.payment_status = String(data.paymentStatus);
  }
  if (data.trackingNumber !== undefined) {
    updates.tracking_number = String(data.trackingNumber);
  }

  const { data: orderData } = await supabase.from("coffee_orders").select(
    "email, line_name, delivery_method, city, district, address, store_name, store_address, payment_method, payment_status",
  ).eq("id", data.orderId).single();

  const { error } = await supabase.from("coffee_orders").update(updates).eq(
    "id",
    data.orderId,
  );
  if (error) return { success: false, error: error.message };

  if (data.status === "shipped" && orderData?.email) {
    const methodMap: Record<string, string> = {
      delivery: "配送到府",
      home_delivery: "全台宅配",
      seven_eleven: "7-11 取貨/取貨付款",
      family_mart: "全家 取貨/取貨付款",
      in_store: "來店自取",
    };

    const paymentMap: Record<string, string> = {
      cod: "貨到付款",
      linepay: "LINE Pay",
      transfer: "銀行轉帳",
    };

    const isDelivery = orderData.delivery_method === "delivery" ||
      orderData.delivery_method === "home_delivery";
    const isInStore = orderData.delivery_method === "in_store";
    let deliveryText = "";
    if (isDelivery) {
      deliveryText = `${orderData.city || ""}${orderData.district || ""} ${
        orderData.address || ""
      }`;
    } else if (!isInStore) {
      deliveryText = `${orderData.store_name || ""} (${
        orderData.store_address || ""
      })`;
    }

    const paymentText = paymentMap[orderData.payment_method] ||
      orderData.payment_method;
    const paymentStatusText = orderData.payment_status === "paid"
      ? "已付款"
      : (orderData.payment_method === "cod" ? "貨到付款" : "未付款");
    const paymentStatusColor = orderData.payment_status === "paid"
      ? "#2e7d32"
      : (orderData.payment_method === "cod" ? "#0288d1" : "#d32f2f");

    let trackingSection = "";
    if (data.trackingNumber) {
      let trackingLink = "";
      if (orderData.delivery_method === "seven_eleven") {
        trackingLink =
          `<a href="https://eservice.7-11.com.tw/e-tracking/search.aspx" target="_blank" style="display:inline-block; margin-top:8px; padding:6px 12px; background-color:#1e40af; color:#ffffff; text-decoration:none; border-radius:4px; font-size:13px;">🔗 7-11 貨態查詢</a>`;
      } else if (orderData.delivery_method === "family_mart") {
        trackingLink =
          `<a href="https://fmec.famiport.com.tw/FP_Entrance/QueryBox" target="_blank" style="display:inline-block; margin-top:8px; padding:6px 12px; background-color:#059669; color:#ffffff; text-decoration:none; border-radius:4px; font-size:13px;">🔗 全家貨態查詢</a>`;
      } else if (isDelivery) {
        trackingLink =
          `<a href="https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100" target="_blank" style="display:inline-block; margin-top:8px; padding:6px 12px; background-color:#047857; color:#ffffff; text-decoration:none; border-radius:4px; font-size:13px;">🔗 中華郵政貨態查詢</a>`;
      }
      trackingSection =
        `<p style="margin: 10px 0 0 0; padding-top: 10px; border-top: 1px dashed #dcd3cb;"><strong>物流單號：</strong> <span style="font-family:monospace; font-size:15px; font-weight:bold;">${
          sanitize(String(data.trackingNumber))
        }</span><br>${trackingLink}</p>`;
    }

    const content = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border: 1px solid #e5ddd5;">
  <div style="background-color: #6F4E37; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">📦 訂單出貨通知</h1>
  </div>
  <div style="padding: 30px; color: #333333; line-height: 1.6;">
    <h2 style="font-size: 18px; color: #6F4E37; margin-top: 0;">親愛的 ${
      sanitize(orderData.line_name)
    }，您的訂單已出貨！</h2>
    <p>這封信是要通知您，您所訂購的商品已經安排出貨！</p>
    
    <div style="background-color: #f9f6f0; border-left: 4px solid #6F4E37; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0 0 10px 0;"><strong>訂單編號：</strong> ${data.orderId}</p>
      <p style="margin: 0 0 10px 0;"><strong>配送方式：</strong> ${
      methodMap[orderData.delivery_method] || "一般配送"
    }<br><span style="color: #666; font-size: 14px;">${
      sanitize(deliveryText)
    }</span></p>
      <p style="margin: 0;"><strong>付款方式：</strong> ${paymentText} <span style="font-size: 13px; color: ${paymentStatusColor}; font-weight: bold;">(${paymentStatusText})</span></p>
      ${trackingSection}
    </div>
    
    <p style="margin-top: 30px; color: #555;">依據配送方式不同，商品預計於 1-3 個工作天內抵達。<br>若是超商取貨，屆時將有手機簡訊通知取件，請留意您的手機訊息。</p>
  </div>
  <div style="background-color: #f5f5f5; color: #888888; text-align: center; padding: 15px; font-size: 12px; border-top: 1px solid #eeeeee;">
    <p style="margin: 0;">此為系統自動發送的信件，請勿直接回覆。</p>
  </div>
</div>
        `;
    await sendEmail(
      String(orderData.email),
      `[咖啡訂購] 訂單編號 ${data.orderId} 已出貨通知`,
      content,
    );
  }

  return { success: true, message: "訂單狀態已更新" };
}

export async function deleteOrder(data: Record<string, unknown>, req: Request) {
  await requireAdmin(req);
  const { error } = await supabase.from("coffee_orders").delete().eq(
    "id",
    data.orderId,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "訂單已刪除" };
}
