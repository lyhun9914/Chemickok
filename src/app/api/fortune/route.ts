import { NextResponse } from "next/server";
import { buildFortuneTeaser, fortuneHash, validateFortune } from "@/engine/fortune";
import type { FortuneAnalyzeResponse } from "@/models/types";

/** Seen by a tab opened before the questions changed too, so it says how to get out of it. */
const STALE = "그사이 질문이 바뀌었거나 빠진 답이 있어요. 화면을 새로고침하면 바뀐 질문부터 이어서 답할 수 있어요.";

/** POST /api/fortune — free part of a 사주·대운·재회·배우자 reading. The 감정서 itself is only built after unlock. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { input?: unknown } | null;
  const input = validateFortune(body?.input);
  if (!input) return NextResponse.json({ error: STALE }, { status: 400 });

  const res: FortuneAnalyzeResponse = { teaser: buildFortuneTeaser(input), inputHash: fortuneHash(input) };
  return NextResponse.json(res);
}
