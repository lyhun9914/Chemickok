import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

/** GET /api/readings — 내 점괘함 목록 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  return NextResponse.json({ readings: await db.listReadings(uid) });
}
