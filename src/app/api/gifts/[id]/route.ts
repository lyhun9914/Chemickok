import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

/** GET /api/gifts/{id} — what the link holds (no user ids). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  const g = await getDb()?.giftGet(id).catch(() => null);
  if (!g) return NextResponse.json({ error: "없는 선물이에요." }, { status: 404 });
  const uid = sessionUserId(req);
  return NextResponse.json({
    from: g.from_name,
    coins: g.coins,
    message: g.message,
    status: g.cancelled_at ? "cancelled" : g.claimed_by ? "claimed" : "open",
    mine: Boolean(uid && g.from_user === uid),
    claimedByMe: Boolean(uid && g.claimed_by === uid),
  });
}

/** POST /api/gifts/{id} { action: "claim" | "cancel" } — take the gift, or (sender) take it back while unclaimed. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인하면 받을 수 있어요." }, { status: 401 });
  const { action } = ((await req.json().catch(() => null)) ?? {}) as { action?: string };
  if (action === "cancel") {
    const r = await db.giftCancel(id, uid);
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: "이미 받았거나 취소된 선물이에요." }, { status: 409 });
  }
  const r = await db.giftClaim(id, uid);
  if (r.ok) return NextResponse.json(r);
  const why: Record<string, string> = {
    none: "없는 선물이에요.",
    cancelled: "보낸 사람이 취소한 선물이에요.",
    taken: "이미 다른 사람이 받은 선물이에요.",
    self: "내가 보낸 선물은 받을 수 없어요.",
  };
  return NextResponse.json({ error: why[r.reason ?? "none"] ?? "받을 수 없는 선물이에요." }, { status: 409 });
}
