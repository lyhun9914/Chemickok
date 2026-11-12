import { NextResponse, after, type NextRequest } from "next/server";
import { NOTIFY_STATUS, STATUS, SUGGEST_MAX, cleanText, type FeedbackStatus } from "@/lib/feedback";
import { adminOnly } from "@/services/server/admin";
import { audit } from "@/services/server/audit";
import { getDb } from "@/services/server/db";
import { mailConfigured } from "@/services/server/mailer";
import { getSettings } from "@/services/server/settings";

const NO_DB = { error: "DB가 연결되지 않았어요." };
const idOf = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

/** GET /api/admin/feedback?days=60 — 건의 and 점괘 평가 of the last days, the 채택 선물, whether 🐞 is mailed. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json(NO_DB, { status: 503 });
  const days = Math.min(365, Math.max(1, Math.trunc(Number(req.nextUrl.searchParams.get("days")) || 60)));
  const [items, settings] = await Promise.all([db.adminFeedback(new Date(Date.now() - days * 864e5).toISOString()), getSettings(true)]);
  return NextResponse.json({
    items: items.map((f) => ({
      id: f.id,
      kind: f.kind,
      rating: f.rating,
      tags: f.tags,
      body: f.body,
      mode: f.mode,
      page: f.page,
      device: f.device,
      status: f.status,
      memo: f.memo,
      reply: f.reply,
      adoptedAt: f.adopted_at,
      reward: f.reward,
      createdAt: f.created_at,
      userId: f.user_id,
      nickname: f.users?.nickname ?? "(탈퇴)",
      provider: f.users?.provider ?? "",
    })),
    adoptReward: settings.feedback.adoptReward,
    mail: Boolean(process.env.ADMIN_EMAIL) && mailConfigured(),
  });
}

/**
 * PATCH /api/admin/feedback { id, status?, memo?, reply? } — 상태 · 메모 · 답장. A 답장, or 반영 예정 · 반영됨 · 보류,
 * lights the member's red dot (반영 알림).
 */
export async function PATCH(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json(NO_DB, { status: 503 });
  const b = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown; memo?: unknown; reply?: unknown } | null;
  const id = idOf(b?.id);
  const row = id ? await db.feedbackGet(id) : null;
  if (!row) return NextResponse.json({ error: "의견을 찾을 수 없어요." }, { status: 404 });
  const patch: Parameters<typeof db.adminFeedbackUpdate>[1] = {};
  if (b?.memo !== undefined) patch.memo = cleanText(b.memo, 500);
  if (row.kind !== "rating") {
    if (b?.status !== undefined) {
      if (!(String(b.status) in STATUS)) return NextResponse.json({ error: "상태를 다시 골라 주세요." }, { status: 400 });
      patch.status = b.status as FeedbackStatus;
    }
    if (b?.reply !== undefined) patch.reply = cleanText(b.reply, SUGGEST_MAX);
    const news = (patch.status && patch.status !== row.status && NOTIFY_STATUS.includes(patch.status)) || (patch.reply !== undefined && patch.reply !== row.reply && patch.reply !== "");
    if (news) patch.unread = true;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "바꿀 것이 없어요." }, { status: 400 });
  const after_ = await db.adminFeedbackUpdate(row.id, patch);
  return NextResponse.json({ ok: true, item: after_ && { status: after_.status, memo: after_.memo, reply: after_.reply } });
}

/**
 * POST /api/admin/feedback { id, action: "adopt" } — 채택: the member gets the 채택 선물 (관리자 설정, once per 건의) and
 * a red dot; a 건의 still waiting moves to 반영 예정.
 */
export async function POST(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json(NO_DB, { status: 503 });
  const b = (await req.json().catch(() => null)) as { id?: unknown; action?: unknown } | null;
  if (b?.action !== "adopt") return NextResponse.json({ error: "할 일을 알 수 없어요." }, { status: 400 });
  const id = idOf(b.id);
  const row = id ? await db.feedbackGet(id) : null;
  if (!row) return NextResponse.json({ error: "의견을 찾을 수 없어요." }, { status: 404 });
  if (row.kind === "rating" || row.kind === "praise") return NextResponse.json({ error: "건의(이런 거 생겼으면 · 아쉬웠던 점 · 오류)만 채택할 수 있어요." }, { status: 400 });
  if (row.adopted_at) return NextResponse.json({ error: "이미 채택한 의견이에요." }, { status: 409 });
  const reward = (await getSettings(true)).feedback.adoptReward;
  // the ledger ref makes the 선물 one-off even if two clicks race
  const paid = reward > 0 ? await db.coinAdd(row.user_id, reward, "bonus", `idea:${row.id}`) : null;
  // applied=false: a click a moment ago already gave it — still the same 선물
  const given = paid ? reward : 0;
  await db.adminFeedbackUpdate(row.id, {
    adopted_at: new Date().toISOString(),
    reward: given,
    unread: true,
    ...(row.status === "new" || row.status === "seen" ? { status: "planned" as const } : {}),
  });
  after(() => audit("건의 채택", row.user_id, `#${row.id} · 선물 ${given}냥 · ${row.body.slice(0, 120)}`));
  return NextResponse.json({ ok: true, reward: given, balance: paid?.balance ?? null });
}
