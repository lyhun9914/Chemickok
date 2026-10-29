import "server-only";
import { createTransport } from "nodemailer";

/**
 * Outgoing mail (비밀번호 재설정) over SMTP. With a Gmail account: SMTP_USER = the address, SMTP_PASS = an app password
 * (Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호). Other providers: also set SMTP_HOST / SMTP_PORT.
 */
export const mailConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
  await transport.sendMail({ from: `"냥신 점괘" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`, to, subject, text });
}
