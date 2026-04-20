# Repo Hygiene 與敏感資訊處理

## 現行規則

- `.env*` 一律視為本機敏感檔，只有 `.example` / `.sample` / `.template` 類範本可進 git。
- `supabase/.temp/` 視為 Supabase CLI 產生的本機暫存資料，不應追蹤。
- 可執行 `python3 scripts/repo_hygiene_check.py` 檢查目前 tracked file 是否違規。

## 本專案已知風險

- `.env.staging` 已於 2026-04-20 完成 git 歷史清理，不再存在於目前可達 commit history。
- 但曾經出現在 `.env.staging` 的真實金鑰仍必須視為已外洩，必須完成輪替；歷史清理不等於金鑰自動恢復安全。

## 建議處理順序

1. 先輪替 `.env.staging` 中曾出現的所有金鑰與密碼。
2. 確認 GitHub Secrets、Supabase Secrets、第三方平台憑證都已更新。
3. 若要驗證歷史清理狀態，可執行 `git rev-list --all -- .env.staging`，正常情況應無輸出。

## 歷史清理狀態

- 歷史清理已完成，執行方式為：

```bash
python3 -m git_filter_repo --path .env.staging --invert-paths
git push --force-with-lease origin main
git push --force-with-lease --tags
```

- 後續不應再重做一次同樣的歷史清理，除非又有新的敏感檔進入版本庫。
- 若本機尚未安裝 `git-filter-repo`，可先安裝：

```bash
python3 -m pip install git-filter-repo
```

## 協作者後續動作

- 重新 clone repo，或在確認沒有本地未提交變更後重設到新歷史。
- 刪除所有舊備份、舊 build artifact、舊 CI cache 中可能包含的敏感檔。
