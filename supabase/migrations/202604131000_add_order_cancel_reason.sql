ALTER TABLE coffee_orders
ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT '';
