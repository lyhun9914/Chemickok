import "server-only";
import { getDb, type ErrorLog } from "./db";
import { mailConfigured, sendMail } from "./mailer";

/**
 * 오류 기록: errors from the browser (화면), from failed API calls and from the server land in error_logs, grouped
 * by a fingerprint (the message with its numbers and ids blanked out, plus where it happened). The first time a
 * kind of error shows up in a day, ADMIN_EMAIL gets a mail; the 관리자 page lists them all.
 */

const blank = (s: string) =>
  s
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "#")
    .replace(/\b[0-9a-z]*\d[0-9a-z]*\b/gi, "#")
    .replace(/\s+/g, " ")
    .trim();

/** "/api/pair/ab12cd?x=1" → "/api/pair/#": the same route groups together whatever id it was called with. */
const routeOf = (path: string | null) => (path ? blank(path.split("?")[0]).slice(0, 80) : "");

export const fingerprintOf = (e: Pick<ErrorLog, "source" | "message" | "path">) =>
  `${e.source}|${routeOf(e.path)}|${blank(e.message).slice(0, 120)}`;

const SOURCE: Record<ErrorLog["source"], string> = { client: "화면", server: "서버", api: "API" };

export async function reportError(e: Omit<ErrorLog, "fingerprint">): Promise<void> {
  const db = getDb();
  const row: ErrorLog = { ...e, message: e.message.slice(0, 500) || "(내용 없음)", fingerprint: fingerprintOf(e) };
  if (!db) {
    console.error("[error]", row.source, row.path, row.message);
    return;
  }
  try {
    const fresh = await db.logError(row);
    const to = process.env.ADMIN_EMAIL;
    if (fresh && to && mailConfigured()) {
      const site = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
      await sendMail(
        to,
        `[냥신 점괘] 새 오류 (${SOURCE[row.source]}): ${row.message.slice(0, 60)}`,
        [
          "냥신 점괘에서 오늘 처음 보는 오류가 났어요.",
          "",
          `어디서: ${SOURCE[row.source]} · ${row.path ?? "-"}`,
          `내용: ${row.message}`,
          row.detail ? `\n자세히:\n${row.detail.slice(0, 1200)}` : "",
          row.ua ? `\n브라우저: ${row.ua}` : "",
          "",
          `같은 오류가 또 나도 하루 동안은 메일을 다시 보내지 않아요. 전체 목록: ${site}/admin`,
        ].join("\n"),
      );
    }
  } catch (err) {
    // Never let reporting an error become an error.
    console.error("reporting an error failed", err, row.message);
  }
}
