-- v45: 訂單去重與欄位改善
-- 1) 新增 idempotency_key 欄位 + unique constraint
ALTER TABLE coffee_orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON coffee_orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL AND idempotency_key != '';

-- 2) 補齊 coffee_users 表的 delivery 預設欄位（若尚不存在）
ALTER TABLE coffee_users
  ADD COLUMN IF NOT EXISTS default_delivery_method TEXT DEFAULT '';
ALTER TABLE coffee_users
  ADD COLUMN IF NOT EXISTS default_city TEXT DEFAULT '';
ALTER TABLE coffee_users
  ADD COLUMN IF NOT EXISTS default_district TEXT DEFAULT '';
ALTER TABLE coffee_users
  ADD COLUMN IF NOT EXISTS default_address TEXT DEFAULT '';
