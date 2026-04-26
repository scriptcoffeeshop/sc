DELETE FROM coffee_orders WHERE line_user_id = 'integration-user';
DELETE FROM coffee_users WHERE line_user_id = 'integration-user';

INSERT INTO coffee_products (
  id,
  category,
  name,
  description,
  price,
  specs,
  enabled,
  sort_order
) VALUES (
  9101,
  '整合測試',
  '整合測試豆',
  'Supabase local golden path fixture',
  220,
  '[{"key":"single","label":"單包","price":220,"enabled":true}]',
  true,
  9101
) ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  specs = EXCLUDED.specs,
  enabled = EXCLUDED.enabled,
  sort_order = EXCLUDED.sort_order;

INSERT INTO coffee_settings (key, value) VALUES
  ('transfer_enabled', 'true'),
  ('order_confirmation_auto_email_enabled', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO coffee_users (
  line_user_id,
  display_name,
  role,
  status,
  phone,
  email
) VALUES (
  'integration-user',
  '整合測試顧客',
  'USER',
  'ACTIVE',
  '0912000000',
  'integration@example.com'
) ON CONFLICT (line_user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email;
