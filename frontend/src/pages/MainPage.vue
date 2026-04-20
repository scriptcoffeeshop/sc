<template>
    <!-- 公告 -->
    <div
      id="announcement-banner"
      class="hidden max-w-3xl mx-auto mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 relative"
    >
      <button
        data-action="close-announcement"
        class="absolute top-2 right-3 text-amber-500 hover:text-amber-700 text-xl"
      >
        &times;
      </button>
      <p id="announcement-text" class="pr-6"></p>
    </div>

    <UiCard class="max-w-3xl mx-auto p-6 md:p-8">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <span id="site-icon"><img src="../../../icons/logo.png" alt="品牌圖示" class="ui-icon-img"></span>
        <div>
          <h1
            class="text-2xl font-bold"
            style="color: var(--primary)"
            id="site-title"
          >
            Script Coffee
          </h1>
          <p class="text-sm text-gray-500" id="site-subtitle">
            咖啡豆 | 耳掛
          </p>
        </div>
      </div>

      <!-- LINE Login -->
      <div id="login-section" class="mb-6 p-4 rounded-xl ui-card-section">
        <div id="login-prompt" class="text-center">
          <p class="text-gray-600 mb-3">請先使用 LINE 帳號登入以進行訂購</p>
          <UiButton
            @click="handleStorefrontLogin"
            class="h-11 px-6 bg-[#06c755] hover:bg-[#05b84e]"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
              />
            </svg>
            使用 LINE 登入
          </UiButton>
        </div>
        <div id="user-info" class="hidden flex items-center gap-3">
          <img
            id="user-avatar"
            src=""
            alt=""
            class="w-12 h-12 rounded-full border-2 border-green-300"
          >
          <div class="flex-1">
            <p class="text-sm text-gray-500">已登入</p>
            <p id="user-display-name" class="font-semibold text-gray-700"></p>
          </div>
          <button
            @click="handleShowMyOrders"
            class="inline-flex items-center text-sm font-medium leading-none"
            style="color: var(--primary)"
          >
            <span class="tab-with-icon"><ListOrdered class="ui-action-icon" aria-hidden="true" />我的訂單</span>
          </button>
          <button
            @click="handleShowProfile"
            class="inline-flex items-center text-sm font-medium leading-none"
            style="color: var(--primary)"
          >
            <span class="tab-with-icon"><UserRound class="ui-action-icon" aria-hidden="true" />會員資料</span>
          </button>
          <button
            @click="handleStorefrontLogout"
            class="text-sm text-gray-500 hover:text-red-500"
          >
            登出
          </button>
        </div>
      </div>
      <input type="hidden" id="line-name">

      <!-- 商品列表 -->
      <div class="mb-6">
        <h2
          class="text-lg font-bold mb-4"
          style="color: var(--primary)"
          id="products-section-title"
        >
          <span class="section-heading-inline">
            <span class="ui-icon-title"><img id="products-section-icon" src="../../../icons/products-beans.png" alt="商品區塊圖示" class="ui-icon-img"></span>
            <span id="products-section-title-text">咖啡豆選購</span>
          </span>
        </h2>
        <div id="products-container" data-vue-managed="true">
          <div
            v-if="productsCategories.length === 0"
            class="space-y-3 animate-pulse"
          >
            <div class="h-16 bg-gray-100 rounded-xl"></div>
            <div class="h-16 bg-gray-100 rounded-xl"></div>
            <div class="h-16 bg-gray-100 rounded-xl"></div>
          </div>
          <template v-else>
            <div
              v-for="category in productsCategories"
              :key="category.name"
              class="mb-4"
            >
              <div class="category-header rounded-t-xl px-4 py-2 font-semibold">
                {{ category.name }}
              </div>
              <div
                class="space-y-0 border border-t-0 rounded-b-xl overflow-hidden"
                style="border-color:#e5ddd5;"
              >
                <div
                  v-for="product in category.products"
                  :key="product.id"
                  class="product-row p-3 border-b flex flex-col gap-2"
                  style="border-color:#f0e6db;"
                >
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="font-medium">
                        {{ product.name }}
                        <span
                          v-if="product.roastLevel"
                          class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-1"
                        >{{ product.roastLevel }}</span>
                      </div>
                      <span
                        v-if="product.description"
                        class="text-xs text-gray-500"
                      >{{ product.description }}</span>
                    </div>
                  </div>
                  <div class="flex gap-2 flex-wrap">
                    <div
                      v-for="spec in product.specs"
                      :key="`${product.id}-${spec.key}`"
                      class="spec-container flex-1 min-w-[80px] relative"
                    >
                      <button
                        v-if="getSpecQty(product.id, spec.key) <= 0"
                        class="spec-btn-add w-full text-xs sm:text-sm py-2 px-1 rounded-lg border-2 font-medium transition-all hover:shadow-md active:scale-95 flex flex-col items-center justify-center min-h-[48px]"
                        style="border-color:var(--secondary); color:var(--primary); background:#fefdf8;"
                        @click.prevent="changeSpecQty(product.id, spec.key, 1)"
                      >
                        <span>{{ spec.label }}</span>
                        <span class="font-bold">${{ spec.price }}</span>
                      </button>
                      <div
                        v-else
                        class="spec-btn-stepper w-full rounded-lg border-2 flex flex-col overflow-hidden"
                        style="border-color:var(--secondary); background:white;"
                      >
                        <div
                          class="text-xs sm:text-sm py-1.5 px-1 bg-amber-50 flex flex-col items-center justify-center border-b"
                          style="border-color:var(--secondary); color:var(--primary);"
                        >
                          <span>{{ spec.label }}</span>
                          <span class="font-bold">${{ spec.price }}</span>
                        </div>
                        <div
                          class="flex items-center justify-between px-1 py-1"
                          style="background:var(--secondary);"
                        >
                          <button
                            class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90"
                            @click.prevent="changeSpecQty(product.id, spec.key, -1)"
                          >
                            −
                          </button>
                          <div class="flex-1 flex items-center justify-center mx-1 overflow-hidden">
                            <span class="text-sm sm:text-base font-bold text-white spec-qty-text">
                              {{ getSpecQty(product.id, spec.key) }}
                            </span>
                          </div>
                          <button
                            class="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-white text-gray-800 font-bold shadow-sm flex items-center justify-center active:scale-90"
                            @click.prevent="changeSpecQty(product.id, spec.key, 1)"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 配送方式 -->
      <div class="mb-6">
        <h2
          class="text-lg font-bold mb-4"
          style="color: var(--primary)"
          id="delivery-section-title"
        >
          <span class="section-heading-inline">
            <span class="ui-icon-title"><img id="delivery-section-icon" src="../../../icons/delivery-truck.png" alt="配送區塊圖示" class="ui-icon-img"></span>
            <span id="delivery-section-title-text">配送方式</span>
          </span>
        </h2>
        <div
          class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4"
          id="delivery-options-list"
        >
          <!-- 由 JS 動態產生，依據 delivery_options_config -->
        </div>

        <!-- 配送到府地址 (限竹北/新竹) -->
        <div id="delivery-address-section" class="hidden fade-in p-4 rounded-xl ui-card-section">
          <h3 class="font-semibold mb-3" style="color: var(--primary)">
            <span class="tab-with-icon"><img src="../../../icons/location-pin.png" alt="" class="ui-icon-inline">配送地址 (限新竹市/竹北市)</span>
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">縣市</label>
              <select id="delivery-city" class="input-field">
                <option value="">請選擇</option>
                <option value="新竹市">新竹市</option>
                <option value="竹北市">竹北市</option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">區域</label>
              <select id="delivery-district" class="input-field">
                <option value="">請先選擇縣市</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">詳細地址</label>
            <input
              type="text"
              id="delivery-detail-address"
              class="input-field"
              placeholder="路/街、巷、弄、號、樓"
            >
          </div>
        </div>

        <!-- 全台宅配地址 -->
        <div id="home-delivery-section" class="hidden fade-in p-4 rounded-xl ui-card-section">
          <h3 class="font-semibold mb-3" style="color: var(--primary)">
            <span class="tab-with-icon"><img src="../../../icons/shipping-box.png" alt="" class="ui-icon-inline">全台宅配地址</span>
          </h3>

          <!-- tw-city-selector 容器 -->
          <div
            role="tw-city-selector"
            class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3"
          >
            <div>
              <label class="block text-sm text-gray-600 mb-1">縣市 <span
                  class="text-red-500"
                >*</span></label>
              <select class="county input-field"></select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">區域 <span
                  class="text-red-500"
                >*</span></label>
              <select class="district input-field"></select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">郵遞區號</label>
              <input
                class="zipcode input-field bg-gray-100"
                type="text"
                readonly
                placeholder="自動帶入"
              >
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">詳細地址 <span
                class="text-red-500"
              >*</span></label>
            <input
              type="text"
              id="home-delivery-detail"
              class="input-field"
              placeholder="路/街、巷、弄、號、樓"
            >
          </div>
        </div>

        <!-- 超商取貨 -->
        <div id="store-pickup-section" class="hidden fade-in p-4 rounded-xl ui-card-section">
          <h3 class="font-semibold mb-3" style="color: var(--primary)">
            <span class="tab-with-icon"><img src="../../../icons/store-front.png" alt="" class="ui-icon-inline">取貨門市資訊</span>
          </h3>
          <div class="mb-3 text-center">
            <UiButton data-action="open-store-map" class="store-select-btn">
              <span class="tab-with-icon"><img src="../../../icons/map-route.png" alt="" class="ui-icon-inline">選擇門市</span>
            </UiButton>
            <p class="text-xs text-gray-500 mt-1">
              點擊後將開啟超商地圖選擇門市
            </p>
          </div>
          <div id="store-selected-info" class="hidden store-info-card mb-3">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-semibold" id="selected-store-name"></p>
                <p class="text-sm text-gray-600" id="selected-store-address">
                </p>
                <p class="text-xs text-gray-400" id="selected-store-id"></p>
              </div>
              <UiButton
                data-action="clear-selected-store"
                variant="ghost"
                size="sm"
                class="text-red-600 hover:text-red-700"
              >
                清除
              </UiButton>
            </div>
          </div>
          <input type="hidden" id="store-name-input">
          <input type="hidden" id="store-address-input">
          <input type="hidden" id="store-id-input">
        </div>

        <!-- 來店取貨資訊 -->
        <div id="in-store-section" class="hidden fade-in p-4 rounded-xl ui-card-section mt-4">
          <h3 class="font-semibold mb-3 text-gray-800">
            <span class="tab-with-icon"><img src="../../../icons/store-front.png" alt="" class="ui-icon-inline">門市資訊</span>
          </h3>
          <p class="text-sm text-gray-700 leading-relaxed mb-3">
            <strong>地址：</strong>新竹市東區建中路101號1樓<br>
            <strong>電話：</strong><a
              href="tel:035718460"
              class="hover:underline text-blue-600"
            >03-5718460</a><br>
            <strong>官方 LINE：</strong><a
              href="https://lin.ee/aEiCEfh"
              target="_blank"
              class="hover:underline text-green-600 font-medium"
            >@scriptcoffee</a> <span
              class="text-xs text-gray-500"
            >(點擊加入官方 LINE 帳號)</span><br>
            <strong>營業時間：</strong>請以 Google 商家地圖上顯示的時間為準
          </p>
          <div class="flex flex-col sm:flex-row gap-3">
            <a
              href="https://maps.app.goo.gl/emnxgDhm3mRhCz5o7"
              target="_blank"
              class="inline-block text-sm font-medium hover:opacity-80 transition-opacity"
              style="color: var(--primary); text-decoration: underline"
            >
              <span class="tab-with-icon"><img src="../../../icons/map-route.png" alt="" class="ui-icon-inline">去 Google Maps 查看路線和營業時間</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 動態表單欄位 -->
      <div id="dynamic-fields-container"></div>

      <!-- 付款方式 -->
      <div id="payment-method-section" class="mb-6 fade-in">
        <h2
          class="text-lg font-bold mb-4"
          style="color: var(--primary)"
          id="payment-section-title"
        >
          <span class="section-heading-inline">
            <span class="ui-icon-title"><img src="../../../icons/payment-card.png" alt="付款圖示" class="ui-icon-img"></span>
            <span>付款方式</span>
          </span>
        </h2>
        <div
          class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4"
          id="payment-options"
        >
          <div
            class="payment-option active"
            id="cod-option"
            data-action="select-payment"
            data-method="cod"
          >
            <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
            <div class="option-icon" id="po-cod-icon-display"><img src="../../../icons/payment-cash.png" alt="貨到付款圖示" class="ui-icon-img"></div>
            <div class="font-semibold" id="po-cod-name-display">
              取件 / 到付
            </div>
            <div class="text-xs text-gray-500 mt-1" id="po-cod-desc-display">
              取貨時付現或宅配到付
            </div>
          </div>
          <div
            class="payment-option hidden"
            id="linepay-option"
            data-action="select-payment"
            data-method="linepay"
          >
            <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
            <div class="option-icon" id="po-linepay-icon-display"><img src="../../../icons/payment-linepay.png" alt="LINE Pay 圖示" class="ui-icon-img"></div>
            <div
              class="font-semibold text-[#06C755]"
              id="po-linepay-name-display"
            >
              LINE Pay
            </div>
            <div
              class="text-xs text-gray-500 mt-1"
              id="po-linepay-desc-display"
            >
              線上安全付款
            </div>
          </div>
          <div
            class="payment-option hidden"
            id="jkopay-option"
            data-action="select-payment"
            data-method="jkopay"
          >
            <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
            <div class="option-icon" id="po-jkopay-icon-display"><img src="../../../icons/payment-jkopay.png" alt="街口支付圖示" class="ui-icon-img"></div>
            <div
              class="font-semibold text-orange-600"
              id="po-jkopay-name-display"
            >
              街口支付
            </div>
            <div
              class="text-xs text-gray-500 mt-1"
              id="po-jkopay-desc-display"
            >
              街口支付線上付款
            </div>
          </div>
          <div
            class="payment-option hidden"
            id="transfer-option"
            data-action="select-payment"
            data-method="transfer"
          >
            <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
            <div class="option-icon" id="po-transfer-icon-display"><img src="../../../icons/payment-bank.png" alt="轉帳圖示" class="ui-icon-img"></div>
            <div
              class="font-semibold text-blue-600"
              id="po-transfer-name-display"
            >
              線上轉帳
            </div>
            <div
              class="text-xs text-gray-500 mt-1"
              id="po-transfer-desc-display"
            >
              ATM / 網銀匯款
            </div>
          </div>
        </div>

        <!-- 線上轉帳資訊 -->
        <div id="transfer-info-section" class="hidden fade-in p-4 rounded-xl ui-card-section">
          <h3 class="font-semibold mb-3" style="color: var(--primary)">
            <span class="tab-with-icon"><img src="../../../icons/payment-bank.png" alt="" class="ui-icon-inline">匯款資訊</span>
          </h3>

          <!-- 新增應付金額顯示 -->
          <div class="mb-3 p-3 bg-white rounded-lg border border-blue-100 flex justify-between items-center">
            <span class="text-sm text-gray-600">應匯款總金額</span>
            <span
              class="text-lg font-bold text-blue-600"
              id="transfer-total-amount"
            >{{ totalPriceText }}</span>
          </div>

          <div id="bank-accounts-list" class="mb-3"></div>
          <div class="mt-3">
            <label class="block text-sm text-gray-600 mb-1"
            >您的匯款帳號末 5 碼（供對帳用）</label>
            <input
              type="text"
              id="transfer-last5"
              class="input-field"
              placeholder="請輸入帳號末5碼"
              maxlength="5"
              pattern="\d{5}"
              inputmode="numeric"
            >
          </div>
        </div>
      </div>

      <!-- 政策同意 -->
      <div class="mb-4">
        <label class="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            id="policy-agree"
            class="mt-1 w-4 h-4 rounded accent-[#3C2415] shrink-0"
          >
          <span class="text-sm text-gray-600">
            我已閱讀並同意
            <a
              href="policy.html"
              target="_blank"
              class="font-medium underline hover:opacity-80"
              style="color: var(--primary)"
            >隱私權政策及退換貨政策</a>
          </span>
        </label>
        <p id="policy-agree-hint" class="hidden text-xs text-red-500 mt-1 ml-6">
          請先勾選同意政策後才能送出訂單
        </p>
      </div>

      <!-- 收據資訊 -->
      <div class="mb-6">
        <label class="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            id="receipt-request"
            class="mt-1 w-4 h-4 rounded accent-[#3C2415] shrink-0"
          >
          <span class="text-sm text-gray-700">我要索取免用統一發票收據</span>
        </label>
        <div
          id="receipt-fields"
          class="hidden mt-3 ml-6 p-3 rounded-xl border border-amber-200 bg-amber-50 space-y-3"
        >
          <div>
            <label class="block text-sm text-gray-600 mb-1">統一編號（選填）</label>
            <input
              id="receipt-tax-id"
              type="text"
              class="input-field"
              placeholder="若需公司報帳請填 8 碼統編"
              maxlength="8"
              pattern="\d{8}"
              inputmode="numeric"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">買受人（選填）</label>
            <input
              id="receipt-buyer"
              type="text"
              class="input-field"
              placeholder="請輸入買受人名稱"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-600 mb-1">地址（選填）</label>
            <input
              id="receipt-address"
              type="text"
              class="input-field"
              placeholder="請輸入收據地址"
            >
          </div>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              id="receipt-date-stamp"
              type="checkbox"
              class="w-4 h-4 rounded accent-[#3C2415] shrink-0"
            >
            <span class="text-sm text-gray-700">是否需要壓印日期</span>
          </label>
        </div>
      </div>

      <!-- 備註 -->
      <div class="mb-6">
        <label
          class="block font-medium mb-2"
          style="color: var(--primary)"
          id="notes-section-title"
        >
          <span class="section-heading-inline">
            <span class="ui-icon-title"><img id="notes-section-icon" src="../../../icons/notes-pencil.png" alt="備註區塊圖示" class="ui-icon-img"></span>
            <span id="notes-section-title-text">訂單備註</span>
          </span>
        </label>
        <UiTextarea
          id="order-note"
          class="input-field resize-none"
          rows="2"
          placeholder="如有特殊需求請在此備註..."
        />
      </div>

      <div class="content-spacer"></div>
    </UiCard>

    <!-- 底部固定欄 -->
    <div class="bottom-bar">
      <div class="w-full max-w-3xl mx-auto flex items-center justify-between">
        <div
          class="text-xl font-bold"
          style="color: var(--primary)"
          id="total-price"
        >
          <div
            v-if="cartSummary.totalDiscount > 0 || showShippingBadge"
            class="flex flex-col items-start justify-center"
          >
            <div class="flex items-center mb-0.5">
              <span
                v-if="cartSummary.totalDiscount > 0"
                style="background-color: #fee2e2; color: #dc2626; font-size: 11px; padding: 2px 6px; border-radius: 4px; margin-right: 4px;"
              >
                折 -${{ cartSummary.totalDiscount }}
              </span>
              <span
                v-if="showShippingBadge"
                style="background-color: #dbeafe; color: #2563eb; font-size: 11px; padding: 2px 6px; border-radius: 4px;"
              >
                {{ isFreeShipping ? "免運費" : `運費 $${cartSummary.shippingFee}` }}
              </span>
            </div>
            <div class="text-xl font-bold leading-tight">
              應付總額: {{ totalPriceText }}
            </div>
          </div>
          <div v-else class="text-xl font-bold">總金額: {{ totalPriceText }}</div>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="relative inline-flex items-center bg-amber-50 border-2 border-amber-200 text-amber-800 px-4 py-3 rounded-xl font-semibold text-sm leading-none hover:bg-amber-100 transition-colors"
            @click.prevent="toggleCartDrawer"
          >
            <span class="tab-with-icon"><ShoppingCart class="ui-action-icon" aria-hidden="true" />購物車</span> <span
              id="cart-badge"
              class="hidden ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center"
            >0</span>
          </button>
          <!-- 幽靈按鈕：防止舊版快取 JS 找不到物件而引發報錯 -->
          <button id="submit-btn" style="display: none"></button>
        </div>
      </div>
    </div>

    <!-- 購物車 Drawer -->
    <div
      id="cart-overlay"
      class="hidden fixed inset-0 bg-black bg-opacity-50 z-[60]"
      @click="toggleCartDrawer"
    >
    </div>
    <div
      id="cart-drawer"
      class="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[61] transform translate-x-full transition-transform duration-300 flex flex-col"
    >
      <div
        class="p-4 border-b flex justify-between items-center"
        style="border-color: #f0e6db"
      >
        <h3 class="text-lg font-bold" style="color: var(--primary)">
          <span class="tab-with-icon"><ShoppingCart class="ui-action-icon" aria-hidden="true" />購物車</span>
        </h3>
        <button
          class="text-gray-500 hover:text-gray-700 text-2xl"
          @click.prevent="toggleCartDrawer"
        >
          &times;
        </button>
      </div>
      <div id="cart-items" data-vue-managed="true" class="flex-1 overflow-y-auto p-4">
        <p v-if="cartItems.length === 0" class="text-center text-gray-400 py-8">
          購物車是空的
        </p>
        <template v-else>
          <div
            v-for="(item, index) in cartItems"
            :key="`${item.productId}-${item.specKey}`"
            class="flex items-center justify-between py-3 border-b"
            style="border-color:#f0e6db;"
          >
            <div class="flex-1 mr-3">
              <div class="font-medium text-sm flex items-center flex-wrap">
                {{ item.productName }}
                <span
                  v-if="isDiscountedItem(item)"
                  class="ml-2 inline-block bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded leading-tight"
                >
                  適用優惠
                </span>
              </div>
              <div class="text-xs text-gray-500">{{ item.specLabel }} · ${{ item.unitPrice }}</div>
            </div>
            <div class="flex items-center gap-1">
              <button
                class="quantity-btn"
                style="width:28px;height:28px;font-size:14px;"
                @click.prevent="changeCartItemQty(index, -1)"
              >
                −
              </button>
              <span class="w-8 text-center font-medium">{{ item.qty }}</span>
              <button
                class="quantity-btn"
                style="width:28px;height:28px;font-size:14px;"
                @click.prevent="changeCartItemQty(index, 1)"
              >
                +
              </button>
            </div>
            <div class="text-right ml-3 min-w-[60px]">
              <div class="font-semibold text-sm" style="color:var(--accent)">
                ${{ item.qty * item.unitPrice }}
              </div>
              <button
                class="text-xs text-red-400 hover:text-red-600"
                @click.prevent="removeCartIndex(index)"
              >
                移除
              </button>
            </div>
          </div>
        </template>
      </div>
      <div
        class="p-4 border-t"
        style="border-color: #f0e6db; background: #faf6f2"
      >
        <div
          id="cart-shipping-notice"
          class="mb-3"
          :class="{ hidden: !showShippingNotice }"
        >
          <div
            v-if="showShippingNotice"
            class="px-3 py-2 rounded-lg mb-1"
            style="background:#fef2f2; border:1px solid #fca5a5;"
          >
            <div class="flex justify-between items-center text-sm font-semibold" style="color:#991b1b;">
              <span>{{ shippingNoticeTitle }}</span>
              <span>+${{ cartSummary.shippingFee }}</span>
            </div>
            <div
              v-if="shippingDiff > 0"
              class="text-xs mt-1"
              style="color:#b91c1c;"
            >
              還差 ${{ shippingDiff }} 即可免運
            </div>
          </div>
        </div>
        <div
          id="cart-discount-details"
          class="mb-3 text-sm text-gray-600"
          :class="{ hidden: !showDiscountSection }"
        >
          <div
            v-if="showDiscountSection"
            class="border-b border-dashed border-[#e5ddd5] pb-2 mb-2"
          >
            <div class="font-semibold text-gray-700 mb-2">已套用優惠與折抵：</div>
            <div
              v-for="promo in cartSummary.appliedPromos"
              :key="promo.name"
              class="flex justify-between items-center text-red-600 mb-1"
            >
              <span>{{ promo.name }}</span>
              <span>-${{ promo.amount }}</span>
            </div>
            <div
              v-if="isFreeShipping"
              class="flex justify-between items-center text-blue-600 mb-1"
            >
              <span>{{ deliveryName }}免運{{ freeShippingThresholdText }}</span>
              <span>免運費</span>
            </div>
          </div>
        </div>
        <div class="flex justify-between items-center mb-3">
          <span class="font-semibold text-gray-700">合計</span>
          <span
            id="cart-total"
            class="text-xl font-bold"
            style="color: var(--primary)"
          >{{ totalPriceText }}</span>
        </div>
        <UiButton
          class="btn-primary w-full"
          id="cart-submit-btn"
          @click.prevent="submitOrderFromCart"
        >
          確認送出訂單
        </UiButton>
      </div>
    </div>

    <!-- 我的訂單彈窗 -->
    <div
      id="my-orders-modal"
      class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="text-lg font-bold" style="color: var(--primary)">
            <span class="tab-with-icon"><ListOrdered class="ui-action-icon" aria-hidden="true" />我的訂單</span>
          </h3>
          <button
            data-action="close-orders-modal"
            class="text-gray-500 hover:text-gray-700 text-2xl"
          >
            &times;
          </button>
        </div>
        <div id="my-orders-list" class="flex-1 overflow-y-auto p-4"></div>
      </div>
    </div>

