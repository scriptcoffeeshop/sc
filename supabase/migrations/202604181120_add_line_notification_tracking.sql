ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS line_order_created_notified_at TIMESTAMPTZ;

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS line_order_created_notify_error TEXT DEFAULT '';

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS line_payment_status_notified TEXT DEFAULT '';

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS line_payment_status_notified_at TIMESTAMPTZ;

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS line_payment_status_notify_error TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_coffee_orders_line_payment_status_notified
ON coffee_orders (line_payment_status_notified);

CREATE INDEX IF NOT EXISTS idx_coffee_orders_line_payment_status_notified_at
ON coffee_orders (line_payment_status_notified_at);
