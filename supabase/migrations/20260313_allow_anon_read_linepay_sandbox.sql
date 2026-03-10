-- 將 linepay_sandbox 納入 coffee_settings 匿名可讀白名單
DROP POLICY IF EXISTS "Allow anon read coffee_settings" ON coffee_settings;

CREATE POLICY "Allow anon read coffee_settings" ON coffee_settings
  FOR SELECT
  USING (
    key IN (
      'is_open',
      'announcement',
      'announcement_enabled',
      'store_name',
      'delivery_pricing_rules',
      'site_title',
      'site_subtitle',
      'site_icon_url',
      'site_icon_emoji',
      'products_section_title',
      'delivery_section_title',
      'notes_section_title',
      'payment_enabled',
      'linepay_enabled',
      'linepay_sandbox',
      'transfer_enabled'
    )
  );
