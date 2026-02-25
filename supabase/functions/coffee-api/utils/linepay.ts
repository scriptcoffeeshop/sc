import { supabase } from "./supabase.ts";
import { LINEPAY_CHANNEL_ID, LINEPAY_CHANNEL_SECRET } from "./config.ts";

export async function linePaySign(
  channelSecret: string,
  apiPath: string,
  body: string,
  nonce: string,
): Promise<string> {
  const message = channelSecret + apiPath + body + nonce;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function requestLinePayAPI(
  method: string,
  apiPath: string,
  data: unknown = null,
): Promise<unknown> {
  const { data: sandboxSetting } = await supabase.from("coffee_settings")
    .select("value").eq("key", "linepay_sandbox").maybeSingle();
  const isSandbox = !sandboxSetting || String(sandboxSetting.value) !== "false";
  const baseUrl = isSandbox
    ? "https://sandbox-api-pay.line.me"
    : "https://api-pay.line.me";

  const nonce = crypto.randomUUID();
  const bodyStr = data ? JSON.stringify(data) : "";
  const signature = await linePaySign(
    LINEPAY_CHANNEL_SECRET,
    apiPath,
    bodyStr,
    nonce,
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
    "X-LINE-Authorization-Nonce": nonce,
    "X-LINE-Authorization": signature,
  };

  const url = `${baseUrl}${apiPath}`;
  const res = await fetch(url, {
    method,
    headers,
    body: bodyStr || null,
  });

  const text = await res.text();
  // LINE Pay transactionId 可能超過 JS Number 精度，以字串處理
  const processed = text.replace(/("transactionId"\s*:\s*)(\d+)/g, '$1"$2"');
  return JSON.parse(processed);
}
