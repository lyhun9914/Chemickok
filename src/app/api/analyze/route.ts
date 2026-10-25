import { NextResponse } from "next/server";
import { buildTeaser, inputHash, validateInput } from "@/engine/analyze";
import type { AnalyzeResponse } from "@/models/types";

/** POST /api/analyze — deterministic free teaser. Paid sections are only built after unlock. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { input?: unknown } | null;
  const input = validateInput(body?.input);
  if (!input) return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });

  const res: AnalyzeResponse = { teaser: buildTeaser(input), inputHash: inputHash(input) };
  return NextResponse.json(res);
}
