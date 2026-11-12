import { NextResponse, type NextRequest } from "next/server";
import { chemRoom } from "@/engine/groupChem";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

/**
 * GET /api/mine — 내 점괘함의 '친구와 나눈 점괘': the quizzes this account made and the 케미표 it is in, each with what the
 * list needs (who leads, how many played or joined, when it lapses). Any device, once logged in.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const [quizzes, roomIds] = await Promise.all([db.quizzesOf(uid), db.roomsOf(uid)]);
  const rooms = (await Promise.all(roomIds.map((id) => db.roomGet(id).then((r) => (r ? { id, r } : null))))).filter(Boolean) as {
    id: string;
    r: NonNullable<Awaited<ReturnType<typeof db.roomGet>>>;
  }[];
  return NextResponse.json({
    quizzes: quizzes.map(({ quiz, plays }) => ({
      id: quiz.id,
      owner: quiz.owner_name,
      total: quiz.items.length,
      plays: plays.length,
      leader: plays[0] ? { name: plays[0].name, score: plays[0].score } : null,
      createdAt: quiz.created_at,
      expiresAt: quiz.expires_at,
    })),
    rooms: rooms.map(({ id, r }) => {
      const me = r.members.findIndex((m) => m.user_id === uid);
      const chem = chemRoom(r.members.map((m) => ({ name: m.name, birthdate: m.birthdate })));
      return {
        id,
        title: r.room.title,
        count: r.members.length,
        me: me >= 0 ? r.members[me].name : null,
        creator: me === 0,
        best: chem.best ? { a: r.members[chem.best.a].name, b: r.members[chem.best.b].name, score: chem.best.score } : null,
        createdAt: r.room.created_at,
        expiresAt: r.room.expires_at,
      };
    }),
  });
}
