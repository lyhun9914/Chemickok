import { NextResponse } from "next/server";
import { dailyFortune } from "@/engine/daily";

/** POST /api/daily — 오늘의 연애운 (free mini game). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { birthdate?: string } | null;
  const result = dailyFortune(body?.birthdate ?? "");
  if (!result) return NextResponse.json({ error: "생년월일을 확인해 주세요." }, { status: 400 });
  return NextResponse.json(result);
}
