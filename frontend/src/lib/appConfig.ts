// 系統設定常數。正式入口由 Vue/Vite bundle 直接匯入。

type AppWindow = Window & {
  ENV?: {
    API_URL?: string;
  };
};

const appWindow = typeof window !== "undefined" ? (window as AppWindow) : null;

export const API_URL = appWindow?.ENV?.API_URL ||
  "https://avnvsjyyeofivgmrchte.supabase.co/functions/v1/coffee-api";

const origin = appWindow?.location?.origin || "";
const pathname = appWindow?.location?.pathname || "";
const basePath = pathname.substring(0, pathname.lastIndexOf("/"));

export const LINE_REDIRECT = {
  main: `${origin}${basePath}/main.html`,
  dashboard: `${origin}${basePath}/dashboard.html`,
};

export const districtData: Record<string, string[]> = {
  "新竹市": ["東區", "北區", "香山區"],
  "竹北市": ["竹北市"],
};
