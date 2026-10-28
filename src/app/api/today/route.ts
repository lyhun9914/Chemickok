import { NextResponse } from "next/server";
import { todayFortune, zodiacToday } from "@/engine/today";

/** POST /api/today — 오늘의 운세 (with a birthdate) or 띠별 오늘의 운세 (without). Free. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { birthdate?: string } | null;
  if (!body?.birthdate) return NextResponse.json({ zodiac: zodiacToday() });
  const fortune = todayFortune(body.birthdate);
  if (!fortune) return NextResponse.json({ error: "생년월일을 확인해 주세요." }, { status: 400 });
  return NextResponse.json({ fortune });
}
