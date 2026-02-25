import { requireAdmin } from "../utils/auth.ts";
import { sendEmail } from "../utils/email.ts";
import { SMTP_USER } from "../utils/config.ts";

export async function testEmail(data: Record<string, unknown>, req: Request) {
  await requireAdmin(req);
  const to = String(data.to || SMTP_USER);
  if (!to || to === "undefined") {
    return {
      success: false,
      error: "No recipient provided or SMTP_USER is not set",
    };
  }
  const res = await sendEmail(
    to,
    "測試信件 Test Email",
    "<h1>Hello</h1><p>這是來自 Supabase Edge Function 的測試信件</p>",
  );
  return res;
}
