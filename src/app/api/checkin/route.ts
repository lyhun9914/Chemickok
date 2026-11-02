import { NextResponse, type NextRequest } from "next/server";
import { STREAK_COINS, STREAK_EVERY } from "@/lib/config";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

/** POST /api/checkin — today's 출석 도장 (KST). Every STREAK_EVERY-th day in a row adds STREAK_COINS to the 복주머니. */
export async function POST(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const r = await db.checkin(uid, day, STREAK_EVERY, STREAK_COINS);
  const balance = r.rewarded ? await db.coins(uid) : undefined;
  return NextResponse.json({ ...r, every: STREAK_EVERY, coins: STREAK_COINS, balance });
}
