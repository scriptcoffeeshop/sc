-- ============================================
-- 將 pg_trgm 擴充移至 extensions schema 以符合安全性規範
-- ============================================

-- 確保 extensions schema 存在
CREATE SCHEMA IF NOT EXISTS extensions;

-- 將現有安裝在 public 的 pg_trgm 移至 extensions schema
-- 注意：如果它已經在 extensions schema 中，此指令仍然可以安全執行，也可能會因為版本差異而略過
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
END
$$;
