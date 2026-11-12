import { NextResponse, type NextRequest } from "next/server";
import { QUIZ_LEN, quizQ } from "@/lib/quizBank";
import { getDb } from "@/services/server/db";
import { cleanName, newKey, newRoomId } from "@/services/server/funInput";
import { sessionUserId } from "@/services/server/session";

/**
 * POST /api/quiz { name, items: [{ q, a }] } — "나를 얼마나 아냥?" 퀴즈 만들기 (QUIZ_LEN questions, kept 30 days). The maker keeps a key
 * in this browser, and a logged-in maker's quiz is tied to the account (내 점괘함 on any device). → { id, key }
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "지금은 퀴즈를 만들 수 없어요." }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { name?: unknown; items?: unknown } | null;
  const name = cleanName(b?.name);
  if (!name) return NextResponse.json({ error: "이름은 1~10글자로 넣어 주세요." }, { status: 400 });
  const raw = Array.isArray(b?.items) ? (b.items as { q?: unknown; a?: unknown }[]) : [];
  const items = raw.map((x) => ({ q: String(x?.q ?? ""), a: Number(x?.a) }));
  const ok =
    items.length === QUIZ_LEN &&
    new Set(items.map((x) => x.q)).size === QUIZ_LEN &&
    items.every((x) => quizQ(x.q) && Number.isInteger(x.a) && x.a >= 0 && x.a < 4);
  if (!ok) return NextResponse.json({ error: `문제 ${QUIZ_LEN}개에 모두 답해 주세요.` }, { status: 400 });
  const id = newRoomId();
  const key = newKey();
  await db.quizCreate({ id, owner_name: name, items, owner_user: sessionUserId(req), owner_key: key });
  return NextResponse.json({ id, key });
}
