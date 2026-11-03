import { NextResponse } from "next/server";
import { buildTeaser, inputHash, validateInput } from "@/engine/analyze";
import type { AnalyzeResponse } from "@/models/types";

/** Seen by a tab opened before the questions changed too, so it says how to get out of it. */
const STALE = "그사이 질문이 바뀌었거나 빠진 답이 있어요. 화면을 새로고침하면 바뀐 질문부터 이어서 답할 수 있어요.";

/** POST /api/analyze — deterministic free teaser. Paid sections are only built after unlock. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { input?: unknown } | null;
  const input = validateInput(body?.input);
  if (!input) return NextResponse.json({ error: STALE }, { status: 400 });

  const res: AnalyzeResponse = { teaser: buildTeaser(input), inputHash: inputHash(input) };
  return NextResponse.json(res);
}
