import { authFetch } from "../../lib/auth.ts";
import { API_URL } from "../../lib/appConfig.ts";

interface DashboardPayload {
  [key: string]: unknown;
}

export const API = {
  getOrders: async (userId: string | number) => {
    const r = await authFetch(
      `${API_URL}?action=getOrders&userId=${userId}&_=${Date.now()}`,
    );
    return r.json();
  },
  updateOrderStatus: async (payload: DashboardPayload) => {
    const r = await authFetch(`${API_URL}?action=updateOrderStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },
  deleteOrder: async (payload: DashboardPayload) => {
    const r = await authFetch(`${API_URL}?action=deleteOrder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },
  batchUpdateOrderStatus: async (payload: DashboardPayload) => {
    const r = await authFetch(`${API_URL}?action=batchUpdateOrderStatus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },
  batchDeleteOrders: async (payload: DashboardPayload) => {
    const r = await authFetch(`${API_URL}?action=batchDeleteOrders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  },
  getProducts: async () => {
    const r = await authFetch(`${API_URL}?action=getProducts&_=${Date.now()}`);
    return r.json();
  },
  getUsers: async (searchStr: string) => {
    const searchParam = searchStr
      ? `&search=${encodeURIComponent(searchStr)}`
      : "";
    const r = await authFetch(
      `${API_URL}?action=getUsers${searchParam}&_=${Date.now()}`,
    );
    return r.json();
  },
};
