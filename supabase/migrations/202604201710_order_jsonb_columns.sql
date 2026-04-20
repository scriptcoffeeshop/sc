-- 保留 items 作為人類可讀摘要，新增 items_json 存結構化項目；
-- custom_fields / receipt_info 改為 JSONB，避免後端把 JSON 當 TEXT 存放。

ALTER TABLE public.coffee_orders
ADD COLUMN IF NOT EXISTS items_json JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.coffee_orders
SET items_json = '[]'::jsonb
WHERE items_json IS NULL;

CREATE OR REPLACE FUNCTION public.try_parse_jsonb_object(
  raw TEXT,
  fallback JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  parsed JSONB;
BEGIN
  IF raw IS NULL OR btrim(raw) = '' THEN
    RETURN fallback;
  END IF;

  parsed := raw::jsonb;
  IF jsonb_typeof(parsed) <> 'object' THEN
    RETURN fallback;
  END IF;

  RETURN parsed;
EXCEPTION
  WHEN others THEN
    RETURN fallback;
END;
$$;

DO $$
DECLARE
  custom_fields_type TEXT;
  receipt_info_type TEXT;
BEGIN
  SELECT c.udt_name
  INTO custom_fields_type
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'coffee_orders'
    AND c.column_name = 'custom_fields';

  IF custom_fields_type IS NOT NULL AND custom_fields_type <> 'jsonb' THEN
    EXECUTE $sql$
      ALTER TABLE public.coffee_orders
      ALTER COLUMN custom_fields TYPE JSONB
      USING public.try_parse_jsonb_object(custom_fields, '{}'::jsonb)
    $sql$;
  END IF;

  UPDATE public.coffee_orders
  SET custom_fields = '{}'::jsonb
  WHERE custom_fields IS NULL;

  ALTER TABLE public.coffee_orders
  ALTER COLUMN custom_fields SET DEFAULT '{}'::jsonb;

  SELECT c.udt_name
  INTO receipt_info_type
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'coffee_orders'
    AND c.column_name = 'receipt_info';

  IF receipt_info_type IS NOT NULL AND receipt_info_type <> 'jsonb' THEN
    EXECUTE $sql$
      ALTER TABLE public.coffee_orders
      ALTER COLUMN receipt_info TYPE JSONB
      USING public.try_parse_jsonb_object(receipt_info, 'null'::jsonb)
    $sql$;
  END IF;

  UPDATE public.coffee_orders
  SET receipt_info = 'null'::jsonb
  WHERE receipt_info IS NULL;

  ALTER TABLE public.coffee_orders
  ALTER COLUMN receipt_info SET DEFAULT 'null'::jsonb;
END
$$;

DROP FUNCTION IF EXISTS public.try_parse_jsonb_object(TEXT, JSONB);
