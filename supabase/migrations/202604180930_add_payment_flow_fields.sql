ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_last_checked_at TIMESTAMPTZ;

ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS payment_provider_status_code TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_coffee_orders_payment_status
ON coffee_orders (payment_status);

CREATE INDEX IF NOT EXISTS idx_coffee_orders_payment_expires_at
ON coffee_orders (payment_expires_at);
