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
  payment_id TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'cod',
  transfer_account_last5 TEXT DEFAULT ''
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
  ('delivery_pricing_rules', '[]'),
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
  ('payment_hash_iv', ''),
  ('linepay_enabled', 'false'),
  ('linepay_sandbox', 'true'),
  ('transfer_enabled', 'false')
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

-- 8. 匯款帳號管理表
CREATE TABLE IF NOT EXISTS coffee_bank_accounts (
  id SERIAL PRIMARY KEY,
  bank_code TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  account_name TEXT DEFAULT '',
  enabled BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

INSERT INTO coffee_bank_accounts (bank_code, bank_name, account_number, account_name, enabled, sort_order) VALUES
  ('013', '國泰世華', '699506138462', '', true, 1)
ON CONFLICT DO NOTHING;

-- 9. 促銷活動表
CREATE TABLE IF NOT EXISTS coffee_promotions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,                   -- 活動名稱
  type TEXT NOT NULL DEFAULT 'bundle',  -- 類型 (bundle: 組合/任選, discount: 單品折扣)
  target_product_ids JSONB DEFAULT '[]',-- 參與活動的商品ID陣列 (舊版兼容)
  target_items JSONB DEFAULT '[]',      -- 參與活動的具體商品規格陣列 (例如: [{"productId": 1, "specKey": "half_pound"}])
  min_quantity INT DEFAULT 1,           -- 觸發門檻數量
  discount_type TEXT NOT NULL,          -- 折扣方式 (percent: 打折, amount: 扣減固定金額)
  discount_value NUMERIC NOT NULL,      -- 折扣數值
  enabled BOOLEAN DEFAULT true,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  sort_order INT DEFAULT 0
);

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
ALTER TABLE coffee_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read coffee_products" ON coffee_products;
CREATE POLICY "Allow anon read coffee_products" ON coffee_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read coffee_categories" ON coffee_categories;
CREATE POLICY "Allow anon read coffee_categories" ON coffee_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read coffee_settings" ON coffee_settings;
CREATE POLICY "Allow anon read coffee_settings" ON coffee_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read coffee_form_fields" ON coffee_form_fields;
CREATE POLICY "Allow anon read coffee_form_fields" ON coffee_form_fields FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read coffee_bank_accounts" ON coffee_bank_accounts;
CREATE POLICY "Allow anon read coffee_bank_accounts" ON coffee_bank_accounts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read coffee_promotions" ON coffee_promotions;
CREATE POLICY "Allow anon read coffee_promotions" ON coffee_promotions FOR SELECT USING (true);

-- 這些表僅由後端 Edge Function (使用 service_role) 存取，前端 API 應全面阻擋以符合資安規範與消除警告
DROP POLICY IF EXISTS "Deny all access to coffee_orders" ON coffee_orders;
CREATE POLICY "Deny all access to coffee_orders" ON coffee_orders FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all access to coffee_users" ON coffee_users;
CREATE POLICY "Deny all access to coffee_users" ON coffee_users FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny all access to coffee_store_selections" ON coffee_store_selections;
CREATE POLICY "Deny all access to coffee_store_selections" ON coffee_store_selections FOR ALL USING (false);

-- ============================================
-- RPC 函數 (批次更新排序)
-- ============================================
CREATE OR REPLACE FUNCTION public.batch_update_sort(table_name text, items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF table_name = 'coffee_categories' THEN
    UPDATE public.coffee_categories c
    SET sort_order = (i->>'sort_order')::int
    FROM jsonb_array_elements(items) i
    WHERE c.id = (i->>'id')::int;
  ELSIF table_name = 'coffee_products' THEN
    UPDATE public.coffee_products p
    SET sort_order = (i->>'sort_order')::int
    FROM jsonb_array_elements(items) i
    WHERE p.id = (i->>'id')::int;
  ELSIF table_name = 'coffee_form_fields' THEN
    UPDATE public.coffee_form_fields f
    SET sort_order = (i->>'sort_order')::int
    FROM jsonb_array_elements(items) i
    WHERE f.id = (i->>'id')::int;
  ELSIF table_name = 'coffee_bank_accounts' THEN
    UPDATE public.coffee_bank_accounts b
    SET sort_order = (i->>'sort_order')::int
    FROM jsonb_array_elements(items) i
    WHERE b.id = (i->>'id')::int;
  ELSIF table_name = 'coffee_promotions' THEN
    UPDATE public.coffee_promotions pr
    SET sort_order = (i->>'sort_order')::int
    FROM jsonb_array_elements(items) i
    WHERE pr.id = (i->>'id')::int;
  END IF;
END;
$$;
