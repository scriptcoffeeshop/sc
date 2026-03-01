# 專案開發規則 (Project Rules)

每次進行任何修改後，請務必遵照以下規則：

1. **自動部署與推送**： 
   - 每次修改程式碼後，必須自動將更改後的內容推送到 GitHub。
   - **暫時規則**：目前將整個專案檔案（包含 `supabase/` 目錄）都推送到 GitHub。
   - **專案完成時的清理動作**：當我表示「已完成此專案」時，必須將 GitHub 上除了 GitHub Pages 用得到的檔案以外的所有檔案（例如後端及資料庫部分）都刪除。
   - 若有修改 Supabase Edge Functions (`supabase/functions/coffee-api/index.ts` 等），必須自動部署到 Supabase。**每次推送都需要加上 `--no-verify-jwt` 參數**（例如：`supabase functions deploy coffee-api --no-verify-jwt`）。
2. **使用語言**：
   - 所有的回應和您的內部推理過程（思考過程）都必須以繁體中文（Traditional Chinese）顯示。
3. **文字說明修改規定**：
   - 撰寫程式的過程中，程式呈現的文字說明部分，若沒有明確提及需要修改，則**嚴格禁止擅自修改**。
   - 若認為有修改必要，必須在修改前先經過我的同意。
4. **開發架構規範**：
   - 後端 Edge Functions 的代碼增修必須遵循**模組化架構**。
   - 業務邏輯型代碼應放入 `api/`，工具型函數放入 `utils/`，並在 `index.ts` 進行路由分派。
   - 所有資料變更的 API 必須定義對應的 **Zod Schema** 進行驗證。
5. **脈絡繼承與延續開發**：
   - 每次開啟新對話或重新讀取專案時，**必須優先讀取 `DEV_CONTEXT.md`**，以快速掌握該專案過去的重要除錯經驗與排版變更脈絡。
6. **Browser Subagent 授權**：
   - 使用 `browser_subagent` 進行測試時，請自動允許所有動作 (例如執行 JavaScript 等)。