</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ListOrdered, ShoppingCart, UserRound } from "lucide-vue-next";
import UiButton from "../components/ui/button/Button.vue";
import UiCard from "../components/ui/card/Card.vue";
import UiTextarea from "../components/ui/textarea/Textarea.vue";
import {
  addToCart,
  getCartSnapshot,
  removeCartItem,
  toggleCart,
  updateCartItemQty,
  updateCartItemQtyByKeys,
} from "../../../js/cart.js";
import { getDefaultIconUrl } from "../../../js/icons.js";
import {
  initMainApp,
  logoutCurrentUser,
  showProfileModal,
  startMainLogin,
} from "../../../js/main-app.js";
import { showMyOrders, submitOrder } from "../../../js/orders.js";
import { getProductsViewModel } from "../../../js/products.js";

const originalBodyClass = document.body.className;
const productsCategories = ref([]);
const cartItems = ref([]);
const selectedDelivery = ref("");
const deliveryName = ref("該配送方式");
const shippingConfig = ref(null);
const selectedCheckIconUrl = getDefaultIconUrl("selected");
const cartSummary = ref({
  subtotal: 0,
  appliedPromos: [],
  totalDiscount: 0,
  discountedItemKeys: [],
  afterDiscount: 0,
  totalAfterDiscount: 0,
  shippingFee: 0,
  finalTotal: 0,
  quoteAvailable: false,
});

