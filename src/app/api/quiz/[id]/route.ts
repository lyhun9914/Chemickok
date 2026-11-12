import { NextResponse, type NextRequest } from "next/server";
import { josa } from "@/lib/josa";
import { QUIZ_MAX_PLAYS, quizQ, quizText, quizVerdict } from "@/lib/quizBank";
import { getDb, type QuizPlayRow, type QuizRow } from "@/services/server/db";
import { cleanName, isId } from "@/services/server/funInput";

const GONE = { error: "퀴즈가 없거나 기간(30일)이 지났다냥." };

/** The quiz without its answers (a friend could read them in the page otherwise), the ranking, and how each question went. */
function view(r: { quiz: QuizRow; plays: QuizPlayRow[] }) {
  const { quiz, plays } = r;
  const questions = quiz.items.map((it) => {
    const q = quizQ(it.q)!;
    return { q: quizText(q.q, quiz.owner_name), options: q.options };
  });
  // the question friends missed most (once a few have played)
  const miss = quiz.items.map((_, i) => plays.filter((p) => !(p.mask & (1 << i))).length);
  const hardest = plays.length >= 3 && Math.max(...miss) > 0 ? miss.indexOf(Math.max(...miss)) : -1;
  return {
    owner: quiz.owner_name,
    total: quiz.items.length,
    questions,
    ranking: plays.slice(0, 30).map((p) => ({ name: p.name, score: p.score })),
    plays: plays.length,
    hardest: hardest >= 0 ? { index: hardest, q: questions[hardest].q, missed: miss[hardest] } : null,
    correct: quiz.items.map((_, i) => plays.length - miss[i]),
    expiresAt: quiz.expires_at,
  };
}

/** GET /api/quiz/{id} */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/quiz/[id]">) {
  const { id } = await ctx.params;
  const r = isId(id) ? await getDb()?.quizGet(id).catch(() => null) : null;
  if (!r) return NextResponse.json(GONE, { status: 404 });
  return NextResponse.json(view(r));
}

/** POST /api/quiz/{id} { name, answers: number[] } — a friend's try (once per name). → score, the right answers, the ranking */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/quiz/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const r = db && isId(id) ? await db.quizGet(id).catch(() => null) : null;
  if (!db || !r) return NextResponse.json(GONE, { status: 404 });
  const b = (await req.json().catch(() => null)) as { name?: unknown; answers?: unknown } | null;
  const name = cleanName(b?.name);
  if (!name) return NextResponse.json({ error: "이름은 1~10글자로 넣어 주세요." }, { status: 400 });
  const answers = Array.isArray(b?.answers) ? (b.answers as unknown[]).map(Number) : [];
  const items = r.quiz.items;
  if (answers.length !== items.length || !answers.every((a) => Number.isInteger(a) && a >= 0 && a < 4))
    return NextResponse.json({ error: "모든 문제에 답해 주세요." }, { status: 400 });
  if (name.toLowerCase() === r.quiz.owner_name.toLowerCase())
    return NextResponse.json({ error: "본인 퀴즈는 못 푼다냥. 친구한테 보내라냥 😼" }, { status: 409 });
  const right = items.map((it, i) => answers[i] === it.a);
  const score = right.filter(Boolean).length;
  const mask = right.reduce((m, ok, i) => (ok ? m | (1 << i) : m), 0);
  const j = await db.quizPlay(id, { name, score, mask }, QUIZ_MAX_PLAYS);
  if (!j.ok) {
    if (j.reason === "none") return NextResponse.json(GONE, { status: 404 });
    return NextResponse.json({ error: j.reason === "name" ? `${josa(name, "은/는")} 이미 풀었다냥. 한 사람에 한 번이다냥.` : `이 퀴즈는 ${QUIZ_MAX_PLAYS}명까지 풀 수 있다냥.` }, { status: 409 });
  }
  const now = await db.quizGet(id);
  return NextResponse.json({ ...view(now!), mine: { name, score, right, answers: items.map((it) => it.a), picked: answers, verdict: quizVerdict(score, items.length) } });
}
