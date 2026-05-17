# 程式碼庫問題盤點與任務提案（2026-04-09）

> 目標：針對目前程式碼庫提出 4 類型的可執行修正任務：拼字錯誤、程式錯誤、評論/文件差異、測試改進。

## 1) 拼字錯誤修正任務

**任務名稱**：修正 `DEV_CONTEXT.md` 的網域拼字錯誤

- **觀察到的問題**：`DEV_CONTEXT.md` 仍有 `scriptcofee.com.tw`（少一個 `f`）的紀錄文字。
- **影響**：歷史紀錄與真實網域不一致，容易讓維運或回溯時誤判。
- **建議作法**：將該紀錄文字統一修正為 `scriptcoffee.com.tw`，並加註「修正文案拼字，不影響程式行為」。
- **驗收條件**：全文搜尋不再出現 `scriptcofee.com.tw`。

## 2) 程式錯誤修正任務

**任務名稱**：移除 `dashboard.html` 的 inline onclick，改為事件代理

- **觀察到的問題**：`dashboard.html` 內仍有 `onclick="document.getElementById('s-site-icon-upload').click()"`。
- **影響**：
  - 破壞既有事件代理策略一致性。
  - 在更嚴格 CSP 設定下可能失效。
  - 增加維護成本（行為分散於 HTML 與 JS）。
- **建議作法**：
  1. 移除 inline `onclick`。
  2. 改成 `data-action`（例如 `data-action="trigger-site-icon-upload"`）。
  3. 在對應的 dashboard 事件委派處理器新增 handler。
- **驗收條件**：無 inline 事件屬性且上傳按鈕功能不變。

## 3) 程式碼評論/文件差異修正任務

**任務名稱**：校正事件委派檢查腳本註解與實際檢查範圍

- **觀察到的問題**：`scripts/check_dashboard_event_delegation.py` 的註解寫的是「dashboard files」，但目前 `TARGETS` 不包含 legacy `dashboard.html`。
- **影響**：文件/註解宣稱與實作行為不一致，容易造成「以為有檢查、其實未覆蓋」的認知落差。
- **建議作法**（二擇一，擇優）：
  - **A. 擴大實作**：把 `dashboard.html` 納入 `TARGETS`，使註解與行為一致。
  - **B. 修正文案**：若刻意只檢查 Vue 來源，請明確改註解為「僅檢查 frontend Vue dashboard 與相關 JS 模組」。
- **驗收條件**：註解與檢查範圍可一一對應，避免誤導。

## 4) 測試改進任務

**任務名稱**：新增「無 inline event」守門測試並納入 CI

- **觀察到的問題**：目前 CI 已執行 `check_dashboard_event_delegation.py`，但無法保證 legacy HTML 不會再引入 inline handler。
- **影響**：回歸風險偏高，容易再次出現違規事件綁定。
- **建議作法**：
  1. 新增針對 `main.html`、`dashboard.html`、`policy.html`（與 `frontend/*.html` 視需要）的靜態檢查腳本。
  2. 在 CI workflow 加入此檢查步驟。
  3. 測試失敗訊息需指出檔案與行號。
- **驗收條件**：
  - 人為加入 `onclick=` 時 CI 必須失敗。
  - 移除後 CI 恢復通過。

