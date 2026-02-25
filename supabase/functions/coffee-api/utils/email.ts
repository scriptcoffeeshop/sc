// @ts-ignore: deno
import nodemailer from "npm:nodemailer@6.9.11";
import { SMTP_PASS, SMTP_USER } from "./config.ts";

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
) {
  if (!SMTP_USER || !SMTP_PASS || !to) {
    return { success: false, error: "SMTP or recipient config missing" };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: `"☕ 咖啡豆訂購系統" <${SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    return { success: true };
  } catch (e: unknown) {
    console.error("Failed to send email:", e);
    return { success: false, error: e.message || String(e) };
  }
}
