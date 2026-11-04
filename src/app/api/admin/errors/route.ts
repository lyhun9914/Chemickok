import { NextResponse, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { getDb } from "@/services/server/db";
import { mailConfigured, sendMail } from "@/services/server/mailer";

/** GET /api/admin/errors?hours=24 — 오류 기록, one row per kind; also says whether new kinds are mailed. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const hours = Math.min(24 * 30, Math.max(1, Math.trunc(Number(req.nextUrl.searchParams.get("hours")) || 24)));
  const since = new Date(Date.now() - hours * 3600e3).toISOString();
  return NextResponse.json({ errors: await db.adminErrors(since), mail: Boolean(process.env.ADMIN_EMAIL) && mailConfigured() });
}

/** DELETE /api/admin/errors?fp=… — clears one kind (checked and fixed). */
export async function DELETE(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  const fp = req.nextUrl.searchParams.get("fp");
  if (!db || !fp) return NextResponse.json({ error: "지울 오류가 없어요." }, { status: 400 });
  await db.adminClearErrors(fp);
  return NextResponse.json({ ok: true });
}

/** POST /api/admin/errors — sends a test mail to ADMIN_EMAIL now, to check the mail settings. */
export async function POST(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const to = process.env.ADMIN_EMAIL;
  if (!to) return NextResponse.json({ error: "Vercel 환경 변수에 ADMIN_EMAIL이 없어요. 넣고 다시 배포해 주세요." }, { status: 400 });
  if (!mailConfigured()) return NextResponse.json({ error: "메일 설정(SMTP_USER · SMTP_PASS)이 없어요. GUIDE.md의 메일 설정을 먼저 해 주세요." }, { status: 400 });
  try {
    await sendMail(to, "[냥신 점괘] 오류 알림 테스트", "오류 알림 메일이 잘 도착했어요 🐾\n\n이제 냥신 점괘에서 그날 처음 보는 오류가 생기면 이 주소로 알려 드려요.");
    return NextResponse.json({ ok: true, to });
  } catch (e) {
    const m = String((e as Error).message ?? e);
    const hint = /535|Invalid login|Username and Password not accepted|auth/i.test(m)
      ? "메일 계정 로그인 실패: SMTP_USER가 맞는지, SMTP_PASS에 Gmail 앱 비밀번호(16자리)를 넣었는지 확인해 주세요."
      : `메일을 보내지 못했어요: ${m.slice(0, 160)}`;
    return NextResponse.json({ error: hint }, { status: 502 });
  }
}
