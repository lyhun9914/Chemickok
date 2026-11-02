import { NextResponse, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { getDb } from "@/services/server/db";

/** GET /api/admin/stats — 가입 · 매출 · 냥 · 점괘 · 초대장 · 선물 숫자. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  return NextResponse.json(await db.adminStats());
}
