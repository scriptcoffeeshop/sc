-- 訂單出貨資訊補強：新增物流商與追蹤網址欄位
ALTER TABLE coffee_orders ADD COLUMN IF NOT EXISTS shipping_provider TEXT DEFAULT '';
ALTER TABLE coffee_orders ADD COLUMN IF NOT EXISTS tracking_url TEXT DEFAULT '';
