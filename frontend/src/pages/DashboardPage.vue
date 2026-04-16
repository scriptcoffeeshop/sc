<template>
    <!-- 登入頁 -->
    <UiCard id="login-page" class="max-w-md mx-auto mt-20 p-8 text-center">
      <img
        id="dashboard-login-logo"
        src="../../../icons/logo.png"
        alt="品牌圖示"
        class="w-14 h-14 mx-auto mb-4"
      >
      <h1 class="text-2xl font-bold mb-2 text-slate-800">
        後台登入
      </h1>
      <p class="text-slate-600 mb-6">僅限管理員登入</p>
      <UiButton
        data-action="login-with-line"
        class="h-11 px-6 bg-[#06c755] hover:bg-[#05b84e]"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
          />
        </svg>
        使用 LINE 登入
      </UiButton>
    </UiCard>

    <!-- 管理頁 -->
    <div id="admin-page" class="hidden max-w-6xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <img id="dashboard-header-logo" src="../../../icons/logo.png" alt="品牌圖示" class="w-9 h-9">
          <div>
            <h1 class="text-xl font-bold ui-text-highlight">
              咖啡訂購後台
            </h1>
            <p class="text-sm ui-text-subtle">
              歡迎，<span id="admin-name"></span>
            </p>
          </div>
        </div>
        <button
          data-action="logout"
          class="text-sm ui-text-subtle hover:ui-text-danger"
        >
          登出
        </button>
      </div>

      <!-- Tabs -->
      <TabsRoot default-value="orders" class="mb-6">
        <TabsList class="flex gap-2 overflow-x-auto pb-2 ui-tab-strip">
          <TabsTrigger value="orders" as-child>
            <button
              id="tab-orders"
              data-tab="orders"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/orders-list.png" alt="" class="ui-icon-inline">訂單管理</span>
            </button>
          </TabsTrigger>
          <TabsTrigger value="products" as-child>
            <button
              id="tab-products"
              data-tab="products"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/products-beans.png" alt="" class="ui-icon-inline">商品管理</span>
            </button>
          </TabsTrigger>
          <TabsTrigger value="categories" as-child>
            <button
              id="tab-categories"
              data-tab="categories"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/categories-folder.png" alt="" class="ui-icon-inline">分類管理</span>
            </button>
          </TabsTrigger>
          <TabsTrigger value="promotions" as-child>
            <button
              id="tab-promotions"
              data-tab="promotions"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/promotions-gift.png" alt="" class="ui-icon-inline">促銷活動</span>
            </button>
          </TabsTrigger>
          <TabsTrigger value="settings" as-child>
            <button
              id="tab-settings"
              data-tab="settings"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/settings-gear.png" alt="" class="ui-icon-inline">系統設定</span>
            </button>
          </TabsTrigger>
          <TabsTrigger value="icon-library" as-child>
            <button
              id="tab-icon-library"
              data-tab="icon-library"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/section-tag.png" alt="" class="ui-icon-inline">Icon 素材庫</span>
            </button>
          </TabsTrigger>
          <TabsTrigger value="formfields" as-child>
            <button
              id="tab-formfields"
              data-tab="formfields"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/form-fields.png" alt="" class="ui-icon-inline">表單管理</span>
            </button>
          </TabsTrigger>
          <TabsTrigger value="users" as-child>
            <button
              id="tab-users"
              data-tab="users"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/users-group.png" alt="" class="ui-icon-inline">用戶管理</span>
            </button>
          </TabsTrigger>
          <TabsTrigger value="blacklist" as-child>
            <button
              id="tab-blacklist"
              data-tab="blacklist"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-white ui-text-strong whitespace-nowrap"
            >
              <span class="tab-with-icon"><img src="../../../icons/blacklist-shield.png" alt="" class="ui-icon-inline">黑名單</span>
            </button>
          </TabsTrigger>
        </TabsList>
      </TabsRoot>

      <!-- ===== 訂單管理 ===== -->
      <div id="orders-section" class="glass-card p-6 hidden">
        <div class="flex flex-col gap-4 mb-4">
          <div class="flex justify-between items-center gap-3 flex-wrap">
            <h2 class="text-lg font-bold ui-text-highlight">
              訂單列表
            </h2>
            <div class="flex gap-2 items-center">
              <button
                data-action="show-flex-history"
                class="text-sm px-3 py-1 rounded-lg border"
                
                title="LINE Flex Message 歷史紀錄"
              >
                📋 Flex 歷史
              </button>
              <button
                data-action="reload-orders"
                class="text-sm ui-text-highlight"
              >
                <span class="tab-with-icon"><img src="../../../icons/refresh-sync.png" alt="" class="ui-icon-inline">重整</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <select
              id="order-filter"
              data-order-filter
              class="input-field text-sm py-2"
            >
              <option value="all">訂單狀態：全部</option>
              <option value="pending">訂單狀態：待處理</option>
              <option value="processing">訂單狀態：處理中</option>
              <option value="shipped">訂單狀態：已出貨</option>
              <option value="completed">訂單狀態：已完成</option>
              <option value="cancelled">訂單狀態：已取消</option>
            </select>
            <select
              id="order-payment-filter"
              data-order-filter
              class="input-field text-sm py-2"
            >
              <option value="all">付款方式：全部</option>
              <option value="cod">貨到/取貨付款</option>
              <option value="linepay">LINE Pay</option>
              <option value="jkopay">街口支付</option>
              <option value="transfer">轉帳</option>
            </select>
            <select
              id="order-payment-status-filter"
              data-order-filter
              class="input-field text-sm py-2"
            >
              <option value="all">付款狀態：全部</option>
              <option value="pending">待付款</option>
              <option value="paid">已付款</option>
              <option value="failed">付款失敗</option>
              <option value="cancelled">付款取消</option>
              <option value="refunded">已退款</option>
              <option value="empty">未設定</option>
            </select>
            <select
              id="order-delivery-filter"
              data-order-filter
              class="input-field text-sm py-2"
            >
              <option value="all">配送方式：全部</option>
              <option value="delivery">配送到府</option>
              <option value="home_delivery">全台宅配</option>
              <option value="seven_eleven">7-11 取件</option>
              <option value="family_mart">全家取件</option>
              <option value="in_store">來店取貨</option>
            </select>
            <input
              id="order-date-from"
              data-order-filter
              type="date"
              class="input-field text-sm py-2"
              placeholder="起始日期"
            >
            <input
              id="order-date-to"
              data-order-filter
              type="date"
              class="input-field text-sm py-2"
              placeholder="結束日期"
            >
            <input
              id="order-amount-min"
              data-order-filter
              type="number"
              min="0"
              class="input-field text-sm py-2"
              placeholder="最低金額"
            >
            <input
              id="order-amount-max"
              data-order-filter
              type="number"
              min="0"
              class="input-field text-sm py-2"
              placeholder="最高金額"
            >
          </div>

          <div
            class="flex flex-wrap gap-2 items-center p-3 rounded-lg bg-white border"
            
          >
            <label
              class="inline-flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                id="orders-select-all"
                data-action="toggle-select-all-orders"
                class="w-4 h-4"
              >
              全選目前篩選結果
            </label>
            <span id="orders-selected-count" class="text-sm ui-text-strong"
            >已選 0 筆</span>
            <select
              id="batch-order-status"
              class="input-field text-sm py-1"
              style="width: auto"
            >
              <option value="">批次狀態</option>
              <option value="pending">待處理</option>
              <option value="processing">處理中</option>
              <option value="shipped">已出貨</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <select
              id="batch-payment-status"
              class="input-field text-sm py-1"
              style="width: auto"
            >
              <option value="__keep__">付款狀態：維持不變</option>
              <option value="pending">付款待處理</option>
              <option value="paid">付款完成</option>
              <option value="failed">付款失敗</option>
              <option value="cancelled">付款取消</option>
              <option value="refunded">已退款</option>
              <option value="">清空付款狀態</option>
            </select>
            <button
              data-action="batch-update-orders"
              class="btn-primary text-sm py-2 px-4"
            >
              批次更新
            </button>
            <button
              data-action="batch-delete-orders"
              class="text-sm px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              批次刪除
            </button>
            <button
              data-action="export-orders-csv"
              class="text-sm px-4 py-2 rounded-lg border ui-border text-blue-700 hover:ui-primary-soft"
            >
              匯出篩選 CSV
            </button>
            <button
              data-action="export-selected-orders-csv"
              class="text-sm px-4 py-2 rounded-lg border ui-border text-blue-700 hover:ui-primary-soft"
            >
              匯出勾選 CSV
            </button>
          </div>
        </div>
        <div id="orders-summary" class="text-sm ui-text-strong mb-3"></div>
        <div id="orders-list" data-vue-managed="true">
          <p v-if="ordersView.length === 0" class="text-center ui-text-subtle py-8">
            沒有符合的訂單
          </p>
          <template v-else>
            <div
              v-for="order in ordersView"
              :key="order.orderId"
              class="border rounded-xl p-4 mb-3"
              
            >
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <label class="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      data-action="toggle-order-selection"
                      :data-order-id="order.orderId"
                      class="w-4 h-4"
                      :checked="order.isSelected"
                    >
                  </label>
                  <span class="font-bold text-sm" style="color:var(--primary)">#{{ order.orderId }}</span>
                  <span class="delivery-tag" :class="`delivery-${order.deliveryMethod}`">
                    {{ order.deliveryLabel }}
                  </span>
                  <span class="status-badge" :class="`status-${order.status}`">
                    {{ order.statusLabel }}
                  </span>
                  <span
                    v-if="order.paymentMethod !== 'cod'"
                    class="text-xs px-2 py-0.5 rounded-full"
                    :class="order.payBadgeClass"
                  >
                    {{ order.paymentMethodLabel }} {{ order.paymentStatusLabel }}
                  </span>
                </div>
                <span class="text-xs ui-text-subtle">{{ order.timestampText }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-sm mb-2">
                <div><span class="ui-text-subtle">顧客：</span>{{ order.lineName }}</div>
                <div><span class="ui-text-subtle">電話：</span>{{ order.phone }}</div>
                <div class="col-span-2">
                  <span class="ui-text-subtle">信箱：</span>
                  <a v-if="order.email" :href="`mailto:${order.email}`" class="ui-text-highlight">
                    {{ order.email }}
                  </a>
                  <span v-else>無</span>
                </div>
                <div class="col-span-2">
                  <span class="ui-text-subtle">地址/門市：</span>{{ order.addressInfo }}
                </div>
                <div v-if="order.showTransferInfo" class="col-span-2 text-xs text-blue-800 mt-2 ui-primary-soft p-2 rounded">
                  <div><b>顧客匯出末5碼:</b> {{ order.transferAccountLast5 || "未提供" }}</div>
                  <div class="mt-1 pb-1"><b>匯入目標帳號:</b> {{ order.paymentId || "未提供 (舊版訂單)" }}</div>
                </div>
              </div>

              <div
                v-if="order.hasShippingInfo"
                class="text-xs bg-gray-100 p-2 rounded mt-2 border ui-border"
              >
                <div v-if="order.shippingProvider">
                  <span class="ui-text-subtle">物流商：</span>{{ order.shippingProvider }}
                </div>
                <div v-if="order.trackingNumber" class="mt-1">
                  <span class="ui-text-subtle">物流單號：</span>
                  <span class="font-mono font-bold">{{ order.trackingNumber }}</span>
                  <button
                    type="button"
                    data-action="copy-tracking-number"
                    :data-tracking-number="order.trackingNumber"
                    class="ml-2 px-2 py-0.5 bg-gray-200 hover:bg-gray-300 rounded ui-text-strong"
                    title="複製單號"
                  >
                    複製
                  </button>
                </div>
                <div v-if="order.trackingLinkUrl" class="mt-1">
                  <a
                    :href="order.trackingLinkUrl"
                    target="_blank"
                    class="text-xs ui-text-highlight hover:underline"
                  >
                    {{ order.trackingLinkLabel }}
                  </a>
                </div>
              </div>

              <div class="text-sm ui-text-strong whitespace-pre-line ui-bg-soft p-3 rounded mb-2 mt-2">
                {{ order.items }}
              </div>
              <div
                v-if="order.showReceiptInfo && order.receiptInfo"
                class="text-xs text-amber-800 bg-amber-50 p-2 rounded mb-2 border border-amber-100"
              >
                <div><span class="ui-text-subtle">統一編號：</span>{{ order.receiptInfo.taxId || "未填寫" }}</div>
                <div><span class="ui-text-subtle">收據買受人：</span>{{ order.receiptInfo.buyer || "未填寫" }}</div>
                <div><span class="ui-text-subtle">收據地址：</span>{{ order.receiptInfo.address || "未填寫" }}</div>
                <div>
                  <span class="ui-text-subtle">壓印日期：</span>{{
                    order.receiptInfo.needDateStamp ? "需要" : "不需要"
                  }}
                </div>
              </div>
              <div
                v-if="order.note"
                class="text-sm text-amber-700 bg-amber-50 p-2 rounded mb-2"
              >
                {{ order.note }}
              </div>
              <div
                v-if="order.showCancellationReason"
                class="text-sm text-red-700 bg-red-50 p-2 rounded mb-2 border border-red-100"
              >
                <span class="ui-text-subtle">取消原因：</span>{{ order.cancelReason }}
              </div>

              <div class="flex justify-between items-center">
                <span class="font-bold" style="color:var(--accent)">${{ order.total }}</span>
                <div class="flex gap-2">
                  <button
                    v-if="order.showSendLineButton"
                    data-action="send-order-flex"
                    :data-order-id="order.orderId"
                    class="text-xs text-emerald-700 hover:text-emerald-900"
                  >
                    LINE通知
                  </button>
                  <button
                    v-if="order.showSendEmailButton"
                    data-action="send-order-email"
                    :data-order-id="order.orderId"
                    class="text-xs ui-text-strong hover:opacity-80"
                  >
                    發送信件
                  </button>
                  <button
                    v-if="order.showRefundButton"
                    data-action="refund-linepay-order"
                    :data-order-id="order.orderId"
                    class="text-xs text-purple-600 hover:text-purple-800 tab-with-icon"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6l-3 2" /></svg>退款
                  </button>
                  <button
                    v-if="order.showConfirmTransferButton"
                    data-action="confirm-transfer-payment"
                    :data-order-id="order.orderId"
                    class="text-xs ui-text-success hover:text-green-800"
                  >
                    確認已收款
                  </button>
                  <select
                    data-action="change-order-status"
                    :data-order-id="order.orderId"
                    :data-current-status="order.status"
                    class="text-xs border rounded px-2 py-1"
                    :value="order.status"
                  >
                    <option
                      v-for="status in ordersStatusOptions"
                      :key="`${order.orderId}-${status}`"
                      :value="status"
                    >
                      {{ orderStatusText(status) }}
                    </option>
                  </select>
                  <button
                    data-action="confirm-order-status"
                    :data-order-id="order.orderId"
                    class="confirm-status-btn hidden text-xs px-2 py-1 rounded font-medium"
                    style="background:#6F4E37; color:#fff;"
                  >
                    確認
                  </button>
                  <button
                    data-action="delete-order"
                    :data-order-id="order.orderId"
                    class="text-xs ui-text-danger hover:text-red-700"
                  >
                    刪除
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ===== 商品管理 ===== -->
      <div id="products-section" class="glass-card p-6 hidden">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold ui-text-highlight">
            咖啡豆商品
          </h2>
          <button data-action="show-product-modal" class="btn-primary text-sm">
            + 新增商品
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full" id="products-main-table" data-vue-managed="true">
            <thead>
              <tr class="border-b-2 ui-border">
                <th class="p-3 text-left w-10 ui-text-highlight">
                  排序
                </th>
                <th class="p-3 text-left ui-text-highlight">
                  分類
                </th>
                <th class="p-3 text-left ui-text-highlight">
                  品名
                </th>
                <th class="p-3 text-right ui-text-highlight">
                  價格
                </th>
                <th class="p-3 text-center ui-text-highlight">
                  狀態
                </th>
                <th class="p-3 text-center ui-text-highlight">
                  操作
                </th>
              </tr>
            </thead>
            <tbody v-if="productsGroupsView.length === 0">
              <tr>
                <td colspan="6" class="text-center py-8 ui-text-subtle">
                  尚無商品
                </td>
              </tr>
            </tbody>
            <template v-else>
              <tbody
                v-for="group in productsGroupsView"
                :key="`products-${group.category}`"
                class="sortable-tbody"
                :data-cat="group.category"
              >
                <tr
                  v-for="product in group.items"
                  :key="`product-${product.id}`"
                  class="border-b"
                  style="border-color:#f0e6db;"
                  :data-id="product.id"
                >
                  <td class="p-3 text-center">
                    <span
                      class="drag-handle cursor-move ui-text-muted hover:text-amber-700 text-xl font-bold select-none px-2 inline-block"
                      title="拖曳排序"
                      style="touch-action: none;"
                    ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
                  </td>
                  <td class="p-3 text-sm">{{ product.category }}</td>
                  <td class="p-3">
                    <div class="font-medium mb-1">{{ product.name }}</div>
                    <div class="text-xs ui-text-subtle">
                      {{ product.description }}<span v-if="product.roastLevel">・{{ product.roastLevel }}</span>
                    </div>
                  </td>
                  <td class="p-3 text-right font-medium">
                    <template v-for="(line, lineIndex) in product.priceLines" :key="`product-${product.id}-price-${lineIndex}`">
                      <div v-if="line.isSpec" class="text-xs">{{ line.label }}: ${{ line.price }}</div>
                      <span v-else>${{ line.price }}</span>
                    </template>
                  </td>
                  <td class="p-3 text-center">
                    <button
                      data-action="toggle-product-enabled"
                      :data-product-id="product.id"
                      :data-enabled="String(!product.enabled)"
                      class="text-sm font-medium hover:underline"
                      :class="product.statusClass"
                    >
                      {{ product.statusLabel }}
                    </button>
                  </td>
                  <td class="p-3 text-center">
                    <button
                      data-action="edit-product"
                      :data-product-id="product.id"
                      class="text-sm mr-2"
                      style="color:var(--primary)"
                    >
                      編輯
                    </button>
                    <button
                      data-action="delete-product"
                      :data-product-id="product.id"
                      class="text-sm ui-text-danger"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              </tbody>
            </template>
          </table>
        </div>
      </div>

      <!-- ===== 分類管理 ===== -->
      <div id="categories-section" class="glass-card p-6 hidden">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold ui-text-highlight">
            商品分類
          </h2>
        </div>
        <div class="flex gap-2 mb-4">
          <input
            type="text"
            id="new-cat-name"
            class="input-field flex-grow"
            placeholder="新分類名稱"
          >
          <button data-action="add-category" class="btn-primary text-sm">
            新增
          </button>
        </div>
        <div id="categories-list" data-vue-managed="true">
          <p v-if="categoriesView.length === 0" class="text-center ui-text-subtle py-4">
            尚無分類
          </p>
          <template v-else>
            <div
              v-for="category in categoriesView"
              :key="`category-${category.id}`"
              class="flex items-center justify-between p-3 mb-2 rounded-lg"
              style="background:#faf6f2; border:1px solid #e5ddd5;"
              :data-id="category.id"
            >
              <div class="flex items-center gap-2">
                <span
                  class="drag-handle-cat cursor-move ui-text-muted hover:text-amber-700 text-xl font-bold select-none px-1"
                  title="拖曳排序"
                  style="touch-action: none;"
                ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
                <span class="font-medium">{{ category.name }}</span>
              </div>
              <div class="flex gap-2">
                <button
                  data-action="edit-category"
                  :data-category-id="category.id"
                  class="text-sm"
                  style="color:var(--primary)"
                >
                  編輯
                </button>
                <button
                  data-action="delete-category"
                  :data-category-id="category.id"
                  class="text-sm ui-text-danger"
                >
                  刪除
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ===== 促銷活動 ===== -->
      <div id="promotions-section" class="glass-card p-6 hidden">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold ui-text-highlight">
            促銷活動管理
          </h2>
          <button
            data-action="show-promotion-modal"
            class="btn-primary text-sm"
          >
            + 新增活動
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 ui-border">
                <th
                  class="p-3 text-left w-10 text-center ui-text-highlight"
                >
                  排序
                </th>
                <th class="p-3 text-left ui-text-highlight">
                  活動名稱
                </th>
                <th class="p-3 text-left ui-text-highlight">
                  條件與折扣
                </th>
                <th class="p-3 text-center w-24 ui-text-highlight">
                  狀態
                </th>
                <th class="p-3 text-right w-32 ui-text-highlight">
                  操作
                </th>
              </tr>
            </thead>
            <tbody
              id="promotions-table"
              class="sortable-tbody"
              data-vue-managed="true"
            >
              <tr v-if="promotionsView.length === 0">
                <td colspan="5" class="text-center py-8 ui-text-subtle">
                  尚無活動
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="promotion in promotionsView"
                  :key="`promotion-${promotion.id}`"
                  class="border-b"
                  style="border-color:#f0e6db;"
                  :data-id="promotion.id"
                >
                  <td class="p-3 text-center">
                    <span
                      class="drag-handle-promo cursor-move ui-text-muted hover:text-amber-700 text-xl font-bold select-none px-2 inline-block"
                      title="拖曳排序"
                      style="touch-action: none;"
                    ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
                  </td>
                  <td class="p-3 font-medium">{{ promotion.name }}</td>
                  <td class="p-3 text-sm ui-text-strong">
                    {{ promotion.conditionText }} <span class="font-bold ui-text-danger">{{ promotion.discountText }}</span>
                  </td>
                  <td class="p-3 text-center">
                    <button
                      data-action="toggle-promotion-enabled"
                      :data-promotion-id="promotion.id"
                      :data-enabled="String(!promotion.enabled)"
                      class="text-sm font-medium hover:underline"
                      :class="promotion.statusClass"
                    >
                      {{ promotion.statusLabel }}
                    </button>
                  </td>
                  <td class="p-3 text-right">
                    <button
                      data-action="edit-promotion"
                      :data-promotion-id="promotion.id"
                      class="text-sm mr-2"
                      style="color:var(--primary)"
                    >
                      編輯
                    </button>
                    <button
                      data-action="delete-promotion"
                      :data-promotion-id="promotion.id"
                      class="text-sm ui-text-danger"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== 用戶管理 ===== -->
      <div id="users-section" class="glass-card p-6 hidden">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold ui-text-highlight">
            用戶管理
          </h2>
          <div class="flex gap-2 items-center">
            <input
              type="text"
              id="user-search"
              class="input-field text-sm py-1"
              placeholder="搜尋名稱/手機/Email"
            >
            <button
              data-action="search-users"
              class="btn-primary text-sm py-1 px-4"
            >
              搜尋
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 ui-border">
                <th class="p-3 text-left w-12 ui-text-highlight">
                  頭像
                </th>
                <th class="p-3 text-left ui-text-highlight">
                  用戶資訊
                </th>
                <th class="p-3 text-left ui-text-highlight">
                  角色與狀態
                </th>
                <th class="p-3 text-right ui-text-highlight">
                  操作
                </th>
              </tr>
            </thead>
            <tbody id="users-table" data-vue-managed="true">
              <tr v-if="usersView.length === 0">
                <td colspan="4" class="text-center py-8 ui-text-subtle">
                  無符合條件的用戶
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="user in usersView"
                  :key="`user-${user.userId}`"
                  class="border-b"
                  style="border-color:#f0e6db;"
                >
                  <td class="p-3">
                    <img
                      :src="user.pictureUrl"
                      class="w-10 h-10 rounded-full border"
                    >
                  </td>
                  <td class="p-3">
                    <div class="font-medium ui-text-strong">{{ user.displayName }}</div>
                    <div class="text-xs ui-text-subtle">
                      {{ user.email }}<span v-if="user.phone">・{{ user.phone }}</span>
                    </div>
                    <div class="text-xs ui-text-subtle mt-1">{{ user.defaultDeliveryText }}</div>
                    <div class="text-xs ui-text-muted font-mono mt-1 opacity-50">{{ user.userId }}</div>
                  </td>
                  <td class="p-3">
                    <div>
                      <span
                        class="px-2 py-0.5 rounded text-xs font-medium"
                        :class="user.roleBadgeClass"
                      >
                        {{ user.roleBadgeText }}
                      </span>
                    </div>
                    <div class="mt-1">
                      <span
                        class="px-2 py-0.5 rounded text-xs font-medium"
                        :class="user.statusBadgeClass"
                      >
                        {{ user.statusBadgeText }}
                      </span>
                    </div>
                    <div class="text-xs ui-text-muted mt-1">登入：{{ user.lastLoginText }}</div>
                  </td>
                  <td class="p-3 text-right">
                    <button
                      data-action="toggle-user-blacklist"
                      :data-user-id="user.userId"
                      :data-blocked="user.blacklistActionBlockedValue"
                      class="text-sm font-medium mr-3"
                      :class="user.blacklistActionClass"
                    >
                      {{ user.blacklistActionLabel }}
                    </button>
                    <button
                      v-if="user.roleAction"
                      data-action="toggle-user-role"
                      :data-user-id="user.userId"
                      :data-new-role="user.roleAction.newRole"
                      class="text-sm font-medium"
                      :class="user.roleAction.className"
                    >
                      {{ user.roleAction.label }}
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== 黑名單 ===== -->
      <div id="blacklist-section" class="glass-card p-6 hidden">
        <h2 class="text-lg font-bold mb-4 ui-text-highlight">
          黑名單
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b-2 ui-border">
                <th class="p-3 text-left ui-text-highlight">
                  用戶名稱
                </th>
                <th class="p-3 text-left ui-text-highlight">
                  封鎖時間與原因
                </th>
                <th class="p-3 text-right ui-text-highlight">
                  操作
                </th>
              </tr>
            </thead>
            <tbody id="blacklist-table" data-vue-managed="true">
              <tr v-if="blacklistView.length === 0">
                <td colspan="3" class="text-center py-8 ui-text-subtle">
                  目前沒有封鎖名單
                </td>
              </tr>
              <template v-else>
                <tr
                  v-for="blacklistEntry in blacklistView"
                  :key="`blacklist-${blacklistEntry.lineUserId}`"
                  class="border-b"
                  style="border-color:#f0e6db;"
                >
                  <td class="p-3">
                    <div class="font-medium">{{ blacklistEntry.displayName }}</div>
                    <div class="text-xs ui-text-muted font-mono">{{ blacklistEntry.lineUserId }}</div>
                  </td>
                  <td class="p-3">
                    <div class="text-sm">{{ blacklistEntry.blockedAtText }}</div>
                    <div class="text-xs ui-text-danger mt-1">{{ blacklistEntry.reasonText }}</div>
                  </td>
                  <td class="p-3 text-right">
                    <button
                      data-action="toggle-user-blacklist"
                      :data-user-id="blacklistEntry.lineUserId"
                      data-blocked="false"
                      class="ui-text-success hover:text-green-800 text-sm font-medium"
                    >
                      解除封鎖
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ===== 系統設定 ===== -->
      <div id="settings-section" class="glass-card p-6 hidden">
        <h2 class="text-lg font-bold mb-6 ui-text-highlight">
          系統設定
        </h2>

        <!-- 品牌設定 -->
        <div
          class="mb-6 p-4 bg-white rounded-xl border"
          
        >
          <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
            <img id="settings-brand-logo" src="../../../icons/logo.png" alt="" class="ui-icon-inline-lg">
            品牌設定
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm ui-text-strong mb-1">網站標題</label>
              <input
                type="text"
                id="s-site-title"
                class="input-field"
                placeholder="Script Coffee"
              >
            </div>
            <div>
              <label class="block text-sm ui-text-strong mb-1">副標題</label>
              <input
                type="text"
                id="s-site-subtitle"
                class="input-field"
                placeholder="咖啡豆 | 耳掛"
              >
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm ui-text-strong mb-1"
              >備援文字圖示（可留空）</label>
              <input
                type="text"
                id="s-site-emoji"
                class="input-field"
                placeholder="例如：品牌"
              >
            </div>
            <div>
              <label class="block text-sm ui-text-strong mb-1"
              >品牌 Icon（使用本地 icons/logo.png）</label>
              <div class="flex gap-2 items-center">
                <img
                  src="../../../icons/logo.png"
                  alt="品牌圖示"
                  class="icon-upload-preview"
                >
                <span class="text-xs ui-text-muted">icons/logo.png</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 區塊標題 -->
        <div
          class="mb-6 p-4 bg-white rounded-xl border"
          
        >
          <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
            <img src="../../../icons/section-tag.png" alt="" class="ui-icon-inline-lg">
            區塊標題樣式設定
          </h3>

          <!-- 商品區塊 -->
          <div class="mb-4 border-b pb-4" >
            <div class="flex justify-between items-center mb-1">
              <label class="block text-sm font-medium ui-text-strong"
              >商品區塊</label>
              <button
                type="button"
                data-action="reset-section-title"
                data-section="products"
                class="text-xs ui-text-highlight hover:text-blue-700"
              >
                恢復預設
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <input type="hidden" id="s-products-icon-url">
              <input
                type="file"
                id="s-products-icon-file"
                accept="image/*"
                class="text-sm icon-upload-input"
                data-preview-target="s-products-icon-preview"
                data-fallback-key="products"
              >
              <img
                id="s-products-icon-preview"
                src=""
                alt=""
                class="icon-upload-preview hidden"
              >
              <button
                type="button"
                data-action="upload-section-icon"
                data-section="products"
                class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
              >
                上傳區塊圖示
              </button>
              <span
                id="s-products-icon-url-display"
                class="text-[11px] ui-text-muted truncate max-w-[250px]"
              ></span>
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                id="s-products-title"
                class="input-field flex-1 min-w-[150px]"
                placeholder="咖啡豆選購"
              >
              <input
                type="color"
                id="s-products-color"
                value=""
                class="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
                title="文字顏色"
              >
              <select
                id="s-products-size"
                class="input-field w-24"
                title="文字大小"
              >
                <option value="text-base">16px (標準)</option>
                <option value="text-lg">18px (稍大)</option>
                <option value="text-xl">20px (大)</option>
                <option value="text-2xl">24px (特大)</option>
              </select>
              <label
                class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border"
              ><input
                  type="checkbox"
                  id="s-products-bold"
                > 粗體</label>
            </div>
          </div>

          <!-- 配送區塊 -->
          <div class="mb-4 border-b pb-4" >
            <div class="flex justify-between items-center mb-1">
              <label class="block text-sm font-medium ui-text-strong"
              >配送區塊</label>
              <button
                type="button"
                data-action="reset-section-title"
                data-section="delivery"
                class="text-xs ui-text-highlight hover:text-blue-700"
              >
                恢復預設
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <input type="hidden" id="s-delivery-icon-url">
              <input
                type="file"
                id="s-delivery-icon-file"
                accept="image/*"
                class="text-sm icon-upload-input"
                data-preview-target="s-delivery-icon-preview"
                data-fallback-key="delivery"
              >
              <img
                id="s-delivery-icon-preview"
                src=""
                alt=""
                class="icon-upload-preview hidden"
              >
              <button
                type="button"
                data-action="upload-section-icon"
                data-section="delivery"
                class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
              >
                上傳區塊圖示
              </button>
              <span
                id="s-delivery-icon-url-display"
                class="text-[11px] ui-text-muted truncate max-w-[250px]"
              ></span>
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                id="s-delivery-title"
                class="input-field flex-1 min-w-[150px]"
                placeholder="配送方式"
              >
              <input
                type="color"
                id="s-delivery-color"
                value=""
                class="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
                title="文字顏色"
              >
              <select
                id="s-delivery-size"
                class="input-field w-24"
                title="文字大小"
              >
                <option value="text-base">16px (標準)</option>
                <option value="text-lg">18px (稍大)</option>
                <option value="text-xl">20px (大)</option>
                <option value="text-2xl">24px (特大)</option>
              </select>
              <label
                class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border"
              ><input
                  type="checkbox"
                  id="s-delivery-bold"
                > 粗體</label>
            </div>
          </div>

          <!-- 備註區塊 -->
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="block text-sm font-medium ui-text-strong"
              >備註區塊</label>
              <button
                type="button"
                data-action="reset-section-title"
                data-section="notes"
                class="text-xs ui-text-highlight hover:text-blue-700"
              >
                恢復預設
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <input type="hidden" id="s-notes-icon-url">
              <input
                type="file"
                id="s-notes-icon-file"
                accept="image/*"
                class="text-sm icon-upload-input"
                data-preview-target="s-notes-icon-preview"
                data-fallback-key="notes"
              >
              <img
                id="s-notes-icon-preview"
                src=""
                alt=""
                class="icon-upload-preview hidden"
              >
              <button
                type="button"
                data-action="upload-section-icon"
                data-section="notes"
                class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
              >
                上傳區塊圖示
              </button>
              <span
                id="s-notes-icon-url-display"
                class="text-[11px] ui-text-muted truncate max-w-[250px]"
              ></span>
            </div>
            <div class="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                id="s-notes-title"
                class="input-field flex-1 min-w-[150px]"
                placeholder="訂單備註"
              >
              <input
                type="color"
                id="s-notes-color"
                value=""
                class="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
                title="文字顏色"
              >
              <select
                id="s-notes-size"
                class="input-field w-24"
                title="文字大小"
              >
                <option value="text-base">16px (標準)</option>
                <option value="text-lg">18px (稍大)</option>
                <option value="text-xl">20px (大)</option>
                <option value="text-2xl">24px (特大)</option>
              </select>
              <label
                class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border"
              ><input
                  type="checkbox"
                  id="s-notes-bold"
                > 粗體</label>
            </div>
          </div>
        </div>

        <!-- 公告 -->
        <div
          class="mb-6 p-4 bg-white rounded-xl border"
          
        >
          <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
            <img src="../../../icons/announcement-bell.png" alt="" class="ui-icon-inline-lg">
            公告設定
          </h3>
          <label class="flex items-center gap-2 mb-3 cursor-pointer">
            <input type="checkbox" id="s-ann-enabled" class="w-4 h-4"> <span
            >啟用公告</span>
          </label>
          <UiTextarea
            id="s-announcement"
            class="input-field resize-none"
            rows="3"
            placeholder="公告內容..."
          />
        </div>

        <!-- 訂單通知 -->
        <div
          class="mb-6 p-4 bg-white rounded-xl border"
          
        >
          <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
            <img src="../../../icons/announcement-bell.png" alt="" class="ui-icon-inline-lg">
            訂單通知設定
          </h3>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="s-auto-order-email-enabled"
              class="w-4 h-4"
            >
            <span>顧客送出訂單後（待處理）自動寄送「訂單成立通知」</span>
          </label>
          <p class="text-xs ui-text-subtle mt-2">
            關閉後，系統不會在下單當下自動寄信；您仍可於訂單管理中手動寄送。
          </p>
        </div>

        <!-- 營業狀態 -->
        <div
          class="mb-6 p-4 bg-white rounded-xl border"
          
        >
          <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
            <img src="../../../icons/status-store.png" alt="" class="ui-icon-inline-lg">
            營業狀態
          </h3>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer"><input
                type="radio"
                name="s-open"
                value="true"
                class="w-4 h-4"
              > 營業中</label>
            <label class="flex items-center gap-2 cursor-pointer"><input
                type="radio"
                name="s-open"
                value="false"
                class="w-4 h-4"
              > 休息中</label>
          </div>
        </div>

        <!-- 取貨與金流設定 -->
        <div
          class="mb-6 p-4 bg-white rounded-xl border"
          
        >
          <div
            class="flex flex-col md:flex-row md:justify-between md:items-center mb-3"
          >
            <h3 class="font-semibold text-lg flex items-center ui-text-highlight">
              <img src="../../../icons/payment-card.png" alt="" class="ui-icon-inline-lg">
              取貨方式與付款對應設定
            </h3>
            <button
              type="button"
              data-action="add-delivery-option-admin"
              class="mt-2 md:mt-0 px-3 py-1 btn-primary text-white rounded transition text-sm"
            >
              + 新增取貨方式
            </button>
          </div>
          <p class="text-sm ui-text-subtle mb-4">
            您可以自由拖曳排序、修改名稱與說明，並個別設定支援哪些付款方式。設定完成後請記得「儲存設定」。
          </p>
          <div
            class="overflow-x-auto mb-4 border rounded"
            
          >
            <table class="w-full text-sm text-left whitespace-nowrap">
              <thead class="ui-bg-soft border-b" >
                <tr>
                  <th class="p-3 font-medium ui-text-strong w-10 text-center">
                    排序
                  </th>
                  <th class="p-3 font-medium ui-text-strong">
                    圖示與名稱 / 說明
                  </th>
                  <th
                    class="p-3 font-medium ui-text-strong w-16 text-center border-l"
                    
                  >
                    啟用
                  </th>
                  <th
                    class="p-3 font-medium ui-text-strong w-20 text-center border-l"
                    
                  >
                    運費
                  </th>
                  <th
                    class="p-3 font-medium ui-text-strong w-24 text-center border-l"
                    
                  >
                    免運門檻
                  </th>
                  <th
                    class="p-3 font-medium ui-text-strong text-center border-l"
                    
                  >
                    <span class="routing-payment-header">
                      <img
                        id="dr-cod-icon-preview"
                        src="../../../icons/payment-cash.png"
                        alt=""
                        class="routing-payment-icon"
                      >
                      <span>貨到/取貨付款</span>
                    </span>
                  </th>
                  <th
                    class="p-3 font-medium ui-text-strong text-center border-l"
                    
                  >
                    <span class="routing-payment-header">
                      <img
                        id="dr-linepay-icon-preview"
                        src="../../../icons/payment-linepay.png"
                        alt=""
                        class="routing-payment-icon"
                      >
                      <span>LINE Pay</span>
                    </span>
                  </th>
                  <th
                    class="p-3 font-medium ui-text-strong text-center border-l"
                    
                  >
                    <span class="routing-payment-header">
                      <img
                        id="dr-jkopay-icon-preview"
                        src="../../../icons/payment-jkopay.png"
                        alt=""
                        class="routing-payment-icon"
                      >
                      <span>街口支付</span>
                    </span>
                  </th>
                  <th
                    class="p-3 font-medium ui-text-strong text-center border-l"
                    
                  >
                    <span class="routing-payment-header">
                      <img
                        id="dr-transfer-icon-preview"
                        src="../../../icons/payment-bank.png"
                        alt=""
                        class="routing-payment-icon"
                      >
                      <span>線上轉帳</span>
                    </span>
                  </th>
                  <th
                    class="p-3 font-medium ui-text-strong w-16 text-center border-l"
                    
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody id="delivery-routing-table" class="sortable-tbody">
                <!-- JS 動態產生 -->
              </tbody>
            </table>
          </div>

          <div class="space-y-3 mt-4">
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" id="s-linepay-sandbox" class="w-4 h-4">
              <span>開發者功能：LINE Pay Sandbox 模式（測試環境）</span>
            </label>
          </div>
        </div>

        <!-- 金流選項顯示設定 -->
        <div
          class="mb-6 p-4 bg-white rounded-xl border"
          
        >
          <h3 class="font-semibold text-lg mb-3 flex items-center ui-text-highlight">
            <img src="../../../icons/payment-cash.png" alt="" class="ui-icon-inline-lg">
            金流選項顯示設定
          </h3>
          <p class="text-sm ui-text-subtle mb-4">
            您可以自訂前台四種預設付款方式的圖示、名稱與說明。系統將會依據上方「取貨方式與付款對應設定」中打勾的規則加上這裡設定的名稱呈現給顧客。
          </p>
          <div
            class="overflow-x-auto border rounded"
            
          >
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 border-b" >
                <tr>
                  <th
                    class="p-3 font-medium ui-text-strong w-24 whitespace-nowrap"
                  >
                    系統代碼
                  </th>
                  <th class="p-3 font-medium ui-text-strong">
                    圖示與名稱 / 說明
                  </th>
                </tr>
              </thead>
              <tbody id="payment-options-table">
                <!-- 貨到付款 -->
                <tr class="border-b" >
                  <td class="p-3 font-mono ui-text-subtle text-center">cod</td>
                  <td class="p-3">
                    <div class="flex flex-col gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <input type="hidden" id="po-cod-icon-url">
                        <input
                          type="file"
                          id="po-cod-icon-file"
                          accept="image/*"
                          class="text-sm icon-upload-input"
                          data-preview-target="po-cod-icon-preview"
                          data-fallback-key="cod"
                        >
                        <img
                          id="po-cod-icon-preview"
                          src=""
                          alt=""
                          class="icon-upload-preview hidden"
                        >
                        <button
                          type="button"
                          data-action="upload-payment-icon"
                          data-method="cod"
                          class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
                        >
                          上傳付款圖示
                        </button>
                        <span
                          id="po-cod-icon-url-display"
                          class="text-[11px] ui-text-muted truncate max-w-[260px]"
                        ></span>
                      </div>
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          id="po-cod-icon"
                          class="border rounded p-1 icon-text-fallback text-sm"
                          value=""
                          placeholder="備援字元"
                        >
                        <input
                          type="text"
                          id="po-cod-name"
                          class="border rounded p-1 flex-1 min-w-[120px]"
                          value="取件 / 到付"
                          placeholder="顯示名稱"
                        >
                      </div>
                      <input
                        type="text"
                        id="po-cod-desc"
                        class="border rounded p-1 w-full text-xs ui-text-strong"
                        value="取貨時付現或宅配到付"
                        placeholder="簡短說明"
                      >
                    </div>
                  </td>
                </tr>
                <!-- LINE Pay -->
                <tr class="border-b" >
                  <td class="p-3 font-mono ui-text-subtle text-center">
                    linepay
                  </td>
                  <td class="p-3">
                    <div class="flex flex-col gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <input type="hidden" id="po-linepay-icon-url">
                        <input
                          type="file"
                          id="po-linepay-icon-file"
                          accept="image/*"
                          class="text-sm icon-upload-input"
                          data-preview-target="po-linepay-icon-preview"
                          data-fallback-key="linepay"
                        >
                        <img
                          id="po-linepay-icon-preview"
                          src=""
                          alt=""
                          class="icon-upload-preview hidden"
                        >
                        <button
                          type="button"
                          data-action="upload-payment-icon"
                          data-method="linepay"
                          class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
                        >
                          上傳付款圖示
                        </button>
                        <span
                          id="po-linepay-icon-url-display"
                          class="text-[11px] ui-text-muted truncate max-w-[260px]"
                        ></span>
                      </div>
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          id="po-linepay-icon"
                          class="border rounded p-1 icon-text-fallback text-sm"
                          value=""
                          placeholder="備援字元"
                        >
                        <input
                          type="text"
                          id="po-linepay-name"
                          class="border rounded p-1 flex-1 min-w-[120px]"
                          value="LINE Pay"
                          placeholder="顯示名稱"
                        >
                      </div>
                      <input
                        type="text"
                        id="po-linepay-desc"
                        class="border rounded p-1 w-full text-xs ui-text-strong"
                        value="線上安全付款"
                        placeholder="簡短說明"
                      >
                    </div>
                  </td>
                </tr>
                <!-- 街口支付 -->
                <tr class="border-b" >
                  <td class="p-3 font-mono ui-text-subtle text-center">
                    jkopay
                  </td>
                  <td class="p-3">
                    <div class="flex flex-col gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <input type="hidden" id="po-jkopay-icon-url">
                        <input
                          type="file"
                          id="po-jkopay-icon-file"
                          accept="image/*"
                          class="text-sm icon-upload-input"
                          data-preview-target="po-jkopay-icon-preview"
                          data-fallback-key="jkopay"
                        >
                        <img
                          id="po-jkopay-icon-preview"
                          src=""
                          alt=""
                          class="icon-upload-preview hidden"
                        >
                        <button
                          type="button"
                          data-action="upload-payment-icon"
                          data-method="jkopay"
                          class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
                        >
                          上傳付款圖示
                        </button>
                        <span
                          id="po-jkopay-icon-url-display"
                          class="text-[11px] ui-text-muted truncate max-w-[260px]"
                        ></span>
                      </div>
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          id="po-jkopay-icon"
                          class="border rounded p-1 icon-text-fallback text-sm"
                          value=""
                          placeholder="備援字元"
                        >
                        <input
                          type="text"
                          id="po-jkopay-name"
                          class="border rounded p-1 flex-1 min-w-[120px]"
                          value="街口支付"
                          placeholder="顯示名稱"
                        >
                      </div>
                      <input
                        type="text"
                        id="po-jkopay-desc"
                        class="border rounded p-1 w-full text-xs ui-text-strong"
                        value="街口支付線上付款"
                        placeholder="簡短說明"
                      >
                    </div>
                  </td>
                </tr>
                <!-- 線上轉帳 -->
                <tr class="border-b" >
                  <td class="p-3 font-mono ui-text-subtle text-center">
                    transfer
                  </td>
                  <td class="p-3">
                    <div class="flex flex-col gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <input type="hidden" id="po-transfer-icon-url">
                        <input
                          type="file"
                          id="po-transfer-icon-file"
                          accept="image/*"
                          class="text-sm icon-upload-input"
                          data-preview-target="po-transfer-icon-preview"
                          data-fallback-key="transfer"
                        >
                        <img
                          id="po-transfer-icon-preview"
                          src=""
                          alt=""
                          class="icon-upload-preview hidden"
                        >
                        <button
                          type="button"
                          data-action="upload-payment-icon"
                          data-method="transfer"
                          class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
                        >
                          上傳付款圖示
                        </button>
                        <span
                          id="po-transfer-icon-url-display"
                          class="text-[11px] ui-text-muted truncate max-w-[260px]"
                        ></span>
                      </div>
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          id="po-transfer-icon"
                          class="border rounded p-1 icon-text-fallback text-sm"
                          value=""
                          placeholder="備援字元"
                        >
                        <input
                          type="text"
                          id="po-transfer-name"
                          class="border rounded p-1 flex-1 min-w-[120px]"
                          value="線上轉帳"
                          placeholder="顯示名稱"
                        >
                      </div>
                      <input
                        type="text"
                        id="po-transfer-desc"
                        class="border rounded p-1 w-full text-xs ui-text-strong"
                        value="ATM / 網銀匯款"
                        placeholder="簡短說明"
                      >
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 匯款帳號管理 -->
        <div
          class="mb-6 p-4 bg-white rounded-xl border"
          
        >
          <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
            <img src="../../../icons/payment-bank.png" alt="" class="ui-icon-inline-lg">
            匯款帳號管理
          </h3>
          <div id="bank-accounts-admin-list" class="mb-3"></div>
          <button
            data-action="show-add-bank-account-modal"
            class="text-sm font-medium hover:underline ui-text-highlight"
          >
            + 新增匯款帳號
          </button>
        </div>

        <div class="text-center">
          <button data-action="save-settings" class="btn-primary">
            儲存設定
          </button>
        </div>
      </div>

      <!-- ===== Icon 素材庫 ===== -->
      <div id="icon-library-section" class="glass-card p-6 hidden">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <div>
            <h2 class="text-lg font-bold ui-text-highlight">
              Icon 素材庫管理
            </h2>
            <p class="text-sm ui-text-subtle mt-1">
              依分類瀏覽 icon，選擇套用目標後可一鍵快速套用到設定欄位。
            </p>
          </div>
          <div class="w-full md:w-[340px]">
            <label class="block text-xs ui-text-subtle mb-1">快速搜尋</label>
            <input
              v-model="iconLibraryKeyword"
              class="input-field"
              placeholder="輸入關鍵字（例如：付款、配送、brand）"
            >
          </div>
        </div>

        <div class="ui-card-section mb-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div>
              <label class="block text-xs ui-text-subtle mb-1">快速套用目標</label>
              <UiSelect id="icon-library-target">
                <option value="site">品牌 Icon</option>
                <option value="products">商品區塊 Icon</option>
                <option value="delivery">配送區塊 Icon</option>
                <option value="notes">備註區塊 Icon</option>
                <option value="cod">付款：貨到/取貨付款</option>
                <option value="linepay">付款：LINE Pay</option>
                <option value="jkopay">付款：街口支付</option>
                <option value="transfer">付款：線上轉帳</option>
              </UiSelect>
            </div>
            <p class="text-xs ui-text-subtle leading-relaxed">
              點任一素材卡片的「快速套用」後，會直接寫入對應欄位與預覽圖，最後記得回系統設定按「儲存設定」。
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
          <UiButton
            v-for="category in iconLibraryCategories"
            :key="`icon-category-${category}`"
            size="sm"
            :variant="iconLibraryCategory === category ? 'default' : 'outline'"
            @click.prevent="selectIconLibraryCategory(category)"
          >
            {{ category === "all" ? "全部分類" : category }}
          </UiButton>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" id="icon-library-grid">
          <div
            v-for="icon in filteredIconCatalog"
            :key="`icon-card-${icon.key}`"
            class="ui-card-section flex flex-col gap-3"
          >
            <div class="flex items-start gap-3">
              <span class="w-12 h-12 rounded-xl border border-slate-200 bg-white p-2 inline-flex items-center justify-center">
                <img :src="resolveIconCatalogUrl(icon.key)" :alt="icon.label" class="ui-icon-img">
              </span>
              <div class="min-w-0">
                <p class="font-semibold text-sm text-slate-800 leading-tight">{{ icon.label }}</p>
                <p class="text-xs text-slate-500 font-mono truncate mt-0.5">{{ icon.key }}</p>
                <p class="text-xs text-slate-500 truncate">{{ icon.path }}</p>
              </div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600">{{ icon.category }}</span>
              <UiButton
                size="sm"
                variant="secondary"
                data-action="icon-library-apply"
                :data-icon-key="icon.key"
                :data-icon-url="icon.path"
              >
                快速套用
              </UiButton>
            </div>
          </div>
        </div>
        <p v-if="filteredIconCatalog.length === 0" class="text-center text-sm ui-text-subtle py-8">
          找不到符合條件的 icon，請調整分類或搜尋關鍵字。
        </p>
      </div>

      <!-- ===== 表單管理 ===== -->
      <div id="formfields-section" class="glass-card p-6 hidden">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold ui-text-highlight">
            表單欄位管理
          </h2>
          <button
            data-action="show-add-field-modal"
            class="btn-primary text-sm"
          >
            + 新增欄位
          </button>
        </div>
        <p class="text-sm ui-text-subtle mb-4">
          管理前台訂購表單的自訂欄位（如聯絡電話、電子郵件、開立收據等）。可拖拽排序、設定必填、啟用/停用。
        </p>
        <div id="formfields-list" data-vue-managed="true">
          <p v-if="formFieldsView.length === 0" class="text-center ui-text-subtle py-8">
            尚無自訂欄位
          </p>
          <div v-else class="space-y-2" id="formfields-sortable">
            <div
              v-for="field in formFieldsView"
              :key="`field-${field.id}`"
              class="flex items-center gap-3 p-3 bg-white rounded-xl border"
              
              :class="field.enabled ? '' : 'opacity-50'"
              :data-field-id="field.id"
            >
              <span class="cursor-grab ui-text-muted drag-handle"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-medium">{{ field.label }}</span>
                  <span class="text-xs ui-primary-soft ui-text-highlight px-2 py-0.5 rounded-full">
                    {{ field.fieldTypeLabel }}
                  </span>
                  <span
                    v-if="field.required"
                    class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"
                  >
                    必填
                  </span>
                  <span
                    v-if="!field.enabled"
                    class="text-xs bg-gray-100 ui-text-subtle px-2 py-0.5 rounded-full"
                  >
                    已停用
                  </span>
                </div>
                <div class="text-xs ui-text-muted mt-1">
                  key: {{ field.fieldKey }}<span v-if="field.placeholder">・{{ field.placeholder }}</span>
                </div>
                <div v-if="field.hiddenDeliveryMethodsText" class="text-xs text-orange-500 mt-1">
                  {{ field.hiddenDeliveryMethodsText }}
                </div>
              </div>
              <div class="flex gap-1 items-center">
                <button
                  data-action="toggle-field-enabled"
                  :data-field-id="field.id"
                  :data-enabled="field.toggleEnabledValue"
                  class="text-sm px-2 py-1 rounded hover:bg-gray-100"
                  :title="field.toggleEnabledTitle"
                >
                  {{ field.toggleEnabledIcon }}
                </button>
                <button
                  data-action="edit-form-field"
                  :data-field-id="field.id"
                  class="text-sm px-2 py-1 rounded hover:bg-gray-100"
                  title="編輯"
                >
                  編輯
                </button>
                <button
                  data-action="delete-form-field"
                  :data-field-id="field.id"
                  class="text-sm px-2 py-1 rounded hover:bg-red-50 ui-text-danger"
                  title="刪除"
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-spacer"></div>
    </div>

    <!-- 商品 Modal -->
    <div id="product-modal" class="modal-overlay hidden">
      <div class="modal-content">
        <h3 id="pm-title" class="text-xl font-bold mb-5 ui-text-highlight">
          新增商品
        </h3>
        <form id="product-form" class="space-y-4">
          <input type="hidden" id="pm-id">
          <div>
            <label class="block text-sm ui-text-strong mb-1">分類 *</label>
            <UiSelect id="pm-category" required>
              <option value="">選擇分類</option>
            </UiSelect>
          </div>
          <div>
            <label class="block text-sm ui-text-strong mb-1">品名 *</label>
            <UiInput
              type="text"
              id="pm-name"
              required
            />
          </div>
          <div>
            <label class="block text-sm ui-text-strong mb-1">說明</label>
            <UiInput
              type="text"
              id="pm-desc"
              placeholder="風味描述"
            />
          </div>
          <div>
            <label class="block text-sm ui-text-strong mb-1">烘焙度</label>
            <UiInput
              type="text"
              id="pm-roast"
              placeholder="例：中淺焙"
            />
          </div>

          <!-- 規格與價格 -->
          <div class="ui-card-section">
            <label class="block text-sm ui-text-strong mb-2 font-semibold">規格與價格</label>
            <div id="specs-container" class="space-y-2 mb-2"></div>
            <UiButton
              type="button"
              size="sm"
              variant="outline"
              data-action="add-spec-row"
              class="text-slate-700"
            >
              + 新增規格
            </UiButton>
          </div>

          <div>
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                id="pm-enabled"
                checked
                class="w-4 h-4"
              >
              啟用販售
            </label>
          </div>
          <div class="flex gap-3 pt-2">
            <UiButton type="submit" class="flex-1">儲存</UiButton>
            <UiButton
              type="button"
              variant="secondary"
              data-action="close-product-modal"
              class="flex-1"
            >
              取消
            </UiButton>
          </div>
        </form>
      </div>
    </div>

    <!-- 促銷活動 Modal -->
    <div id="promotion-modal" class="modal-overlay hidden overflow-y-auto">
      <div
        class="modal-content my-8 mx-auto"
        style="max-height: 90vh; overflow-y: auto"
      >
        <h3
          id="prm-title"
          class="text-xl font-bold mb-6 ui-text-highlight"
        >
          新增活動
        </h3>
        <form id="promotion-form" class="space-y-4">
          <input type="hidden" id="prm-id">

          <div>
            <label class="block text-sm ui-text-strong mb-1">活動名稱 *</label>
            <UiInput
              type="text"
              id="prm-name"
              placeholder="例如：任選2件9折"
              required
            />
          </div>

          <div>
            <label class="block text-sm ui-text-strong mb-1">活動類型 *</label>
            <UiSelect id="prm-type" required>
              <option value="bundle">組合優惠 (多件折扣)</option>
            </UiSelect>
          </div>

          <div class="ui-card-section bg-gray-50">
            <label
              class="block text-sm ui-text-strong space-x-2 font-medium mb-2"
            >觸發條件</label>
            <div class="mb-3">
              <label class="block text-xs ui-text-subtle mb-1"
              >適用商品 (打勾即納入計算)</label>
              <div
                id="prm-products-list"
                class="max-h-40 overflow-y-auto border p-2 bg-white rounded space-y-1 text-sm"
              >
                <!-- JS 生成 checkbox -->
              </div>
            </div>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm">任選滿</span>
              <UiInput
                type="number"
                id="prm-min-qty"
                class="w-20 text-center"
                value="2"
                min="1"
                required
              />
              <span class="text-sm">件，可享優惠</span>
            </div>
          </div>

          <div class="ui-card-section bg-gray-50">
            <label class="block text-sm ui-text-strong font-medium mb-2"
            >優惠設定</label>
            <div class="flex items-center gap-2 mb-2">
              <UiSelect id="prm-discount-type" class="w-32">
                <option value="percent">打折 (%)</option>
                <option value="amount">折抵現金 ($)</option>
              </UiSelect>
              <UiInput
                type="number"
                id="prm-discount-value"
                class="flex-1"
                placeholder="數值"
                required
                min="0"
                step="0.1"
              />
            </div>
            <p class="text-xs ui-text-subtle">
              例如：選擇「打折(%)」並輸入 90 表示 9折；選擇「折抵現金($)」並輸入
              100 表示折抵 100元。
            </p>
          </div>

          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="prm-enabled" checked class="w-4 h-4">
              <span class="text-sm">啟用此活動</span>
            </label>
          </div>

          <div class="flex gap-3 pt-2">
            <UiButton type="submit" class="flex-1">儲存</UiButton>
            <UiButton
              type="button"
              variant="secondary"
              data-action="close-promotion-modal"
              class="flex-1"
            >
              取消
            </UiButton>
          </div>
        </form>
      </div>
    </div>

</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import UiButton from "../components/ui/button/Button.vue";
import UiCard from "../components/ui/card/Card.vue";
import UiInput from "../components/ui/input/Input.vue";
import UiSelect from "../components/ui/select/Select.vue";
import UiTextarea from "../components/ui/textarea/Textarea.vue";
import { getDefaultIconUrl, ICON_CATALOG } from "../../../js/icons.js";
import { initDashboardApp } from "../../../js/dashboard-app.js";

const originalBodyClass = document.body.className;
const ordersView = ref([]);
const productsGroupsView = ref([]);
const promotionsView = ref([]);
const formFieldsView = ref([]);
const categoriesView = ref([]);
const usersView = ref([]);
const blacklistView = ref([]);
const iconLibraryCategory = ref("all");
const iconLibraryKeyword = ref("");
const ordersStatusOptions = ref([
  "pending",
  "processing",
  "shipped",
  "completed",
  "cancelled",
]);

const orderStatusLabel = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

function orderStatusText(status) {
  return orderStatusLabel[status] || status;
}

const iconLibraryCategories = computed(() => {
  const values = new Set(ICON_CATALOG.map((item) => item.category));
  return ["all", ...Array.from(values)];
});

const filteredIconCatalog = computed(() => {
  const keyword = iconLibraryKeyword.value.trim().toLowerCase();
  return ICON_CATALOG.filter((item) => {
    if (
      iconLibraryCategory.value !== "all" &&
      item.category !== iconLibraryCategory.value
    ) {
      return false;
    }
    if (!keyword) return true;
    const targetText = `${item.key} ${item.label} ${item.category} ${item.path}`
      .toLowerCase();
    return targetText.includes(keyword);
  });
});

function selectIconLibraryCategory(category) {
  iconLibraryCategory.value = category;
}

function resolveIconCatalogUrl(iconKey) {
  return getDefaultIconUrl(iconKey);
}

function handleDashboardOrdersUpdated(event) {
  const detail = event?.detail || {};
  ordersView.value = Array.isArray(detail.orders) ? detail.orders : [];
  if (Array.isArray(detail.statusOptions) && detail.statusOptions.length > 0) {
    ordersStatusOptions.value = detail.statusOptions;
  }
}

function handleDashboardProductsUpdated(event) {
  const detail = event?.detail || {};
  productsGroupsView.value = Array.isArray(detail.groups) ? detail.groups : [];
}

function handleDashboardPromotionsUpdated(event) {
  const detail = event?.detail || {};
  promotionsView.value = Array.isArray(detail.promotions)
    ? detail.promotions
    : [];
}

function handleDashboardFormFieldsUpdated(event) {
  const detail = event?.detail || {};
  formFieldsView.value = Array.isArray(detail.fields) ? detail.fields : [];
}

function handleDashboardCategoriesUpdated(event) {
  const detail = event?.detail || {};
  categoriesView.value = Array.isArray(detail.categories) ? detail.categories : [];
}

function handleDashboardUsersUpdated(event) {
  const detail = event?.detail || {};
  usersView.value = Array.isArray(detail.users) ? detail.users : [];
}

function handleDashboardBlacklistUpdated(event) {
  const detail = event?.detail || {};
  blacklistView.value = Array.isArray(detail.blacklist) ? detail.blacklist : [];
}

onMounted(() => {
  document.body.className = "p-4 md:p-6";
  const ordersList = document.getElementById("orders-list");
  if (ordersList) ordersList.dataset.vueManaged = "true";
  const productsTable = document.getElementById("products-main-table");
  if (productsTable) productsTable.dataset.vueManaged = "true";
  const promotionsTable = document.getElementById("promotions-table");
  if (promotionsTable) promotionsTable.dataset.vueManaged = "true";
  const formFieldsList = document.getElementById("formfields-list");
  if (formFieldsList) formFieldsList.dataset.vueManaged = "true";
  const categoriesList = document.getElementById("categories-list");
  if (categoriesList) categoriesList.dataset.vueManaged = "true";
  const usersTable = document.getElementById("users-table");
  if (usersTable) usersTable.dataset.vueManaged = "true";
  const blacklistTable = document.getElementById("blacklist-table");
  if (blacklistTable) blacklistTable.dataset.vueManaged = "true";
  window.addEventListener(
    "coffee:dashboard-orders-updated",
    handleDashboardOrdersUpdated,
  );
  window.addEventListener(
    "coffee:dashboard-products-updated",
    handleDashboardProductsUpdated,
  );
  window.addEventListener(
    "coffee:dashboard-promotions-updated",
    handleDashboardPromotionsUpdated,
  );
  window.addEventListener(
    "coffee:dashboard-formfields-updated",
    handleDashboardFormFieldsUpdated,
  );
  window.addEventListener(
    "coffee:dashboard-categories-updated",
    handleDashboardCategoriesUpdated,
  );
  window.addEventListener(
    "coffee:dashboard-users-updated",
    handleDashboardUsersUpdated,
  );
  window.addEventListener(
    "coffee:dashboard-blacklist-updated",
    handleDashboardBlacklistUpdated,
  );
  initDashboardApp();
});

onBeforeUnmount(() => {
  window.removeEventListener(
    "coffee:dashboard-orders-updated",
    handleDashboardOrdersUpdated,
  );
  window.removeEventListener(
    "coffee:dashboard-products-updated",
    handleDashboardProductsUpdated,
  );
  window.removeEventListener(
    "coffee:dashboard-promotions-updated",
    handleDashboardPromotionsUpdated,
  );
  window.removeEventListener(
    "coffee:dashboard-formfields-updated",
    handleDashboardFormFieldsUpdated,
  );
  window.removeEventListener(
    "coffee:dashboard-categories-updated",
    handleDashboardCategoriesUpdated,
  );
  window.removeEventListener(
    "coffee:dashboard-users-updated",
    handleDashboardUsersUpdated,
  );
  window.removeEventListener(
    "coffee:dashboard-blacklist-updated",
    handleDashboardBlacklistUpdated,
  );
  document.body.className = originalBodyClass;
});
</script>
