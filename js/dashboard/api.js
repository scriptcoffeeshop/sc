import { API_URL } from "../config.js?v=51";
import { authFetch } from "../auth.js?v=51";

export const API = {
    getOrders: async (userId) => {
        const r = await authFetch(`${API_URL}?action=getOrders&userId=${userId}&_=${Date.now()}`);
        return r.json();
    },
    updateOrderStatus: async (payload) => {
        const r = await authFetch(`${API_URL}?action=updateOrderStatus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return r.json();
    },
    deleteOrder: async (payload) => {
        const r = await authFetch(`${API_URL}?action=deleteOrder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return r.json();
    },
    batchUpdateOrderStatus: async (payload) => {
        const r = await authFetch(`${API_URL}?action=batchUpdateOrderStatus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        return r.json();
    },
    batchDeleteOrders: async (payload) => {
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
    getUsers: async (searchStr) => {
        const searchParam = searchStr ? `&search=${encodeURIComponent(searchStr)}` : "";
        const r = await authFetch(`${API_URL}?action=getUsers${searchParam}&_=${Date.now()}`);
        return r.json();
    }
};
