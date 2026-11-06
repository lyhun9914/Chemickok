import "server-only";
import { createTransport } from "nodemailer";

/**
 * Outgoing mail (비밀번호 재설정) over SMTP. With a Gmail account: SMTP_USER = the address, SMTP_PASS = an app password
 * (Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호). Other providers: also set SMTP_HOST / SMTP_PORT.
 */
export const mailConfigured = () => Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());

/** The account mail goes out from (shown to the 관리자 when a test mail fails). */
export const mailSender = () => (process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();

export async function sendMail(to: string, subject: string, text: string): Promise<{ response: string; accepted: string[]; rejected: string[] }> {
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER!.trim();
  // Gmail shows an app password as four groups of four; it's often pasted with the spaces.
  const pass = host === "smtp.gmail.com" ? process.env.SMTP_PASS!.replace(/\s+/g, "") : process.env.SMTP_PASS!;
  const transport = createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  const info = await transport.sendMail({ from: `"냥신 점괘" <${mailSender()}>`, to, subject, text });
  return { response: String(info.response ?? ""), accepted: (info.accepted ?? []).map(String), rejected: (info.rejected ?? []).map(String) };
}
