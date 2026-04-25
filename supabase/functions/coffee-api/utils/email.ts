// @deno-types="npm:@types/nodemailer"
import nodemailer from "nodemailer";
import { SMTP_PASS, SMTP_USER } from "./config.ts";
import { createLogger } from "./logger.ts";

const logger = createLogger("email");

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
      from: `"Script Coffee" <${SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    return { success: true };
  } catch (e: unknown) {
    logger.error("Failed to send email", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
