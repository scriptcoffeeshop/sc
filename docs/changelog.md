# 專案變更摘要

本檔保存 `DEV_CONTEXT.md` 不再承載的較長歷史摘要。它不是完整 changelog；精確差異仍以 git history 為準。

## 2026-04-19

- 補齊 GitHub Actions 自動部署鏈：前端部署到 GitHub Pages，Supabase `db push` 與 `coffee-api` deploy 可由 CI 執行。
- 新增 `scripts/prepare_static_deploy.sh`，確保 `CNAME`、Google 驗證檔與 `icons/` 進入部署產物。
- 修正 GitHub CI 對無 lockfile 與缺少 Supabase secrets 的相容行為。

## 2026-04-18

- 補齊街口支付訂單狀態流、付款欄位、同步邏輯與 LINE 通知追蹤。
- `coffee_orders` 新增多個付款與通知追蹤欄位，並同步 `schema_full.sql`。

## 維護原則

- 最近一週內、會影響交接判斷的摘要放在 `DEV_CONTEXT.md`。
- 超過一週且仍值得保留的背景移到本檔。
- 一般小修不進文件，以 git commit history 查詢。
