-- Store provider-neutral metadata needed by PxPay Plus payment/notify/refund flows.
ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_provider_transaction_id TEXT DEFAULT '';

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_provider_trade_no TEXT DEFAULT '';

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_provider_trade_time TEXT DEFAULT '';

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_trade_amount INT;

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_discount_amount INT DEFAULT 0;

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_invo_carrier TEXT DEFAULT '';

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_provider_payload JSONB DEFAULT '{}'::jsonb;

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_refund_records JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_coffee_orders_payment_provider_transaction_id
ON coffee_orders (payment_provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_coffee_orders_payment_provider_trade_no
ON coffee_orders (payment_provider_trade_no);
