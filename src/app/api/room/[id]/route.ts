import { NextResponse, type NextRequest } from "next/server";
import { chemRoom } from "@/engine/groupChem";
import { getDb, type RoomMemberRow, type RoomRow } from "@/services/server/db";
import { josa } from "@/lib/josa";
import { cleanBirth, cleanName, isId, newKey } from "@/services/server/funInput";

/** a room holds at most this many people */
const MAX = 12;
const GONE = { error: "케미표가 없거나 기간(30일)이 지났다냥." };

/** What a visitor sees: names, cats and scores. Birthdays never leave the server. `me` = the member this key belongs to. */
function view(r: { room: RoomRow; members: RoomMemberRow[] }, key: string | null) {
  const chem = chemRoom(r.members.map((m) => ({ name: m.name, birthdate: m.birthdate })));
  return { title: r.room.title, expiresAt: r.room.expires_at, max: MAX, me: key ? r.members.findIndex((m) => m.member_key === key) : -1, ...chem };
}

/** GET /api/room/{id}?key= — the room's 케미표. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/room/[id]">) {
  const { id } = await ctx.params;
  const r = isId(id) ? await getDb()?.roomGet(id).catch(() => null) : null;
  if (!r) return NextResponse.json(GONE, { status: 404 });
  return NextResponse.json(view(r, req.nextUrl.searchParams.get("key")));
}

/** POST /api/room/{id} { name, birthdate } — join. → the 케미표 with `key` (kept by the joiner to leave later) */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/room/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  if (!db || !isId(id)) return NextResponse.json(GONE, { status: 404 });
  const b = (await req.json().catch(() => null)) as { name?: unknown; birthdate?: unknown } | null;
  const name = cleanName(b?.name);
  const birthdate = cleanBirth(b?.birthdate);
  if (!name) return NextResponse.json({ error: "이름은 1~10글자로 넣어 주세요." }, { status: 400 });
  if (!birthdate) return NextResponse.json({ error: "생년월일을 확인해 주세요." }, { status: 400 });
  const key = newKey();
  const j = await db.roomJoin(id, { name, birthdate, key }, MAX);
  if (!j.ok) {
    if (j.reason === "none") return NextResponse.json(GONE, { status: 404 });
    return NextResponse.json({ error: j.reason === "name" ? `${josa(name, "은/는")} 이미 들어와 있다냥. 다른 이름(별명)으로 넣어라냥.` : `한 방에 ${MAX}명까지다냥.` }, { status: 409 });
  }
  const r = await db.roomGet(id);
  return NextResponse.json({ ...view(r!, key), key });
}

/** DELETE /api/room/{id} { key } — 나 빼기: removes this member and their birthday. */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/room/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const b = (await req.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof b?.key === "string" ? b.key : "";
  if (!db || !isId(id) || !key) return NextResponse.json({ error: "뺄 사람을 찾지 못했다냥." }, { status: 400 });
  const ok = await db.roomLeave(id, key);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "이미 빠졌거나 없는 사람이다냥." }, { status: 404 });
}
