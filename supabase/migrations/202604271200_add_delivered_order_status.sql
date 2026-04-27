-- 新增已配達訂單狀態，讓後台、通知與資料庫約束一致。

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.coffee_orders'::regclass
      AND contype = 'c'
      AND EXISTS (
        SELECT 1
        FROM unnest(conkey) AS ck(attnum)
        JOIN pg_attribute attr
          ON attr.attrelid = conrelid
          AND attr.attnum = ck.attnum
        WHERE attr.attname = 'status'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.coffee_orders DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE public.coffee_orders
  ADD CONSTRAINT coffee_orders_status_check
  CHECK (
    status IN (
      'pending',
      'processing',
      'shipped',
      'delivered',
      'completed',
      'failed',
      'cancelled'
    )
  );