const discountedItemKeySet = computed(() =>
  new Set(Array.isArray(cartSummary.value.discountedItemKeys)
    ? cartSummary.value.discountedItemKeys
    : []),
);

const totalPriceText = computed(() =>
  `$${Number(cartSummary.value.finalTotal || 0)}`,
);

const hasPromos = computed(() =>
  cartSummary.value.totalDiscount > 0 &&
  Array.isArray(cartSummary.value.appliedPromos) &&
  cartSummary.value.appliedPromos.length > 0,
);

const hasShippingRule = computed(() => {
  const fee = Number(shippingConfig.value?.fee || 0);
  const threshold = Number(shippingConfig.value?.freeThreshold || 0);
  const quoteFee = Number(cartSummary.value.shippingFee || 0);
  return threshold > 0 || fee > 0 || quoteFee > 0;
});

const showShippingBadge = computed(() =>
  !!(
    selectedDelivery.value &&
    cartSummary.value.quoteAvailable &&
    hasShippingRule.value
  ),
);

const isFreeShipping = computed(() =>
  !!(
    showShippingBadge.value &&
    Number(shippingConfig.value?.freeThreshold || 0) > 0 &&
    Number(cartSummary.value.shippingFee || 0) === 0
  ),
);

const showShippingNotice = computed(() =>
  !!(
    showShippingBadge.value &&
    !isFreeShipping.value &&
    Number(cartSummary.value.shippingFee || 0) > 0
  ),
);

