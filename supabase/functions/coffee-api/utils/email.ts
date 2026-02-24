// @ts-ignore
import nodemailer from 'npm:nodemailer'
import { SMTP_USER, SMTP_PASS } from './config.ts'

export async function sendEmail(to: string, subject: string, htmlContent: string) {
    if (!SMTP_USER || !SMTP_PASS || !to) return { success: false, error: 'SMTP or recipient config missing' }
    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        })
        await transporter.sendMail({
            from: `"☕ 咖啡豆訂購系統" <${SMTP_USER}>`,
            to,
            subject,
            html: htmlContent,
        })
        return { success: true }
    } catch (e: any) {
        console.error('Failed to send email:', e)
        return { success: false, error: e.message || String(e) }
    }
}
