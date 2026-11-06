import { NextResponse, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { getDb } from "@/services/server/db";
import { isDay, kstEnd, kstStart } from "@/lib/kst";

/** GET /api/admin/payments?q=&from=&to= — the latest payments with who paid; q = 주문번호 or 회원 닉네임·이메일. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const sp = req.nextUrl.searchParams;
  const day = (d: string | null, end = false) => (d && isDay(d) ? (end ? kstEnd(d) : kstStart(d)) : undefined);
  return NextResponse.json({
    payments: await db.adminPayments({ q: (sp.get("q") ?? "").slice(0, 60), from: day(sp.get("from")), to: day(sp.get("to"), true), limit: 100 }),
  });
}
