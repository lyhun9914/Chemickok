import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { validateInput } from "@/engine/analyze";
import { getDb } from "@/services/server/db";
import { sessionUserId } from "@/services/server/session";

/**
 * POST /api/pair { input } — 맞궁합 초대장. From a couple reading: keeps the sender's own answers (and what they said
 * about the other) for 30 days, so the other person can answer with theirs. → { id }
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "지금은 초대장을 만들 수 없어요." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { input?: unknown } | null;
  const input = validateInput(body?.input);
  if (!input || input.mode !== "couple") return NextResponse.json({ error: "궁합 면담을 먼저 마쳐 주세요." }, { status: 400 });
  const id = randomBytes(9).toString("base64url");
  await db.pairCreate({
    id,
    from_user: sessionUserId(req),
    from_name: input.me.name,
    from_person: input.me,
    from_self: input.self,
    from_obs: input.partnerObs,
    to_name: input.partner.name,
    status: input.status,
  });
  return NextResponse.json({ id });
}
