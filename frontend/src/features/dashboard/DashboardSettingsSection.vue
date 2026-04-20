<template>
  <div id="settings-section" v-show="activeTab === 'settings'" class="glass-card p-6">
    <h2 class="text-lg font-bold mb-6 ui-text-highlight">
      系統設定
    </h2>

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
        <img id="settings-brand-logo" src="../../../../icons/logo.png" alt="" class="ui-icon-inline-lg">
        品牌設定
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 settings-two-col-grid">
        <div>
          <label class="block text-sm ui-text-strong mb-1">網站標題</label>
          <input
            v-model.trim="brandingSettings.siteTitle"
            type="text"
            id="s-site-title"
            class="input-field"
            placeholder="Script Coffee"
          >
        </div>
        <div>
          <label class="block text-sm ui-text-strong mb-1">副標題</label>
          <input
            v-model.trim="brandingSettings.siteSubtitle"
            type="text"
            id="s-site-subtitle"
            class="input-field"
            placeholder="咖啡豆 | 耳掛"
          >
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 settings-two-col-grid">
        <div>
          <label class="block text-sm ui-text-strong mb-1">備援文字圖示（可留空）</label>
          <input
            v-model.trim="brandingSettings.siteEmoji"
            type="text"
            id="s-site-emoji"
            class="input-field"
            placeholder="例如：品牌"
          >
        </div>
        <div>
          <label class="block text-sm ui-text-strong mb-1">品牌自訂 Logo</label>
          <div class="flex gap-3 items-center">
            <img
              id="s-icon-preview"
              :src="getSiteIconPreviewUrl()"
              alt="品牌圖示"
              class="w-10 h-10 rounded object-cover border shadow-sm"
            >
            <div class="flex flex-col gap-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <label
                  for="s-site-icon-upload"
                  class="btn-primary text-xs font-medium px-3 py-1.5 rounded transition shadow-sm cursor-pointer"
                >
                  點擊上傳新 Logo
                </label>
                <button
                  type="button"
                  @click="handleResetSiteIcon"
                  class="text-xs ui-text-danger hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded transition"
                >
                  移除自訂
                </button>
              </div>
              <div
                id="s-icon-url-display"
                class="text-xs ui-text-muted truncate max-w-[240px]"
              >
                {{ getSiteIconDisplayText() }}
              </div>
            </div>
            <input
              ref="siteIconInput"
              type="file"
              id="s-site-icon-upload"
              class="hidden"
              accept="image/png,image/jpeg,image/webp"
              @change="handleSiteIconSelection"
            >
            <input v-model="brandingSettings.siteIconUrl" type="hidden" id="s-site-icon-url">
          </div>
        </div>
      </div>
    </div>

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
        <img src="../../../../icons/section-tag.png" alt="" class="ui-icon-inline-lg">
        區塊標題樣式設定
      </h3>

      <div class="mb-4 border-b pb-4">
        <div class="flex justify-between items-center mb-1">
          <label class="block text-sm font-medium ui-text-strong">商品區塊</label>
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
          <input v-model="sectionTitleSettings.products.iconUrl" type="hidden" id="s-products-icon-url">
          <input
            type="file"
            id="s-products-icon-file"
            accept="image/*"
            :ref="(element) => registerSectionIconInput('products', element)"
            class="text-sm"
            @change="handleSectionIconPreview('products', $event)"
          >
          <img
            id="s-products-icon-preview"
            :src="getSectionIconPreviewUrl('products')"
            alt=""
            class="icon-upload-preview"
          >
          <button
            type="button"
            @click="handleSectionIconUpload('products')"
            class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
          >
            上傳區塊圖示
          </button>
          <span
            id="s-products-icon-url-display"
            class="text-[11px] ui-text-muted truncate max-w-[250px]"
          >{{ getDisplayUrl(sectionTitleSettings.products.iconUrl) }}</span>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <input
            v-model.trim="sectionTitleSettings.products.title"
            type="text"
            id="s-products-title"
            class="input-field flex-1 min-w-[150px]"
            placeholder="咖啡豆選購"
          >
          <input
            v-model="sectionTitleSettings.products.color"
            type="color"
            id="s-products-color"
            class="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
            title="文字顏色"
          >
          <select
            v-model="sectionTitleSettings.products.size"
            id="s-products-size"
            class="input-field w-24"
            title="文字大小"
          >
            <option value="text-base">16px (標準)</option>
            <option value="text-lg">18px (稍大)</option>
            <option value="text-xl">20px (大)</option>
            <option value="text-2xl">24px (特大)</option>
          </select>
          <label class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border">
            <input
              v-model="sectionTitleSettings.products.bold"
              type="checkbox"
              id="s-products-bold"
            >
            粗體
          </label>
        </div>
      </div>

      <div class="mb-4 border-b pb-4">
        <div class="flex justify-between items-center mb-1">
          <label class="block text-sm font-medium ui-text-strong">配送區塊</label>
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
          <input v-model="sectionTitleSettings.delivery.iconUrl" type="hidden" id="s-delivery-icon-url">
          <input
            type="file"
            id="s-delivery-icon-file"
            accept="image/*"
            :ref="(element) => registerSectionIconInput('delivery', element)"
            class="text-sm"
            @change="handleSectionIconPreview('delivery', $event)"
          >
          <img
            id="s-delivery-icon-preview"
            :src="getSectionIconPreviewUrl('delivery')"
            alt=""
            class="icon-upload-preview"
          >
          <button
            type="button"
            @click="handleSectionIconUpload('delivery')"
            class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
          >
            上傳區塊圖示
          </button>
          <span
            id="s-delivery-icon-url-display"
            class="text-[11px] ui-text-muted truncate max-w-[250px]"
          >{{ getDisplayUrl(sectionTitleSettings.delivery.iconUrl) }}</span>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <input
            v-model.trim="sectionTitleSettings.delivery.title"
            type="text"
            id="s-delivery-title"
            class="input-field flex-1 min-w-[150px]"
            placeholder="配送方式"
          >
          <input
            v-model="sectionTitleSettings.delivery.color"
            type="color"
            id="s-delivery-color"
            class="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
            title="文字顏色"
          >
          <select
            v-model="sectionTitleSettings.delivery.size"
            id="s-delivery-size"
            class="input-field w-24"
            title="文字大小"
          >
            <option value="text-base">16px (標準)</option>
            <option value="text-lg">18px (稍大)</option>
            <option value="text-xl">20px (大)</option>
            <option value="text-2xl">24px (特大)</option>
          </select>
          <label class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border">
            <input
              v-model="sectionTitleSettings.delivery.bold"
              type="checkbox"
              id="s-delivery-bold"
            >
            粗體
          </label>
        </div>
      </div>

      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="block text-sm font-medium ui-text-strong">備註區塊</label>
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
          <input v-model="sectionTitleSettings.notes.iconUrl" type="hidden" id="s-notes-icon-url">
          <input
            type="file"
            id="s-notes-icon-file"
            accept="image/*"
            :ref="(element) => registerSectionIconInput('notes', element)"
            class="text-sm"
            @change="handleSectionIconPreview('notes', $event)"
          >
          <img
            id="s-notes-icon-preview"
            :src="getSectionIconPreviewUrl('notes')"
            alt=""
            class="icon-upload-preview"
          >
          <button
            type="button"
            @click="handleSectionIconUpload('notes')"
            class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
          >
            上傳區塊圖示
          </button>
          <span
            id="s-notes-icon-url-display"
            class="text-[11px] ui-text-muted truncate max-w-[250px]"
          >{{ getDisplayUrl(sectionTitleSettings.notes.iconUrl) }}</span>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <input
            v-model.trim="sectionTitleSettings.notes.title"
            type="text"
            id="s-notes-title"
            class="input-field flex-1 min-w-[150px]"
            placeholder="訂單備註"
          >
          <input
            v-model="sectionTitleSettings.notes.color"
            type="color"
            id="s-notes-color"
            class="h-10 w-10 cursor-pointer rounded border border-gray-300 p-0.5"
            title="文字顏色"
          >
          <select
            v-model="sectionTitleSettings.notes.size"
            id="s-notes-size"
            class="input-field w-24"
            title="文字大小"
          >
            <option value="text-base">16px (標準)</option>
            <option value="text-lg">18px (稍大)</option>
            <option value="text-xl">20px (大)</option>
            <option value="text-2xl">24px (特大)</option>
          </select>
          <label class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border">
            <input
              v-model="sectionTitleSettings.notes.bold"
              type="checkbox"
              id="s-notes-bold"
            >
            粗體
          </label>
        </div>
      </div>
    </div>

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
        <img src="../../../../icons/announcement-bell.png" alt="" class="ui-icon-inline-lg">
        公告設定
      </h3>
      <label class="flex items-center gap-2 mb-3 cursor-pointer">
        <input v-model="storefrontSettings.announcementEnabled" type="checkbox" id="s-ann-enabled" class="w-4 h-4">
        <span>啟用公告</span>
      </label>
      <UiTextarea
        v-model="storefrontSettings.announcement"
        id="s-announcement"
        class="input-field resize-none"
        rows="3"
        placeholder="公告內容..."
      />
    </div>

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
        <img src="../../../../icons/announcement-bell.png" alt="" class="ui-icon-inline-lg">
        訂單通知設定
      </h3>
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          v-model="storefrontSettings.autoOrderEmailEnabled"
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

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
        <img src="../../../../icons/status-store.png" alt="" class="ui-icon-inline-lg">
        營業狀態
      </h3>
      <div class="flex gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="storefrontSettings.isOpen"
            type="radio"
            name="s-open"
            :value="true"
            class="w-4 h-4"
          >
          營業中
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="storefrontSettings.isOpen"
            type="radio"
            name="s-open"
            :value="false"
            class="w-4 h-4"
          >
          休息中
        </label>
      </div>
    </div>

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-3">
        <h3 class="font-semibold text-lg flex items-center ui-text-highlight">
          <img src="../../../../icons/payment-card.png" alt="" class="ui-icon-inline-lg">
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
      <div class="overflow-x-auto mb-4 border rounded settings-responsive-wrap">
        <table class="w-full text-sm text-left whitespace-nowrap settings-routing-table">
          <thead class="ui-bg-soft border-b">
            <tr>
              <th class="p-3 font-medium ui-text-strong w-10 text-center">
                排序
              </th>
              <th class="p-3 font-medium ui-text-strong">
                圖示與名稱 / 說明
              </th>
              <th class="p-3 font-medium ui-text-strong w-16 text-center border-l">
                啟用
              </th>
              <th class="p-3 font-medium ui-text-strong w-20 text-center border-l">
                運費
              </th>
              <th class="p-3 font-medium ui-text-strong w-24 text-center border-l">
                免運門檻
              </th>
              <th class="p-3 font-medium ui-text-strong text-center border-l">
                <span class="routing-payment-header">
                  <img
                    id="dr-cod-icon-preview"
                    :src="getPaymentPreviewUrl('cod')"
                    alt=""
                    class="routing-payment-icon"
                  >
                  <span>貨到/取貨付款</span>
                </span>
              </th>
              <th class="p-3 font-medium ui-text-strong text-center border-l">
                <span class="routing-payment-header">
                  <img
                    id="dr-linepay-icon-preview"
                    :src="getPaymentPreviewUrl('linepay')"
                    alt=""
                    class="routing-payment-icon"
                  >
                  <span>LINE Pay</span>
                </span>
              </th>
              <th class="p-3 font-medium ui-text-strong text-center border-l">
                <span class="routing-payment-header">
                  <img
                    id="dr-jkopay-icon-preview"
                    :src="getPaymentPreviewUrl('jkopay')"
                    alt=""
                    class="routing-payment-icon"
                  >
                  <span>街口支付</span>
                </span>
              </th>
              <th class="p-3 font-medium ui-text-strong text-center border-l">
                <span class="routing-payment-header">
                  <img
                    id="dr-transfer-icon-preview"
                    :src="getPaymentPreviewUrl('transfer')"
                    alt=""
                    class="routing-payment-icon"
                  >
                  <span>線上轉帳</span>
                </span>
              </th>
              <th class="p-3 font-medium ui-text-strong w-16 text-center border-l">
                操作
              </th>
            </tr>
          </thead>
          <tbody
            id="delivery-routing-table"
            :ref="registerDeliveryRoutingTableElement"
            class="sortable-tbody"
          >
            <tr
              v-for="item in deliveryOptions"
              :key="item.id"
              class="border-b delivery-option-row group"
              style="border-color:#E2DCC8"
              :data-id="item.id"
              :data-delivery-id="item.id"
            >
              <td
                class="p-3 text-center cursor-move ui-text-muted hover:ui-text-strong transition"
                data-label="排序"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                  class="drag-handle-icon"
                ><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z" /></svg>
              </td>
              <td class="p-3" data-label="圖示與名稱 / 說明">
                <div class="flex flex-col gap-2 min-w-[280px]">
                  <div class="icon-upload-row">
                    <img
                      class="icon-upload-preview do-icon-preview"
                      :src="getDeliveryPreviewUrl(item)"
                      alt="配送圖示預覽"
                    >
                    <input v-model="item.icon_url" type="hidden" class="do-icon-url">
                    <input
                      type="file"
                      :ref="(element) => registerDeliveryIconInput(item.id, element)"
                      class="text-xs icon-upload-file"
                      accept="image/png,image/webp,image/jpeg,image/jpg"
                      @change="handleDeliveryIconPreview(item.id, $event)"
                    >
                    <button
                      type="button"
                      @click="handleDeliveryIconUpload(item.id)"
                      class="text-xs px-2 py-1 rounded border ui-border ui-text-highlight hover:ui-primary-soft icon-upload-action"
                    >
                      上傳圖示
                    </button>
                  </div>
                  <p class="text-[11px] ui-text-muted truncate do-icon-url-display">
                    {{ getDisplayUrl(item.icon_url) }}
                  </p>
                  <div class="flex items-center gap-2">
                    <input
                      v-model.trim="item.icon"
                      type="text"
                      class="border rounded p-1 icon-text-fallback text-sm do-icon"
                      placeholder="備援字元"
                    >
                    <input
                      v-model.trim="item.name"
                      type="text"
                      class="border rounded p-1 flex-1 min-w-[120px] do-name"
                      placeholder="物流名稱"
                    >
                    <input :value="item.id" type="hidden" class="do-id">
                  </div>
                  <input
                    v-model.trim="item.description"
                    type="text"
                    class="border rounded p-1 w-full text-xs ui-text-strong do-desc"
                    placeholder="簡短說明 (例如: 到店自取)"
                  >
                </div>
              </td>
              <td
                class="p-3 text-center border-l ui-bg-soft/50"
                style="border-color:#E2DCC8"
                data-label="啟用"
              >
                <label class="relative inline-flex items-center cursor-pointer">
                  <input v-model="item.enabled" type="checkbox" class="sr-only peer do-enabled">
                  <div class="w-9 h-5 ui-bg-soft peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </td>
              <td
                class="p-3 text-center border-l"
                style="border-color:#E2DCC8"
                data-label="運費"
              >
                <input
                  v-model.number="item.fee"
                  type="number"
                  class="border rounded p-1 w-16 text-center text-sm do-fee"
                  min="0"
                >
              </td>
              <td
                class="p-3 text-center border-l"
                style="border-color:#E2DCC8"
                data-label="免運門檻"
              >
                <input
                  v-model.number="item.free_threshold"
                  type="number"
                  class="border rounded p-1 w-20 text-center text-sm do-free-threshold"
                  min="0"
                >
              </td>
              <td
                class="p-3 text-center border-l"
                style="border-color:#E2DCC8"
                data-label="貨到/取貨付款"
              >
                <input v-model="item.payment.cod" type="checkbox" class="w-4 h-4 do-cod">
              </td>
              <td
                class="p-3 text-center border-l"
                style="border-color:#E2DCC8"
                data-label="LINE Pay"
              >
                <input v-model="item.payment.linepay" type="checkbox" class="w-4 h-4 do-linepay">
              </td>
              <td
                class="p-3 text-center border-l"
                style="border-color:#E2DCC8"
                data-label="街口支付"
              >
                <input v-model="item.payment.jkopay" type="checkbox" class="w-4 h-4 do-jkopay">
              </td>
              <td
                class="p-3 text-center border-l"
                style="border-color:#E2DCC8"
                data-label="線上轉帳"
              >
                <input v-model="item.payment.transfer" type="checkbox" class="w-4 h-4 do-transfer">
              </td>
              <td
                class="p-3 text-center border-l"
                style="border-color:#E2DCC8"
                data-label="操作"
              >
                <button
                  type="button"
                  :data-delivery-id="item.id"
                  data-action="remove-delivery-option-row"
                  class="ui-text-danger hover:text-red-700 p-1"
                  title="刪除此選項"
                >
                  刪除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="space-y-3 mt-4">
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input v-model="linePaySandbox" type="checkbox" id="s-linepay-sandbox" class="w-4 h-4">
          <span>開發者功能：LINE Pay Sandbox 模式（測試環境）</span>
        </label>
      </div>
    </div>

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <h3 class="font-semibold text-lg mb-3 flex items-center ui-text-highlight">
        <img src="../../../../icons/payment-cash.png" alt="" class="ui-icon-inline-lg">
        金流選項顯示設定
      </h3>
      <p class="text-sm ui-text-subtle mb-4">
        您可以自訂前台四種預設付款方式的圖示、名稱與說明。系統將會依據上方「取貨方式與付款對應設定」中打勾的規則加上這裡設定的名稱呈現給顧客。
      </p>
      <div class="overflow-x-auto border rounded settings-responsive-wrap">
        <table class="w-full text-sm text-left settings-payment-table">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="p-3 font-medium ui-text-strong w-24 whitespace-nowrap">
                系統代碼
              </th>
              <th class="p-3 font-medium ui-text-strong">
                圖示與名稱 / 說明
              </th>
            </tr>
          </thead>
          <tbody id="payment-options-table">
            <tr v-for="method in paymentMethodOrder" :key="method" class="border-b">
              <td class="p-3 font-mono ui-text-subtle text-center" data-label="系統代碼">
                {{ method }}
              </td>
              <td class="p-3" data-label="圖示與名稱 / 說明">
                <div class="flex flex-col gap-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <input
                      v-model="paymentOptions[method].icon_url"
                      type="hidden"
                      :id="`po-${method}-icon-url`"
                    >
                    <input
                      type="file"
                      :id="`po-${method}-icon-file`"
                      accept="image/*"
                      :ref="(element) => registerPaymentIconInput(method, element)"
                      class="text-sm"
                      @change="handlePaymentIconPreview(method, $event)"
                    >
                    <img
                      :id="`po-${method}-icon-preview`"
                      :src="getPaymentPreviewUrl(method)"
                      alt=""
                      class="icon-upload-preview"
                    >
                    <button
                      type="button"
                      @click="handlePaymentIconUpload(method)"
                      class="text-xs px-2 py-1 rounded border ui-border text-blue-700 hover:ui-primary-soft"
                    >
                      上傳付款圖示
                    </button>
                    <span
                      :id="`po-${method}-icon-url-display`"
                      class="text-[11px] ui-text-muted truncate max-w-[260px]"
                    >{{ getDisplayUrl(paymentOptions[method].icon_url) }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      v-model.trim="paymentOptions[method].icon"
                      type="text"
                      :id="`po-${method}-icon`"
                      class="border rounded p-1 icon-text-fallback text-sm"
                      placeholder="備援字元"
                    >
                    <input
                      v-model.trim="paymentOptions[method].name"
                      type="text"
                      :id="`po-${method}-name`"
                      class="border rounded p-1 flex-1 min-w-[120px]"
                      placeholder="顯示名稱"
                    >
                  </div>
                  <input
                    v-model.trim="paymentOptions[method].description"
                    type="text"
                    :id="`po-${method}-desc`"
                    class="border rounded p-1 w-full text-xs ui-text-strong"
                    placeholder="簡短說明"
                  >
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
        <img src="../../../../icons/payment-bank.png" alt="" class="ui-icon-inline-lg">
        匯款帳號管理
      </h3>
      <div class="mb-3">
        <p v-if="bankAccounts.length" class="text-xs ui-text-subtle mb-2">
          可拖曳左側排序圖示自由排序匯款帳號
        </p>
        <p v-else class="text-sm ui-text-subtle">
          尚無匯款帳號
        </p>
        <div
          v-if="bankAccounts.length"
          id="bank-accounts-sortable"
          :ref="registerBankAccountsListElement"
          class="space-y-2"
        >
          <div
            v-for="account in bankAccounts"
            :key="account.id"
            :data-bank-account-id="account.id"
            data-bank-account-row
            class="flex items-center justify-between p-3 rounded-lg"
            style="background:#FFFDF7; border:1px solid #E2DCC8;"
          >
            <div class="flex items-start gap-3 min-w-0">
              <span
                class="drag-handle-bank cursor-move ui-text-muted hover:ui-text-strong select-none pt-1"
                title="拖曳排序"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
              </span>
              <div>
                <div class="font-medium">
                  {{ account.bankName }} ({{ account.bankCode }})
                </div>
                <div class="text-sm font-mono ui-text-strong">
                  {{ account.accountNumber }}
                </div>
                <div v-if="account.accountName" class="text-xs ui-text-muted">
                  戶名: {{ account.accountName }}
                </div>
              </div>
            </div>
            <div class="flex gap-2 shrink-0">
              <button
                data-action="edit-bank-account"
                :data-bank-account-id="account.id"
                class="text-sm ui-text-highlight"
              >
                編輯
              </button>
              <button
                data-action="delete-bank-account"
                :data-bank-account-id="account.id"
                class="text-sm ui-text-danger"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
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
</template>

<script setup>
import { ref } from "vue";
import UiTextarea from "../../components/ui/textarea/Textarea.vue";
import {
  dashboardBankAccountsActions,
  useDashboardBankAccounts,
} from "./useDashboardBankAccounts.js";
import {
  dashboardSettingsIconActions,
  useDashboardSettingsIcons,
} from "./useDashboardSettingsIcons.js";
import {
  dashboardSettingsActions,
  useDashboardSettings,
} from "./useDashboardSettings.js";
import { useDashboardSession } from "./useDashboardSession.js";

const { activeTab } = useDashboardSession();
const {
  brandingSettings,
  storefrontSettings,
  sectionTitleSettings,
  deliveryOptions,
  paymentOptions,
  linePaySandbox,
  paymentMethodOrder,
} = useDashboardSettings();
const { bankAccounts } = useDashboardBankAccounts();
const {
  getDisplayUrl,
  getSiteIconPreviewUrl,
  getSectionIconPreviewUrl,
  getPaymentPreviewUrl,
  getDeliveryPreviewUrl,
} = useDashboardSettingsIcons();

const siteIconInput = ref(null);
const sectionIconInputs = new Map();
const paymentIconInputs = new Map();
const deliveryIconInputs = new Map();

function registerDeliveryRoutingTableElement(element) {
  dashboardSettingsActions.registerDeliveryRoutingTableElement(element);
}

function registerBankAccountsListElement(element) {
  dashboardBankAccountsActions.registerBankAccountsListElement(element);
}

function registerSectionIconInput(section, element) {
  const key = String(section || "").trim();
  if (!key) return;
  if (element) {
    sectionIconInputs.set(key, element);
    return;
  }
  sectionIconInputs.delete(key);
}

function registerPaymentIconInput(method, element) {
  const key = String(method || "").trim();
  if (!key) return;
  if (element) {
    paymentIconInputs.set(key, element);
    return;
  }
  paymentIconInputs.delete(key);
}

function registerDeliveryIconInput(deliveryId, element) {
  const key = String(deliveryId || "").trim();
  if (!key) return;
  if (element) {
    deliveryIconInputs.set(key, element);
    return;
  }
  deliveryIconInputs.delete(key);
}

async function handleSiteIconSelection(event) {
  const input = event?.target;
  const file = input?.files?.[0] || null;
  await dashboardSettingsIconActions.handleSiteIconSelection(file);
  if (input) input.value = "";
}

function handleResetSiteIcon() {
  dashboardSettingsIconActions.resetSiteIcon();
}

function getSiteIconDisplayText() {
  return brandingSettings.value.siteIconUrl ? "自訂 Logo" : "未設定 (預設)";
}

function handleSectionIconPreview(section, event) {
  dashboardSettingsIconActions.previewSectionIconFile(
    section,
    event?.target?.files?.[0] || null,
  );
}

async function handleSectionIconUpload(section) {
  const input = sectionIconInputs.get(String(section || "").trim());
  await dashboardSettingsIconActions.uploadSectionIconFile(
    section,
    input?.files?.[0] || null,
  );
  if (input) input.value = "";
}

function handlePaymentIconPreview(method, event) {
  dashboardSettingsIconActions.previewPaymentIconFile(
    method,
    event?.target?.files?.[0] || null,
  );
}

async function handlePaymentIconUpload(method) {
  const input = paymentIconInputs.get(String(method || "").trim());
  await dashboardSettingsIconActions.uploadPaymentIconFile(
    method,
    input?.files?.[0] || null,
  );
  if (input) input.value = "";
}

function handleDeliveryIconPreview(deliveryId, event) {
  dashboardSettingsIconActions.previewDeliveryIconFile(
    deliveryId,
    event?.target?.files?.[0] || null,
  );
}

async function handleDeliveryIconUpload(deliveryId) {
  const input = deliveryIconInputs.get(String(deliveryId || "").trim());
  await dashboardSettingsIconActions.uploadDeliveryIconFile(
    deliveryId,
    input?.files?.[0] || null,
  );
  if (input) input.value = "";
}
</script>
