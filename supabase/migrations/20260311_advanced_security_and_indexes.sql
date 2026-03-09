-- 啟用 pg_trgm 擴充以支援 ilike 的 GIN 索引，並指定安裝在 extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ============================================
-- 1. 安全性收斂：修改 coffee_settings RLS
-- ============================================
DROP POLICY IF EXISTS "Allow anon read coffee_settings" ON coffee_settings;

CREATE POLICY "Allow anon read coffee_settings" ON coffee_settings FOR SELECT USING (
  key IN (
    'is_open', 'announcement', 'announcement_enabled', 'store_name', 
    'delivery_pricing_rules', 'site_title', 'site_subtitle', 'site_icon_url', 
    'site_icon_emoji', 'products_section_title', 'delivery_section_title', 
    'notes_section_title', 'payment_enabled', 'linepay_enabled', 'transfer_enabled'
  )
);

-- ============================================
-- 2. 搜尋效能優化：新增 ILIKE 查詢索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coffee_users_display_name_trgm ON coffee_users USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_coffee_users_phone_trgm ON coffee_users USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_coffee_users_email_trgm ON coffee_users USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_coffee_orders_line_name_trgm ON coffee_orders USING gin (line_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_coffee_orders_phone_trgm ON coffee_orders USING gin (phone gin_trgm_ops);
