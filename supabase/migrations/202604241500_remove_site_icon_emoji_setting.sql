DELETE FROM coffee_settings WHERE key = 'site_icon_emoji';

DROP POLICY IF EXISTS "Allow anon read coffee_settings" ON coffee_settings;

CREATE POLICY "Allow anon read coffee_settings" ON coffee_settings FOR SELECT USING (
  key IN (
    'is_open',
    'announcement',
    'announcement_enabled',
    'store_name',
    'delivery_pricing_rules',
    'site_title',
    'site_subtitle',
    'site_icon_url',
    'products_section_title',
    'products_section_icon_url',
    'delivery_section_title',
    'delivery_section_icon_url',
    'notes_section_title',
    'notes_section_icon_url',
    'payment_enabled',
    'linepay_enabled',
    'linepay_sandbox',
    'transfer_enabled',
    'delivery_options_config',
    'payment_options_config'
  )
);
