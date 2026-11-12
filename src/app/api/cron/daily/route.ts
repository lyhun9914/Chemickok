import { NextResponse, type NextRequest } from "next/server";
import { won } from "@/lib/config";
import { kstDay } from "@/lib/kst";
import { getDb } from "@/services/server/db";
import { SITE } from "@/lib/site";
import { expireDueCoins } from "@/services/server/coinExpiry";
import { reportError } from "@/services/server/errors";
import { mailConfigured, sendMail } from "@/services/server/mailer";

const n = (v: unknown) => Number(v ?? 0);
const diff = (a: unknown, b: unknown) => {
  const d = n(a) - n(b);
  return d ? ` (${d > 0 ? "+" : ""}${d.toLocaleString("ko-KR")})` : "";
};

/**
 * GET /api/cron/daily — 매일 아침 (Vercel Cron, 09:00 KST): 유효기간(충전일부터 1년)이 지난 충전 냥을 정리하고,
 * 어제 숫자를 그 전날과 나란히 ADMIN_EMAIL로 보낸다. Only Vercel's cron (Authorization: Bearer CRON_SECRET) can call it.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "forbidden" }, { status: 401 });
  const db = getDb();
  // the expiry runs even where no mail is set up
  const expired = db
    ? await expireDueCoins(db).catch(async (e) => {
        await reportError({ source: "server", message: `냥 유효기간 정리 실패: ${e instanceof Error ? e.message : String(e)}`, path: "/api/cron/daily", detail: null, ua: null }).catch(() => null);
        return null;
      })
    : null;
  // 보관 기간(30일)이 지난 케미표 · 퀴즈 · 궁합 신청서 삭제 (개인정보처리방침 3. 보유 기간)
  if (db)
    await db.purgeExpired().catch(async (e) => {
      await reportError({ source: "server", message: `만료 자료 삭제 실패: ${e instanceof Error ? e.message : String(e)}`, path: "/api/cron/daily", detail: null, ua: null }).catch(() => null);
    });
  const to = process.env.ADMIN_EMAIL;
  if (!db || !to || !mailConfigured()) return NextResponse.json({ skipped: "메일 설정 없음", expired });
  const [y, b] = await Promise.all([db.adminDay(kstDay(-1)), db.adminDay(kstDay(-2))]);
  const net = n(y.sales) - n(y.refunds);
  const lines = [
    `냥신 점괘 ${y.day} 하루 요약 🐾 (괄호는 그 전날과 비교)`,
    "",
    `💰 매출 ${won(n(y.sales))}${diff(y.sales, b.sales)} · 결제 ${n(y.paidCount)}건${diff(y.paidCount, b.paidCount)}`,
    `↩️ 환불 ${won(n(y.refunds))} · ${n(y.refundCount)}건  →  순매출 ${won(net)}`,
    `👀 방문 ${n(y.visits)}${diff(y.visits, b.visits)} · 면담 시작 ${n(y.started)}${diff(y.started, b.started)} · 결과까지 ${n(y.results)}${diff(y.results, b.results)}`,
    `🎮 미니게임 ${n(y.games)} · 🎟️ 쿠폰 사용 ${n(y.coupons)}`,
    `🙋 새 회원 ${n(y.newUsers)}${diff(y.newUsers, b.newUsers)} · 쓴 냥 ${n(y.coinsSpent)}냥`,
    ...(expired?.coins ? [`⏳ 유효기간(1년)이 지난 충전 냥 ${expired.coins}냥 정리 (${expired.users}명)`] : []),
    `🚨 오류 ${n(y.errors)}건 (${n(y.errorKinds)}종류)${n(y.errors) ? " — 관리자 화면 '오류'에서 확인하세요" : ""}`,
    "",
    `관리자 화면: ${SITE}/admin`,
  ];
  await sendMail(to, `[냥신 점괘] ${y.day} 요약 · 매출 ${won(n(y.sales))} · 방문 ${n(y.visits)}`, lines.join("\n"));
  return NextResponse.json({ ok: true, day: y.day, expired });
}
