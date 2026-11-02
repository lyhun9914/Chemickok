import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { getDb } from "@/services/server/db";

/** GET /api/admin/users/{id} — the member, their 냥 ledger and payments. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const { id } = await ctx.params;
  const user = await db.getUser(id);
  if (!user) return NextResponse.json({ error: "없는 회원이에요." }, { status: 404 });
  const [balance, history, payments] = await Promise.all([db.coins(id), db.coinHistory(id), db.adminPayments(id)]);
  return NextResponse.json({
    user: { id: user.id, provider: user.provider, nickname: user.nickname, email: user.email, created_at: user.created_at },
    balance,
    history,
    payments,
  });
}

/**
 * POST /api/admin/users/{id} { delta, reason: "admin" | "refund", note } — 냥 by hand: 보상(+), 회수(−), or 환불 처리
 * (the 냥 taken back after the money was returned in the Toss console). Never below zero.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { delta?: number; reason?: string; note?: string } | null;
  const delta = Math.trunc(Number(body?.delta));
  const reason = body?.reason === "refund" ? "refund" : "admin";
  if (!delta || Math.abs(delta) > 1000) return NextResponse.json({ error: "1~1000냥 사이로 넣어 주세요." }, { status: 400 });
  if (!(await db.getUser(id))) return NextResponse.json({ error: "없는 회원이에요." }, { status: 404 });
  const note = String(body?.note ?? "").trim().slice(0, 60);
  // the ref keeps a note for the ledger and is unique, so the same adjustment can't be applied twice by accident
  const ref = `${note || reason}#${randomBytes(4).toString("hex")}`;
  const r = await db.coinAdjust(id, delta, reason, ref);
  if (!r.ok) return NextResponse.json({ error: `잔액(${r.balance}냥)보다 많이 뺄 수 없어요.`, balance: r.balance }, { status: 409 });
  return NextResponse.json(r);
}
