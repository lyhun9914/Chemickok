import { NextResponse, type NextRequest } from "next/server";
import { pairReading, validateInput } from "@/engine/analyze";
import { type PairRow, getDb } from "@/services/server/db";

const resultOf = (p: PairRow) =>
  p.to_person && p.to_self && p.to_obs
    ? pairReading({ person: p.from_person, self: p.from_self, obs: p.from_obs }, { person: p.to_person, self: p.to_self, obs: p.to_obs }, p.status ?? "dating")
    : null;

const view = (p: PairRow) => ({
  from: p.from_name,
  fromGender: p.from_person.gender,
  status: p.status ?? "dating",
  to: p.to_person?.name || p.to_name,
  answered: Boolean(p.answered_at),
  result: resultOf(p),
});

/** GET /api/pair/{id} — who sent it, whether the other side answered, and the 맞궁합 once they did. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/pair/[id]">) {
  const { id } = await ctx.params;
  const p = await getDb()?.pairGet(id).catch(() => null);
  if (!p) return NextResponse.json({ error: "초대장이 없거나 기간(30일)이 지났어요." }, { status: 404 });
  return NextResponse.json(view(p));
}

/** POST /api/pair/{id} { input } — the invited person's own couple interview (about the sender). Once only. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/pair/[id]">) {
  const { id } = await ctx.params;
  const db = getDb();
  const p = await db?.pairGet(id).catch(() => null);
  if (!db || !p) return NextResponse.json({ error: "초대장이 없거나 기간(30일)이 지났어요." }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { input?: unknown } | null;
  const input = validateInput(body?.input);
  if (!input || input.mode !== "couple" || input.status !== (p.status ?? "dating"))
    return NextResponse.json({ error: "면담 답이 올바르지 않아요." }, { status: 400 });
  const ok = await db.pairAnswer(id, { to_person: input.me, to_self: input.self, to_obs: input.partnerObs });
  const now = ok ? await db.pairGet(id) : p;
  if (!ok) return NextResponse.json({ ...view(now!), error: "이미 답한 초대장이에요." }, { status: 409 });
  return NextResponse.json(view(now!));
}
