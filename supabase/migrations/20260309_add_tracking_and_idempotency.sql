-- 修正 P0 Schema 漂移漏洞：加入漏掉的欄位供新環境或已上線環境補齊
ALTER TABLE coffee_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT DEFAULT '';
ALTER TABLE coffee_orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
