import { NextResponse } from "next/server";
import { iljuCard } from "@/engine/ilju";
import { examDay, todayFortune, zodiacToday } from "@/engine/today";

/**
 * POST /api/today — the free corner. Free, nothing stored.
 *   {}                                   → 띠별 오늘의 운세
 *   { birthdate, blood? }                → 오늘의 운세
 *   { kind: "ilju", birthdate }          → 일주 고양이 도감
 *   { kind: "exam", birthdate, date }    → 합격 부적 · 시험날 일진
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { birthdate?: string; kind?: string; date?: string; blood?: string } | null;
  if (body?.kind === "ilju") {
    const ilju = body.birthdate ? iljuCard(body.birthdate) : null;
    return ilju ? NextResponse.json({ ilju }) : NextResponse.json({ error: "생년월일을 확인해 주세요." }, { status: 400 });
  }
  if (body?.kind === "exam") {
    const exam = body.birthdate && body.date ? examDay(body.birthdate, body.date) : null;
    return exam ? NextResponse.json({ exam }) : NextResponse.json({ error: "생년월일과 시험 날짜를 확인해 주세요." }, { status: 400 });
  }
  if (!body?.birthdate) return NextResponse.json({ zodiac: zodiacToday() });
  const fortune = todayFortune(body.birthdate, body.blood);
  if (!fortune) return NextResponse.json({ error: "생년월일을 확인해 주세요." }, { status: 400 });
  return NextResponse.json({ fortune });
}
