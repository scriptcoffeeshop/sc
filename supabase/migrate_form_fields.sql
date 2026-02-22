-- ============================================
-- 動態表單欄位系統 — Migration
-- 請在 Supabase SQL Editor 中手動執行此檔案
-- ============================================

-- 1. 建立表單欄位表
CREATE TABLE IF NOT EXISTS coffee_form_fields (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL DEFAULT 'contact',
  field_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  field_type TEXT NOT NULL DEFAULT 'text',
  placeholder TEXT DEFAULT '',
  options TEXT DEFAULT '',
  required BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- 2. 插入預設欄位
INSERT INTO coffee_form_fields (section, field_key, label, field_type, placeholder, required, enabled, sort_order) VALUES
  ('contact', 'phone', '📱 聯絡電話', 'tel', '請輸入聯絡電話', true, true, 1),
  ('contact', 'email', '✉️ 電子郵件', 'email', '接收訂單確認信', false, true, 2)
ON CONFLICT (field_key) DO NOTHING;

-- 3. 品牌設定
INSERT INTO coffee_settings (key, value) VALUES
  ('site_title', '咖啡豆訂購'),
  ('site_subtitle', '新鮮烘焙・產地直送'),
  ('site_icon_url', ''),
  ('site_icon_emoji', '☕'),
  ('products_section_title', '🫘 咖啡豆選購'),
  ('delivery_section_title', '🚚 配送方式'),
  ('notes_section_title', '📝 訂單備註')
ON CONFLICT (key) DO NOTHING;

-- 4. 金流預留設定
INSERT INTO coffee_settings (key, value) VALUES
  ('payment_enabled', 'false'),
  ('payment_provider', ''),
  ('payment_merchant_id', ''),
  ('payment_hash_key', ''),
  ('payment_hash_iv', '')
ON CONFLICT (key) DO NOTHING;

-- 5. 訂單表新增欄位
ALTER TABLE coffee_orders ADD COLUMN IF NOT EXISTS custom_fields TEXT DEFAULT '';
ALTER TABLE coffee_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT '';
ALTER TABLE coffee_orders ADD COLUMN IF NOT EXISTS payment_id TEXT DEFAULT '';

-- 6. RLS
ALTER TABLE coffee_form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read coffee_form_fields" ON coffee_form_fields FOR SELECT USING (true);

-- 7. Supabase Storage bucket（需在 Dashboard 手動建立）
-- 前往 Supabase Dashboard > Storage
-- 建立名為 "site-assets" 的 bucket（Public）
-- 此 bucket 用於存放管理員上傳的 icon 圖片

-- ============================================
-- 完成！回到程式碼繼續部署。
-- ============================================
