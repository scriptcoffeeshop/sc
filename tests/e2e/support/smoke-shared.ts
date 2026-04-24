import type { Route } from "@playwright/test";

export const API_URL =
  "https://avnvsjyyeofivgmrchte.supabase.co/functions/v1/coffee-api";
export const SUPABASE_REST_PREFIX =
  "https://avnvsjyyeofivgmrchte.supabase.co/rest/v1/";

function jsonHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "*",
    "content-type": "application/json",
  };
}

export async function fulfillJson(
  route: Route,
  payload: unknown,
  status = 200,
) {
  await route.fulfill({
    status,
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
}