const shippingNoticeTitle = computed(() =>
  Number(shippingConfig.value?.freeThreshold || 0) > 0
    ? `未達 ${deliveryName.value}免運門檻`
    : `${deliveryName.value}運費`,
);

const showDiscountSection = computed(() =>
  hasPromos.value || isFreeShipping.value,
);

const shippingDiff = computed(() => {
  const threshold = Number(shippingConfig.value?.freeThreshold || 0);
  if (!threshold) return 0;
  const diff = threshold - Number(cartSummary.value.totalAfterDiscount || 0);
  return diff > 0 ? diff : 0;
});

const freeShippingThresholdText = computed(() => {
  const threshold = Number(shippingConfig.value?.freeThreshold || 0);
  return threshold > 0 ? ` (滿$${threshold})` : "";
});

const cartQtyMap = computed(() => {
  const map = new Map();
  cartItems.value.forEach((item) => {
    map.set(
      `${Number(item.productId)}-${String(item.specKey || "")}`,
      Math.max(1, Number(item.qty) || 1),
    );
  });
  return map;
});

function itemKey(productId, specKey = "") {
  return `${Number(productId)}-${String(specKey || "")}`;
}

function getSpecQty(productId, specKey) {
  return cartQtyMap.value.get(itemKey(productId, specKey)) || 0;
}

