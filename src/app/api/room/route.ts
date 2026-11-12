import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/services/server/db";
import { cleanBirth, cleanName, newKey, newRoomId } from "@/services/server/funInput";
import { sessionUserId } from "@/services/server/session";

/**
 * POST /api/room { title, name, birthdate } — 단톡방 케미표 만들기. The maker is its first member; the link carries the
 * room id, and each member keeps a key (in their browser) to take themself out. Kept 30 days. → { id, key }
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "지금은 케미표를 만들 수 없어요." }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { title?: unknown; name?: unknown; birthdate?: unknown } | null;
  const name = cleanName(b?.name);
  const birthdate = cleanBirth(b?.birthdate);
  const title = String(b?.title ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 20) || "우리 단톡방";
  if (!name) return NextResponse.json({ error: "이름은 1~10글자로 넣어 주세요." }, { status: 400 });
  if (!birthdate) return NextResponse.json({ error: "생년월일을 확인해 주세요." }, { status: 400 });
  const id = newRoomId();
  const key = newKey();
  await db.roomCreate({ id, title }, { name, birthdate, key, user: sessionUserId(req) });
  return NextResponse.json({ id, key });
}
