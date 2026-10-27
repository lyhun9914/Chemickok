import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

const UUID = /^[0-9a-f-]{36}$/i;

/** GET /api/readings/{id} — a saved, paid reading (only the owner's). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/readings/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const row = UUID.test(id) ? await db.getReading(uid, id) : null;
  if (!row) return NextResponse.json({ error: "점괘를 찾을 수 없어요." }, { status: 404 });
  return NextResponse.json({ reading: row });
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/readings/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (UUID.test(id)) await db.deleteReading(uid, id);
  return NextResponse.json({ ok: true });
}
