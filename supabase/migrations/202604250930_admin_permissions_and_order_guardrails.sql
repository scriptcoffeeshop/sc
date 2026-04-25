ALTER TABLE coffee_users
  ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS admin_permissions jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE coffee_orders
  ADD COLUMN IF NOT EXISTS order_fingerprint text;

CREATE INDEX IF NOT EXISTS idx_coffee_users_admin_permissions
  ON coffee_users USING gin (admin_permissions);

CREATE INDEX IF NOT EXISTS idx_coffee_orders_user_created_at
  ON coffee_orders (line_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coffee_orders_user_fingerprint_created_at
  ON coffee_orders (line_user_id, order_fingerprint, created_at DESC);
