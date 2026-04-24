<template>
    <UiCard class="max-w-3xl mx-auto p-6 md:p-8">
      <!-- 標題 -->
      <div class="flex items-center gap-3 mb-6">
        <a
          href="main.html"
          class="text-2xl hover:opacity-70 transition-opacity"
          title="返回訂購頁"
        >←</a>
        <div>
          <h1 class="text-2xl font-bold" style="color: var(--primary)">
            服務條款與政策
          </h1>
          <p class="text-sm text-gray-500">隱私權政策 ・ 退換貨政策</p>
        </div>
      </div>

      <!-- 隱私權政策 -->
      <div class="policy-section ui-card-section" id="privacy">
        <h2>隱私權政策</h2>

        <h3>一、個人資料之蒐集</h3>
        <p>我們透過 LINE 第三方登入及訂單表單蒐集您的以下資訊：</p>
        <ul>
          <li>LINE 帳號顯示名稱與頭像</li>
          <li>您所填寫的聯絡電話、電子郵件</li>
          <li>配送地址或超商取貨門市資訊</li>
          <li>訂單明細及付款相關資訊</li>
        </ul>

        <h3>二、個人資料之利用目的</h3>
        <p>所蒐集之個人資料僅用於以下目的：</p>
        <ul>
          <li>訂單處理、配送與出貨通知</li>
          <li>客戶服務聯繫與售後處理</li>
          <li>付款對帳與交易紀錄保存</li>
          <li>透過 LINE 傳送訂單狀態更新</li>
        </ul>

        <h3>三、個人資料之保護</h3>
        <ul>
          <li>所有資料傳輸均使用 HTTPS 加密</li>
          <li>資料庫存取受 RLS（Row Level Security）保護</li>
          <li>
            我們不會將您的個人資料售予或提供給第三方，除非為配送所需或法律要求
          </li>
        </ul>

        <h3>四、Cookie 與快取</h3>
        <p>
          本站使用瀏覽器 LocalStorage
          儲存您的登入狀態與購物車資料，以提升使用體驗。您可隨時清除瀏覽器快取來移除這些資料。
        </p>

        <h3>五、個人資料之刪除</h3>
        <p>
          如需刪除您的帳戶或個人資料，請透過官方 LINE 帳號聯繫我們，我們將於 30
          日內完成處理。
        </p>
      </div>

      <!-- 退換貨政策 -->
      <div class="policy-section ui-card-section" id="return">
        <h2>退換貨政策</h2>

        <h3>一、退換貨條件</h3>
        <p>由於咖啡豆為食品類商品，退換貨適用以下條件：</p>
        <div class="highlight-box">
          <strong>可申請退換貨之情形：</strong>
          <ul>
            <li>收到商品與訂單內容不符（品項錯誤、規格錯誤）</li>
            <li>商品於運送過程中損壞（包裝破裂、受潮等）</li>
            <li>商品有明顯瑕疵或品質異常</li>
          </ul>
        </div>
        <div class="highlight-box" style="border-left-color: #e57373">
          <strong>不適用退換貨之情形：</strong>
          <ul>
            <li>已拆封使用之商品（基於食品衛生安全）</li>
            <li>因個人口味偏好不符而申請退貨</li>
            <li>超過退換貨申請期限</li>
          </ul>
        </div>

        <h3>二、退換貨期限</h3>
        <p>
          請於<strong>收到商品後 7
            日內</strong>聯繫我們提出退換貨申請。逾期恕不受理。
        </p>

        <h3>三、退換貨流程</h3>
        <ol>
          <li>透過官方 LINE 帳號聯繫客服，說明退換貨原因</li>
          <li>提供訂單編號及商品照片（如有瑕疵請拍照存證）</li>
          <li>經確認後，我們將安排退換貨方式</li>
          <li>退款將於收到退回商品並確認後 7 個工作日內處理</li>
        </ol>

        <h3>四、退款方式</h3>
        <ul>
          <li><strong>貨到付款 / 來店自取</strong>：以銀行轉帳方式退款</li>
          <li><strong>線上轉帳</strong>：退款至原匯款帳戶</li>
          <li><strong>LINE Pay</strong>：退款至原 LINE Pay 帳戶</li>
        </ul>

        <h3>五、運費負擔</h3>
        <p>
          若退換貨原因為商家問題（商品瑕疵、出貨錯誤），運費由商家負擔。若為消費者個人因素，運費由消費者自行負擔。
        </p>
      </div>

      <!-- 聯絡資訊 -->
      <div class="policy-section ui-card-section">
        <h2>聯絡我們</h2>
        <p>如有任何疑問，歡迎透過以下方式聯繫：</p>
        <ul>
          <li>
            <strong>官方 LINE</strong>：<a
              href="https://lin.ee/aEiCEfh"
              target="_blank"
              class="text-green-600 font-medium hover:underline"
            >@scriptcoffee</a>
          </li>
          <li>
            <strong>電話</strong>：<a
              href="tel:035718460"
              class="text-blue-600 hover:underline"
            >03-5718460</a>
          </li>
          <li><strong>地址</strong>：新竹市東區建中路101號1樓</li>
        </ul>
      </div>

      <!-- 返回按鈕 -->
      <div class="text-center mt-6">
        <a
          href="main.html"
          class="inline-block btn-primary px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
        >
          ← 返回訂購頁
        </a>
      </div>

      <div class="text-center text-xs text-gray-400 mt-4">
        最後更新日期：2026 年 3 月 2 日
      </div>
    </UiCard>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import UiCard from "../components/ui/card/Card.vue";

const originalBodyClass = document.body.className;

onMounted(() => {
  document.body.className = "p-4 md:p-6";
});

onBeforeUnmount(() => {
  document.body.className = originalBodyClass;
});
</script>

<style>
.policy-section {
  margin-bottom: 2rem;
}

.policy-section h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--secondary);
}

.policy-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #4a3728;
  margin: 1rem 0 0.5rem;
}

.policy-section p,
.policy-section li {
  color: #555;
  line-height: 1.8;
  font-size: 0.925rem;
}

.policy-section ul {
  list-style: disc;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.policy-section ol {
  list-style: decimal;
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.highlight-box {
  background: #fef9f0;
  border-left: 4px solid var(--secondary);
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
  margin: 0.75rem 0;
}
</style>
