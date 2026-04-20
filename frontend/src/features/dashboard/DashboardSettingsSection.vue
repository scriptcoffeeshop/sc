<template>
  <div id="settings-section" class="glass-card p-6 hidden">
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
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 settings-two-col-grid">
        <div>
          <label class="block text-sm ui-text-strong mb-1">備援文字圖示（可留空）</label>
          <input
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
              src="../../../../icons/logo.png"
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
                  data-action="reset-site-icon"
                  class="text-xs ui-text-danger hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded transition"
                >
                  移除自訂
                </button>
              </div>
              <div
                id="s-icon-url-display"
                class="text-xs ui-text-muted truncate max-w-[240px]"
              >
                未設定 (預設)
              </div>
            </div>
            <input
              type="file"
              id="s-site-icon-upload"
              class="hidden"
              accept="image/png,image/jpeg,image/webp"
              data-action="upload-site-icon"
            >
            <input type="hidden" id="s-site-icon-url">
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
          <label class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border">
            <input
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
          <label class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border">
            <input
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
          <label class="flex items-center gap-1 cursor-pointer ui-bg-soft px-3 py-2 rounded border ui-border">
            <input
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
        <input type="checkbox" id="s-ann-enabled" class="w-4 h-4">
        <span>啟用公告</span>
      </label>
      <UiTextarea
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
            type="radio"
            name="s-open"
            value="true"
            class="w-4 h-4"
          >
          營業中
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="s-open"
            value="false"
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
                    src="../../../../icons/payment-cash.png"
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
                    src="../../../../icons/payment-linepay.png"
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
                    src="../../../../icons/payment-jkopay.png"
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
                    src="../../../../icons/payment-bank.png"
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
            <tr class="border-b">
              <td class="p-3 font-mono ui-text-subtle text-center" data-label="系統代碼">cod</td>
              <td class="p-3" data-label="圖示與名稱 / 說明">
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
            <tr class="border-b">
              <td class="p-3 font-mono ui-text-subtle text-center" data-label="系統代碼">
                linepay
              </td>
              <td class="p-3" data-label="圖示與名稱 / 說明">
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
            <tr class="border-b">
              <td class="p-3 font-mono ui-text-subtle text-center" data-label="系統代碼">
                jkopay
              </td>
              <td class="p-3" data-label="圖示與名稱 / 說明">
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
            <tr class="border-b">
              <td class="p-3 font-mono ui-text-subtle text-center" data-label="系統代碼">
                transfer
              </td>
              <td class="p-3" data-label="圖示與名稱 / 說明">
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

    <div class="mb-6 p-4 bg-white rounded-xl border">
      <h3 class="font-semibold mb-3 flex items-center ui-text-highlight">
        <img src="../../../../icons/payment-bank.png" alt="" class="ui-icon-inline-lg">
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
</template>

<script setup>
import UiTextarea from "../../components/ui/textarea/Textarea.vue";
</script>
