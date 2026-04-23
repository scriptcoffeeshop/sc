ALTER TABLE coffee_users
  ADD COLUMN IF NOT EXISTS default_payment_method TEXT DEFAULT '';

ALTER TABLE coffee_users
  ADD COLUMN IF NOT EXISTS default_transfer_account_last5 TEXT DEFAULT '';

ALTER TABLE coffee_users
  ADD COLUMN IF NOT EXISTS default_receipt_info TEXT DEFAULT '';
