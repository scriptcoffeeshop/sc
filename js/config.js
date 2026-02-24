// ============================================
// config.js — 系統設定常數
// ============================================

export const API_URL = window.ENV?.API_URL || 'https://avnvsjyyeofivgmrchte.supabase.co/functions/v1/coffee-api';

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
