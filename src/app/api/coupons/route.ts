import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

const WHY: Record<string, string> = {
  none: "없는 쿠폰 코드예요. 철자를 다시 확인해 주세요.",
  off: "지금은 쓸 수 없는 쿠폰이에요.",
  expired: "기간이 끝난 쿠폰이에요.",
  full: "선착순이 모두 끝난 쿠폰이에요.",
  used: "이미 받은 쿠폰이에요.",
  social: "카카오·네이버·구글로 가입한 계정에서만 받을 수 있는 쿠폰이에요.",
};

/** A few wrong codes in a row from one member slow down (codes can't be guessed by trying). */
const tries = new Map<string, { n: number; at: number }>();

/** POST /api/coupons { code } — 쿠폰 받기: once per member; the 냥 go in the 복주머니. */
export async function POST(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인한 뒤에 쓸 수 있어요." }, { status: 401 });
  const t = tries.get(uid);
  if (t && t.n >= 8 && Date.now() - t.at < 10 * 60e3) return NextResponse.json({ error: "잠시 뒤에 다시 넣어 주세요." }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return NextResponse.json({ error: WHY.none }, { status: 409 });
  const r = await db.couponRedeem(code, uid);
  if (!r.ok) {
    if (r.reason === "none") tries.set(uid, { n: (t && Date.now() - t.at < 10 * 60e3 ? t.n : 0) + 1, at: Date.now() });
    return NextResponse.json({ error: WHY[r.reason ?? "none"] ?? WHY.none }, { status: 409 });
  }
  tries.delete(uid);
  return NextResponse.json({ coins: r.coins, balance: r.balance });
}
