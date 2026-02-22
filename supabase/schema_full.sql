-- ============================================
-- 咖啡豆訂購系統 — Supabase 資料庫完整 Schema (schema_full.sql)
-- ============================================

-- 1. 商品分類表
CREATE TABLE IF NOT EXISTS coffee_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- 2. 咖啡豆商品表
CREATE TABLE IF NOT EXISTS coffee_products (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INT NOT NULL DEFAULT 0,
  weight TEXT DEFAULT '',
  origin TEXT DEFAULT '',
  roast_level TEXT DEFAULT '',
  specs TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

-- 3. 訂單表 (含狀態白名單保護)
CREATE TABLE IF NOT EXISTS coffee_orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  line_user_id TEXT DEFAULT '',
  line_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  items TEXT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  delivery_method TEXT NOT NULL DEFAULT 'delivery',
  -- 配送相關
  city TEXT DEFAULT '',
  district TEXT DEFAULT '',
  address TEXT DEFAULT '',
  -- 超商取貨相關
  store_type TEXT DEFAULT '',
  store_id TEXT DEFAULT '',
  store_name TEXT DEFAULT '',
  store_address TEXT DEFAULT '',
  -- 訂單狀態 (白名單: pending/processing/shipped/completed/cancelled)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
  note TEXT DEFAULT '',
  email TEXT DEFAULT '',
  custom_fields TEXT DEFAULT '',
  payment_status TEXT DEFAULT '',
  payment_id TEXT DEFAULT ''
);

-- 4. 系統設定 (Key-Value)
CREATE TABLE IF NOT EXISTS coffee_settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

INSERT INTO coffee_settings (key, value) VALUES
  ('is_open', 'true'),
  ('announcement', ''),
  ('announcement_enabled', 'false'),
  ('store_name', '咖啡訂購'),
  ('delivery_fee', '0'),
  ('free_delivery_threshold', '0'),
  ('site_title', '咖啡豆訂購'),
  ('site_subtitle', '新鮮烘焙・產地直送'),
  ('site_icon_url', ''),
  ('site_icon_emoji', '☕'),
  ('products_section_title', '🫘 咖啡豆選購'),
  ('delivery_section_title', '🚚 配送方式'),
  ('notes_section_title', '📝 訂單備註'),
  ('payment_enabled', 'false'),
  ('payment_provider', ''),
  ('payment_merchant_id', ''),
  ('payment_hash_key', ''),
  ('payment_hash_iv', '')
ON CONFLICT (key) DO NOTHING;

-- 5. 用戶表
CREATE TABLE IF NOT EXISTS coffee_users (
  line_user_id TEXT PRIMARY KEY,
  display_name TEXT DEFAULT '',
  picture_url TEXT DEFAULT '',
  role TEXT DEFAULT 'USER',
  status TEXT DEFAULT 'ACTIVE',
  last_login TIMESTAMPTZ DEFAULT now(),
  phone TEXT DEFAULT '',
  default_city TEXT DEFAULT '',
  default_district TEXT DEFAULT '',
  default_address TEXT DEFAULT '',
  default_delivery_method TEXT DEFAULT '',
  default_store_id TEXT DEFAULT '',
  default_store_name TEXT DEFAULT '',
  default_store_address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  blacklist_reason TEXT DEFAULT '',
  blocked_at TIMESTAMPTZ
);

-- 6. 門市選擇暫存表（ECPay 電子地圖回傳）
CREATE TABLE IF NOT EXISTS coffee_store_selections (
  token TEXT PRIMARY KEY,
  cvs_store_id TEXT DEFAULT '',
  cvs_store_name TEXT DEFAULT '',
  cvs_address TEXT DEFAULT '',
  logistics_sub_type TEXT DEFAULT '',
  extra_data TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 動態表單欄位系統
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

INSERT INTO coffee_form_fields (section, field_key, label, field_type, placeholder, required, enabled, sort_order) VALUES
  ('contact', 'phone', '📱 聯絡電話', 'tel', '請輸入聯絡電話', true, true, 1),
  ('contact', 'email', '✉️ 電子郵件', 'email', '接收訂單確認信', false, true, 2)
ON CONFLICT (field_key) DO NOTHING;

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coffee_products_category ON coffee_products(category);
CREATE INDEX IF NOT EXISTS idx_coffee_products_enabled ON coffee_products(enabled);
CREATE INDEX IF NOT EXISTS idx_coffee_orders_line_user_id ON coffee_orders(line_user_id);
CREATE INDEX IF NOT EXISTS idx_coffee_orders_created_at ON coffee_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coffee_orders_status ON coffee_orders(status);
CREATE INDEX IF NOT EXISTS idx_coffee_orders_delivery ON coffee_orders(delivery_method);
CREATE INDEX IF NOT EXISTS idx_store_selections_created ON coffee_store_selections(created_at);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE coffee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_store_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read coffee_products" ON coffee_products FOR SELECT USING (true);
CREATE POLICY "Allow anon read coffee_categories" ON coffee_categories FOR SELECT USING (true);
CREATE POLICY "Allow anon read coffee_settings" ON coffee_settings FOR SELECT USING (true);
CREATE POLICY "Allow anon read coffee_form_fields" ON coffee_form_fields FOR SELECT USING (true);
