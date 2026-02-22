# 專案開發規則 (Project Rules)

每次進行任何修改後，請務必遵照以下規則：

1. **自動部署與推送**： 
   - 每次修改程式碼後，必須自動將更改後的內容（不含資料庫與後端邏輯）推送到 GitHub。
   - **請注意**：不將任何與資料庫及 Supabase 相關的檔案（例如 `supabase/` 目錄）推送到 GitHub，已設定於 `.gitignore` 中。
   - 若有修改 Supabase Edge Functions (`supabase/functions/coffee-api/index.ts` 等），必須自動部署到 Supabase。
2. **使用語言**：
   - 所有的回應和您的內部推理過程（思考過程）都必須以繁體中文（Traditional Chinese）顯示。
