<template>
  <div
    id="announcement-banner"
    class="hidden max-w-3xl mx-auto mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 relative"
  >
    <button
      type="button"
      aria-label="關閉公告"
      class="absolute top-2 right-3 text-amber-500 hover:text-amber-700 text-xl"
      @click="$emit('close-announcement')"
    >
      &times;
    </button>
    <p id="announcement-text" class="pr-6"></p>
  </div>

  <div class="max-w-3xl mx-auto">
    <div class="flex items-center gap-3 mb-6">
      <span id="site-icon">
        <img src="../../../../icons/logo.png" alt="品牌圖示" class="ui-icon-img">
      </span>
      <div>
        <h1
          id="site-title"
          class="text-2xl font-bold"
          style="color: var(--primary)"
        >
          Script Coffee
        </h1>
        <p id="site-subtitle" class="text-sm text-gray-500">
          咖啡豆 | 耳掛
        </p>
      </div>
    </div>

    <div id="login-section" class="mb-6 px-4 py-4 sm:px-5 rounded-xl ui-card-section">
      <div
        id="login-prompt"
        class="flex flex-col items-center justify-center gap-3 text-center"
      >
        <p class="text-gray-600 leading-relaxed">請先使用 LINE 帳號登入以進行訂購</p>
        <UiButton
          class="h-11 px-6 shrink-0 whitespace-nowrap bg-[#06c755] hover:bg-[#05b84e]"
          @click="$emit('login')"
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
          class="inline-flex items-center text-sm font-medium leading-none"
          style="color: var(--primary)"
          @click="$emit('show-my-orders')"
        >
          <span class="tab-with-icon"><ListOrdered class="ui-action-icon" aria-hidden="true" />我的訂單</span>
        </button>
        <button
          class="inline-flex items-center text-sm font-medium leading-none"
          style="color: var(--primary)"
          @click="$emit('show-profile')"
        >
          <span class="tab-with-icon"><UserRound class="ui-action-icon" aria-hidden="true" />會員資料</span>
        </button>
        <button
          class="text-sm text-gray-500 hover:text-red-500"
          @click="$emit('logout')"
        >
          登出
        </button>
      </div>
    </div>
  </div>
  <input type="hidden" id="line-name">
</template>

<script setup lang="ts">
import { ListOrdered, UserRound } from "lucide-vue-next";
import UiButton from "../../components/ui/button/Button.vue";

defineEmits<{
  "close-announcement": [];
  login: [];
  "show-my-orders": [];
  "show-profile": [];
  logout: [];
}>();
</script>