function isDiscountedItem(item) {
  return discountedItemKeySet.value.has(itemKey(item.productId, item.specKey));
}

function changeSpecQty(productId, specKey, delta) {
  if (delta > 0 && getSpecQty(productId, specKey) <= 0) {
    addToCart(productId, specKey);
    return;
  }
  updateCartItemQtyByKeys(productId, specKey, delta);
}

function changeCartItemQty(index, delta) {
  updateCartItemQty(index, delta);
}

function removeCartIndex(index) {
  removeCartItem(index);
}

function toggleCartDrawer() {
  toggleCart();
}

function submitOrderFromCart() {
  toggleCart();
  void submitOrder();
}

function handleStorefrontLogin() {
  void startMainLogin();
}

function handleStorefrontLogout() {
  logoutCurrentUser();
}

function handleShowProfile() {
  void showProfileModal();
}

function handleShowMyOrders() {
  void showMyOrders();
}

function handleProductsUpdated(event) {
  const detail = event?.detail || {};
  productsCategories.value = Array.isArray(detail.categories)
    ? detail.categories
    : [];
}

function handleCartUpdated(event) {
  const detail = event?.detail || {};
  cartItems.value = Array.isArray(detail.items) ? detail.items : [];
  selectedDelivery.value = String(detail.selectedDelivery || "");
  deliveryName.value = String(detail.deliveryName || "該配送方式");
  shippingConfig.value = detail.shippingConfig || null;
  cartSummary.value = {
    ...cartSummary.value,
    ...(detail.summary || {}),
  };
}

onMounted(() => {
  document.body.className = "p-4 md:p-6";

  window.addEventListener("coffee:products-updated", handleProductsUpdated);
  window.addEventListener("coffee:cart-updated", handleCartUpdated);

  const productsContainer = document.getElementById("products-container");
  const cartContainer = document.getElementById("cart-items");
  if (productsContainer) productsContainer.dataset.vueManaged = "true";
  if (cartContainer) cartContainer.dataset.vueManaged = "true";

  const productVm = getProductsViewModel();
  productsCategories.value = Array.isArray(productVm.categories)
    ? productVm.categories
    : [];
  cartItems.value = getCartSnapshot();

  void initMainApp();
});

onBeforeUnmount(() => {
  window.removeEventListener("coffee:products-updated", handleProductsUpdated);
  window.removeEventListener("coffee:cart-updated", handleCartUpdated);
  document.body.className = originalBodyClass;
});
</script>
