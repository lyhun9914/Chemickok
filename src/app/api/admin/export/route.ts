import { NextResponse, after, type NextRequest } from "next/server";
import { isDay, kstDay, kstEnd, kstStart } from "@/lib/kst";
import { adminOnly } from "@/services/server/admin";
import { audit } from "@/services/server/audit";
import { getDb, type AdminPaymentRow } from "@/services/server/db";

const PROVIDER: Record<string, string> = { kakao: "카카오", naver: "네이버", google: "구글", email: "이메일", dev: "테스트" };
const kst = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }) : "");
const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const what = (p: AdminPaymentRow) =>
  p.input_hash.startsWith("charge:") ? `${p.coins ?? Number(/(?:^|-)c(\d+)-/.exec(p.order_id)?.[1] ?? 0)}냥 충전` : "점괘 바로 결제";

/** GET /api/admin/export?from=yyyy-mm-dd&to=yyyy-mm-dd — 결제·환불 내역 CSV (KST days, both included), for 엑셀. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ?? kstDay(-30);
  const to = sp.get("to") ?? kstDay();
  if (!isDay(from) || !isDay(to) || from > to) return NextResponse.json({ error: "기간이 올바르지 않아요." }, { status: 400 });
  const rows = await db.adminPayments({ from: kstStart(from), to: kstEnd(to), limit: 5000 });
  const head = ["결제일시(KST)", "주문번호", "회원", "이메일", "가입", "내용", "결제수단", "결제금액", "환불일시(KST)", "환불금액", "회수한 냥", "환불 사유", "순매출"];
  const lines = rows.reverse().map((p) =>
    [
      kst(p.created_at),
      p.order_id,
      p.user?.nickname ?? "(비회원)",
      p.user?.email ?? "",
      p.user ? (PROVIDER[p.user.provider] ?? p.user.provider) : "",
      what(p),
      p.method === "toss" ? "토스" : p.method,
      p.amount,
      kst(p.refunded_at),
      p.refund_amount ?? "",
      p.refund_coins ?? "",
      p.refund_note ?? "",
      p.method === "toss" ? p.amount - (p.refund_amount ?? 0) : 0,
    ]
      .map(cell)
      .join(","),
  );
  after(() => audit("매출 내려받기", `${from} ~ ${to}`, `${rows.length}건`));
  return new NextResponse(`﻿${[head.join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nyangsin-payments-${from}_${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
