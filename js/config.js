// ============================================
// config.js — 系統設定常數
// ============================================

export const API_URL = window.ENV?.API_URL || 'https://avnvsjyyeofivgmrchte.supabase.co/functions/v1/coffee-api';

// Supabase 直連設定（前端用，受 RLS 保護）
export const SUPABASE_URL = 'https://avnvsjyyeofivgmrchte.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2bnZzanl5ZW9maXZnbXJjaHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2NjczNjUsImV4cCI6MjA4NzI0MzM2NX0.qpgHEVmEiJUmxqRopGvjOQe7D14Ir_18FcZphWg287s';

const origin = window.location.origin;
const pathname = window.location.pathname;
const basePath = pathname.substring(0, pathname.lastIndexOf('/'));

// LINE Login Redirect URI（依頁面不同）
export const LINE_REDIRECT = {
    main: `${origin}${basePath}/main.html`,
    dashboard: `${origin}${basePath}/dashboard.html`,
};

// 區域資料
export const districtData = {
    '新竹市': ['東區', '北區', '香山區'],
    '竹北市': ['竹北市'],
};
