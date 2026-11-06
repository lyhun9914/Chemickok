import { NextResponse, type NextRequest } from "next/server";
import { kstDay } from "@/lib/kst";
import { adminOnly } from "@/services/server/admin";
import { getDb } from "@/services/server/db";

/** GET /api/admin/day — 오늘과 어제 (KST) 한눈에: 방문, 면담, 결제, 매출, 환불, 신규 회원, 오류. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const [today, yesterday] = await Promise.all([db.adminDay(kstDay()), db.adminDay(kstDay(-1))]);
  return NextResponse.json({ today, yesterday });
}
