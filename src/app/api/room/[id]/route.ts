import { NextResponse, type NextRequest } from "next/server";
import { chemRoom } from "@/engine/groupChem";
import { josa } from "@/lib/josa";
import { getDb, type RoomMemberRow, type RoomRow } from "@/services/server/db";
import { cleanBirth, cleanName, isId, newKey } from "@/services/server/funInput";
import { sessionUserId } from "@/services/server/session";

/** a room holds at most this many people */
const MAX = 12;
const GONE = { error: "케미표가 없거나 기간(30일)이 지났다냥." };

/** Which member this visitor is: by the key their browser kept, else by their account. -1 = not in. */
function whoIs(members: RoomMemberRow[], key: string | null, uid: string | null) {
  const byKey = key ? members.findIndex((m) => m.member_key === key) : -1;
  return byKey >= 0 ? byKey : uid ? members.findIndex((m) => m.user_id === uid) : -1;
}

/** What a visitor sees: names, cats and scores. Birthdays and keys never leave the server. members[0] made the room. */
function view(r: { room: RoomRow; members: RoomMemberRow[] }, me: number) {
  const chem = chemRoom(r.members.map((m) => ({ name: m.name, birthdate: m.birthdate })));
  return { title: r.room.title, createdAt: r.room.created_at, expiresAt: r.room.expires_at, max: MAX, me, creator: me === 0, ...chem };
}

/** GET /api/room/{id}?key= — the room's 케미표 (a guest member now logged in joins it to their account). */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/room/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const r = db && isId(id) ? await db.roomGet(id).catch(() => null) : null;
  if (!db || !r) return NextResponse.json(GONE, { status: 404 });
  const key = req.nextUrl.searchParams.get("key");
  const uid = sessionUserId(req);
  const me = whoIs(r.members, key, uid);
  if (me >= 0 && uid && key && !r.members[me].user_id) await db.roomClaim(id, key, uid).catch(() => null);
  return NextResponse.json(view(r, me));
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
  const uid = sessionUserId(req);
  const before = await db.roomGet(id);
  if (!before) return NextResponse.json(GONE, { status: 404 });
  if (uid && before.members.some((m) => m.user_id === uid)) return NextResponse.json({ error: "이 계정은 벌써 이 방에 들어와 있다냥." }, { status: 409 });
  const key = newKey();
  const j = await db.roomJoin(id, { name, birthdate, key, user: uid }, MAX);
  if (!j.ok) {
    if (j.reason === "none") return NextResponse.json(GONE, { status: 404 });
    return NextResponse.json({ error: j.reason === "name" ? `${josa(name, "은/는")} 이미 들어와 있다냥. 다른 이름(별명)으로 넣어라냥.` : `한 방에 ${MAX}명까지다냥.` }, { status: 409 });
  }
  const r = await db.roomGet(id);
  return NextResponse.json({ ...view(r!, r!.members.findIndex((m) => m.member_key === key)), key });
}

/**
 * DELETE /api/room/{id} { key, all } — 나 빼기 (this member and their birthday), or with all=true the maker deletes the
 * whole room. The member is found by their key, else their account. The last one out takes the room with them.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/room/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const r = db && isId(id) ? await db.roomGet(id).catch(() => null) : null;
  if (!db || !r) return NextResponse.json(GONE, { status: 404 });
  const b = (await req.json().catch(() => null)) as { key?: unknown; all?: unknown } | null;
  const key = typeof b?.key === "string" && b.key ? b.key : null;
  const uid = sessionUserId(req);
  const me = whoIs(r.members, key, uid);
  if (me < 0) return NextResponse.json({ error: "이미 빠졌거나 없는 사람이다냥." }, { status: 404 });
  if (b?.all === true) {
    if (me !== 0) return NextResponse.json({ error: "케미표를 만든 사람만 방을 지울 수 있다냥." }, { status: 403 });
    await db.roomDelete(id);
    return NextResponse.json({ ok: true, deleted: true });
  }
  const ok = await db.roomLeave(id, { key: r.members[me].member_key });
  if (!ok) return NextResponse.json({ error: "이미 빠졌거나 없는 사람이다냥." }, { status: 404 });
  // the last one out: nobody is left to see it, so the room goes too
  if (r.members.length === 1) {
    await db.roomDelete(id);
    return NextResponse.json({ ok: true, deleted: true });
  }
  return NextResponse.json({ ok: true });
}
