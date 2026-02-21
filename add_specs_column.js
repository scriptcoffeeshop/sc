// 新增 specs 欄位到 coffee_products 表
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://avnvsjyyeofivgmrchte.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('請設定 SUPABASE_SERVICE_ROLE_KEY 環境變數');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    const { error } = await supabase.rpc('exec_sql', {
        sql: "ALTER TABLE coffee_products ADD COLUMN IF NOT EXISTS specs TEXT DEFAULT '';"
    });
    if (error) {
        console.error('Migration 失敗:', error.message);
        // 嘗試直接用 REST API
        console.log('嘗試直接 SQL...');
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ sql: "ALTER TABLE coffee_products ADD COLUMN IF NOT EXISTS specs TEXT DEFAULT '';" })
        });
        console.log('Response:', res.status, await res.text());
    } else {
        console.log('Migration 成功！specs 欄位已新增');
    }
}

migrate();
