# ☕ 咖啡訂購系統 — 部署指南

## 架構總覽

```
前端 (GitHub Pages)          後端 (Supabase)
┌──────────────────┐        ┌──────────────────────┐
│  main.html       │───────▶│  Edge Function        │
│  (顧客訂購頁面)   │        │  coffee-api/index.ts  │
├──────────────────┤        ├──────────────────────┤
│  dashboard.html  │───────▶│  PostgreSQL DB        │
│  (後台管理頁面)   │        │  (schema.sql)         │
└──────────────────┘        └──────────────────────┘
        │                           │
        └───── LINE Login ──────────┘
```

---

## 一、Supabase 設定

### 1.1 建立專案

1. 前往 [supabase.com](https://supabase.com) 建立新專案
2. 記下以下資訊（Settings → API）：
   - **Project URL**：`https://xxxxxx.supabase.co`
   - **Service Role Key**：`eyJhbGci...`（⚠️ 勿公開）
   - **Project Ref**：URL 中的 `xxxxxx` 部分

### 1.2 建立資料庫

1. 進入 Supabase Dashboard → **SQL Editor**
2. 複製 `supabase/schema_full.sql` 的完整內容貼上執行
3. 確認已建立 7 張表：
   - `coffee_categories`、`coffee_products`、`coffee_orders`
   - `coffee_settings`、`coffee_users`
   - `coffee_store_selections`、`coffee_form_fields`

### 1.3 設定環境變數 (Secrets)

進入 Supabase Dashboard → **Edge Functions** → **Secrets**，新增以下變數：

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `LINE_LOGIN_CHANNEL_ID` | LINE Login Channel ID | `1234567890` |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login Channel Secret | `abcdef1234567890` |
| `LINE_ADMIN_USER_ID` | 管理員的 LINE User ID | `U1234567890abcdef...` |
| `JWT_SECRET` | JWT 簽章秘鑰 (安全長字串) | `my_super_secret_jwt_key_32_chars` |
| `ECPAY_MERCHANT_ID` | 綠界特店編號 | `3339283` (測試環境) |
| `ECPAY_HASH_KEY` | 綠界 Hash Key | `Dbxpzi6EQdrOM46j` (測試環境) |
| `ECPAY_HASH_IV` | 綠界 Hash IV | `OqMti7T9ZMs1OvLD` (測試環境) |
| `ALLOWED_REDIRECT_ORIGINS`| 允許跳轉的來源網域 (防護) | `https://your-github-account.github.io` |

> ⚠️ `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 為 Edge Function 內建變數，**無需手動設定**。

### 1.4 部署 Edge Function

```bash
# 安裝 Supabase CLI（如果還沒裝）
npm install -g supabase

# 登入
supabase login

# 連結到你的專案
supabase link --project-ref <你的_PROJECT_REF>

# 部署 Edge Function
supabase functions deploy coffee-api --no-verify-jwt
```

> `--no-verify-jwt` 是必須的，因為前端使用公開 API 呼叫，不帶 JWT。

---

## 二、LINE Login 設定

### 2.1 建立 LINE Login Channel

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立 Provider（如果沒有的話）
3. 建立 **LINE Login** Channel
4. 記下 **Channel ID** 和 **Channel Secret**

### 2.2 設定 Callback URL

在 LINE Login Channel → **LINE Login** 分頁 → **Callback URL**，加入：

```
https://<你的GitHub帳號>.github.io/<倉庫名>/main.html
https://<你的GitHub帳號>.github.io/<倉庫名>/dashboard.html
```

例如：
```
https://scriptcoffeeshop.github.io/sc/main.html
https://scriptcoffeeshop.github.io/sc/dashboard.html
```

### 2.3 取得管理員 LINE User ID

管理員第一次使用 LINE Login 時，可以從 Supabase Dashboard → `coffee_users` 表中查到你的 `line_user_id`，
將它填入 Edge Function 的 `LINE_ADMIN_USER_ID` 環境變數。

---

## 三、GitHub Pages 部署

### 3.1 建立 GitHub Repository

```bash
# 初始化 Git（如果還沒有）
cd 咖啡訂購
git init
git remote add origin https://github.com/<帳號>/<倉庫名>.git
```

### 3.2 修改前端設定

部署前，請確認 `main.html` 和 `dashboard.html` 中的兩個常數：

**main.html：**
```javascript
const API_URL = 'https://<PROJECT_REF>.supabase.co/functions/v1/coffee-api';
const LINE_LOGIN_REDIRECT_URI = 'https://<帳號>.github.io/<倉庫名>/main.html';
```

**dashboard.html：**
```javascript
const API_URL = 'https://<PROJECT_REF>.supabase.co/functions/v1/coffee-api';
const LINE_LOGIN_REDIRECT_URI = 'https://<帳號>.github.io/<倉庫名>/dashboard.html';
```

### 3.3 推送並啟用 GitHub Pages

```bash
# 只上傳前端 HTML 檔案
git add main.html dashboard.html
git commit -m "部署咖啡訂購系統前端"
git push -u origin main
```

1. 前往 GitHub → 倉庫 → **Settings** → **Pages**
2. Source 選擇 **Deploy from a branch**
3. Branch 選擇 `main`，目錄選 `/ (root)`
4. 點擊 Save

等待 1-2 分鐘即可訪問：
- 前台：`https://<帳號>.github.io/<倉庫名>/main.html`
- 後台：`https://<帳號>.github.io/<倉庫名>/dashboard.html`

---

## 四、部署後驗證清單

- [ ] 前台頁面可正常開啟，商品列表正確載入
- [ ] LINE Login 可正常登入（前台 + 後台）
- [ ] 前台可成功送出訂單
- [ ] 後台可看到訂單、更改訂單狀態
- [ ] 後台可管理商品（新增/編輯/刪除）
- [ ] 後台可管理分類（新增/排序/刪除）
- [ ] 後台設定的「休息中」狀態，前台會顯示暫停接單
- [ ] 後台設定的公告，前台會正確顯示

---

## 五、檔案結構

```
咖啡訂購/
├── main.html              # 前台：顧客訂購頁面
├── dashboard.html         # 後台：管理員管理頁面
├── DEPLOY.md              # 本部署指南
└── supabase/
    ├── schema_full.sql     # 資料庫完整建表語句 (含所有表與安全設定)
    └── functions/
        └── coffee-api/
            └── index.ts    # Edge Function 主程式
```

---

## 六、常見問題

### Q: LINE Login 失敗，顯示「驗證失敗」？
**A:** 檢查 LINE Developers Console 的 Callback URL 是否與 `LINE_LOGIN_REDIRECT_URI` 完全一致（包含 `https://`）。

### Q: 前台顯示「載入失敗」？
**A:** 檢查 `API_URL` 是否正確，以及 Edge Function 是否已部署。可以在瀏覽器直接訪問：
`https://<PROJECT_REF>.supabase.co/functions/v1/coffee-api?action=getProducts`

### Q: 後台登入後顯示「無管理員權限」？
**A:** 確認 `LINE_ADMIN_USER_ID` 環境變數已正確設定為你的 LINE User ID。

### Q: 更新 Edge Function 後如何重新部署？
```bash
supabase functions deploy coffee-api --no-verify-jwt
```
