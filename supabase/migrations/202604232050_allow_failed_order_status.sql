-- 讓資料庫訂單狀態約束與後端 VALID_ORDER_STATUSES 保持一致。
-- 付款逾期與金流失敗流程會把訂單狀態設為 failed。

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
      'completed',
      'failed',
      'cancelled'
    )
  );
