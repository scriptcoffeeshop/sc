-- ============================================
-- RLS (Row Level Security) 設定
-- 用途：讓前端透過 supabase-js (anon key) 安全地讀取公開資料
-- 請在 Supabase Dashboard → SQL Editor 中執行此腳本
-- ============================================

-- ============ 啟用 RLS ============
-- 注意：如果資料表已經啟用 RLS，這些指令會直接跳過，不會出錯

ALTER TABLE coffee_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coffee_promotions ENABLE ROW LEVEL SECURITY;

-- ============ 建立讀取 (SELECT) 政策 ============
-- 允許匿名用戶 (anon) 讀取公開的已啟用資料
-- 使用 IF NOT EXISTS 風格：先 DROP 再 CREATE，避免重複建立時報錯

-- 商品：只能讀取已啟用的商品
DROP POLICY IF EXISTS "允許匿名讀取已啟用商品" ON coffee_products;
CREATE POLICY "允許匿名讀取已啟用商品" ON coffee_products
    FOR SELECT
    TO anon
    USING (enabled = true);

-- 分類：全部可讀
DROP POLICY IF EXISTS "允許匿名讀取所有分類" ON coffee_categories;
CREATE POLICY "允許匿名讀取所有分類" ON coffee_categories
    FOR SELECT
    TO anon
    USING (true);

-- 設定：全部可讀（key-value 結構，不含敏感資訊）
DROP POLICY IF EXISTS "允許匿名讀取所有設定" ON coffee_settings;
CREATE POLICY "允許匿名讀取所有設定" ON coffee_settings
    FOR SELECT
    TO anon
    USING (true);

-- 表單欄位：只讀取已啟用的欄位
DROP POLICY IF EXISTS "允許匿名讀取已啟用表單欄位" ON coffee_form_fields;
CREATE POLICY "允許匿名讀取已啟用表單欄位" ON coffee_form_fields
    FOR SELECT
    TO anon
    USING (enabled = true);

-- 銀行帳號：只讀取已啟用的帳號
DROP POLICY IF EXISTS "允許匿名讀取已啟用銀行帳號" ON coffee_bank_accounts;
CREATE POLICY "允許匿名讀取已啟用銀行帳號" ON coffee_bank_accounts
    FOR SELECT
    TO anon
    USING (enabled = true);

-- 促銷活動：全部可讀（前端會自行過濾 enabled）
DROP POLICY IF EXISTS "允許匿名讀取所有促銷活動" ON coffee_promotions;
CREATE POLICY "允許匿名讀取所有促銷活動" ON coffee_promotions
    FOR SELECT
    TO anon
    USING (true);

-- ============ Service Role 全權限 ============
-- 確保 Edge Functions (使用 service_role) 仍擁有完全的讀寫權限
-- service_role 預設會跳過 RLS，所以這些政策其實是可選的，
-- 但為了清晰，我們還是明確建立

DROP POLICY IF EXISTS "Service role 完全存取商品" ON coffee_products;
CREATE POLICY "Service role 完全存取商品" ON coffee_products
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role 完全存取分類" ON coffee_categories;
CREATE POLICY "Service role 完全存取分類" ON coffee_categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role 完全存取設定" ON coffee_settings;
CREATE POLICY "Service role 完全存取設定" ON coffee_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role 完全存取表單欄位" ON coffee_form_fields;
CREATE POLICY "Service role 完全存取表單欄位" ON coffee_form_fields
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role 完全存取銀行帳號" ON coffee_bank_accounts;
CREATE POLICY "Service role 完全存取銀行帳號" ON coffee_bank_accounts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role 完全存取促銷活動" ON coffee_promotions;
CREATE POLICY "Service role 完全存取促銷活動" ON coffee_promotions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============ 完成 ============
-- 執行完畢後，前端就能透過 supabase-js (anon key) 安全地讀取公開資料
-- 而管理員的寫入操作仍經由 Edge Functions (service_role) 處理，不受影響
