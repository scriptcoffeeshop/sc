-- 新增訂單成立通知自動寄送開關（預設開啟）
INSERT INTO coffee_settings (key, value)
VALUES ('order_confirmation_auto_email_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
