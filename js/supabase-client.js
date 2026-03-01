// ============================================
// supabase-client.js — 前端 Supabase 直連客戶端
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=21';

/**
 * 初始化 Supabase Client（前端用，受 RLS 保護）
 * 僅用於讀取公開資料（商品、分類、設定等）
 * 機密操作（訂單、登入、金流）仍透過 Edge Functions
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
