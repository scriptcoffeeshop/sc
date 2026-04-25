export function normalizeTrackingUrl(url: unknown): string {
  const raw = String(url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

export function getDefaultTrackingUrl(deliveryMethod: unknown): string {
  if (deliveryMethod === "seven_eleven") {
    return "https://eservice.7-11.com.tw/e-tracking/search.aspx";
  }
  if (deliveryMethod === "family_mart") {
    return "https://fmec.famiport.com.tw/FP_Entrance/QueryBox";
  }
  if (deliveryMethod === "delivery" || deliveryMethod === "home_delivery") {
    return "https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100";
  }
  return "";
}
