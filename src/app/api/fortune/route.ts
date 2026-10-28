import { NextResponse } from "next/server";
import { buildFortuneTeaser, fortuneHash, validateFortune } from "@/engine/fortune";
import type { FortuneAnalyzeResponse } from "@/models/types";

/** POST /api/fortune — free part of a 사주·대운·재회·배우자 reading. The 감정서 itself is only built after unlock. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { input?: unknown } | null;
  const input = validateFortune(body?.input);
  if (!input) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const res: FortuneAnalyzeResponse = { teaser: buildFortuneTeaser(input), inputHash: fortuneHash(input) };
  return NextResponse.json(res);
}
