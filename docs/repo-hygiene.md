# Repo Hygiene 與敏感資訊處理

## 現行規則

- `.env*` 一律視為本機敏感檔，只有 `.example` / `.sample` / `.template` 類範本可進 git。
- `supabase/.temp/` 視為 Supabase CLI 產生的本機暫存資料，不應追蹤。
- 可執行 `python3 scripts/repo_hygiene_check.py` 檢查目前 tracked file 是否違規。

## 本專案已知風險

- `.env.staging` 雖已從目前追蹤移除，但 git 歷史仍可在 `2a6515f`、`5032df5` 看到該檔案。
- 這代表當時寫入 `.env.staging` 的所有真實金鑰，都必須視為已外洩並完成輪替。

## 建議處理順序

1. 先輪替 `.env.staging` 中曾出現的所有金鑰與密碼。
2. 確認 GitHub Secrets、Supabase Secrets、第三方平台憑證都已更新。
3. 再進行 git 歷史清理。

## 歷史清理建議

以下操作會改寫 commit history，必須通知所有協作者，並在執行後使用 `force-with-lease` 推送：

```bash
python3 -m git_filter_repo --path .env.staging --invert-paths
git push --force-with-lease origin main
git push --force-with-lease --tags
```

如果本機尚未安裝 `git-filter-repo`，可先安裝：

```bash
python3 -m pip install git-filter-repo
```

## 協作者後續動作

- 重新 clone repo，或在確認沒有本地未提交變更後重設到新歷史。
- 刪除所有舊備份、舊 build artifact、舊 CI cache 中可能包含的敏感檔。
