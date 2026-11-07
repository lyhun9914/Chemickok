import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { GIFT_MAX } from "@/lib/config";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

const statusOf = (g: { claimed_by: string | null; cancelled_at: string | null }) => (g.cancelled_at ? "cancelled" : g.claimed_by ? "claimed" : "open");

/** GET /api/gifts — the gifts I sent (newest first). */
export async function GET(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const gifts = await db.giftsFrom(uid);
  return NextResponse.json({
    gifts: gifts.map((g) => ({ id: g.id, coins: g.coins, message: g.message, status: statusOf(g), created_at: g.created_at, claimed_at: g.claimed_at })),
  });
}

/** POST /api/gifts { coins, message, name } — 냥 선물: the coins leave my 복주머니 now and wait behind a link. */
export async function POST(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { coins?: number; message?: string; name?: string } | null;
  const coins = Number(body?.coins);
  if (!Number.isInteger(coins) || coins < 1 || coins > GIFT_MAX) return NextResponse.json({ error: "선물할 냥을 골라 주세요." }, { status: 400 });
  const user = await db.getUser(uid);
  const name = (String(body?.name ?? "").trim() || user?.profile?.name || user?.nickname || "냥신 손님").slice(0, 12);
  const message = String(body?.message ?? "").trim().slice(0, 40);
  const id = randomBytes(9).toString("base64url");
  const r = await db.giftSend(uid, id, coins, name, message);
  if (!r.ok) return NextResponse.json({ error: `복주머니에 ${r.balance}냥뿐이다냥. 먼저 채워 줘라냥.`, coins: r.balance }, { status: 402 });
  return NextResponse.json({ id, balance: r.balance });
}
