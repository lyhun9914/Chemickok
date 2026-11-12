import { NextResponse, after, type NextRequest } from "next/server";
import { deviceOf } from "@/lib/device";
import { COMMENT_MAX, RATINGS, SUGGEST_KINDS, SUGGEST_MAX, SUGGEST_MIN, SUGGEST_PER_DAY, cleanTags, cleanText, type Rating, type SuggestKind } from "@/lib/feedback";
import { kstDay, kstStart } from "@/lib/kst";
import { MODES } from "@/lib/pricing";
import { SITE } from "@/lib/site";
import type { Mode } from "@/models/types";
import { getDb, type FeedbackRow } from "@/services/server/db";
import { mailConfigured, sendMail } from "@/services/server/mailer";
import { sessionUserId } from "@/services/server/session";

const LOGIN = { error: "건의함은 로그인한 회원만 쓸 수 있다냥." };
const PAGES = new Set(["home", "result", "my"]);

/** what the member sees of their own 건의 (never the 관리자 메모) */
const view = (f: FeedbackRow) => ({
  id: f.id,
  kind: f.kind as SuggestKind,
  body: f.body,
  status: f.status,
  reply: f.reply,
  adopted: Boolean(f.adopted_at),
  reward: f.reward,
  unread: f.unread,
  createdAt: f.created_at,
  updatedAt: f.updated_at,
});

/** GET /api/feedback — my 건의 (with 답장 · 반영 · 채택) and how many have news; ?ref= — my 평가 of that reading */
export async function GET(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json(LOGIN, { status: 401 });
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref) {
    const r = await db.feedbackRatingOf(uid, ref);
    return NextResponse.json({ rating: r ? { rating: r.rating, tags: r.tags, body: r.body } : null });
  }
  const items = await db.feedbackMine(uid);
  return NextResponse.json({ items: items.map(view), news: items.filter((x) => x.unread).length });
}

/**
 * POST /api/feedback — { kind: "rating", mode, ref, rating, tags?, body? }: 점괘 평가 (once per reading; sending again
 * changes it) · { kind: idea|sad|bug|praise, body, page?, mode? }: 건의 (SUGGEST_PER_DAY a day; 🐞 is mailed at once).
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json(LOGIN, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const page = typeof b?.page === "string" && PAGES.has(b.page) ? b.page : null;
  const mode = typeof b?.mode === "string" && MODES.includes(b.mode as Mode) ? b.mode : null;
  const ua = req.headers.get("user-agent") ?? "";
  const device = ua ? deviceOf(ua) : null;

  if (b?.kind === "rating") {
    const rating = RATINGS.find((r) => r.id === b.rating)?.id as Rating | undefined;
    const ref = typeof b.ref === "string" && /^[rh]:[\w-]{4,80}$/.test(b.ref) ? b.ref : null;
    if (!rating || !ref || !mode) return NextResponse.json({ error: "평가를 다시 골라 줘라냥." }, { status: 400 });
    const row = await db.feedbackRate({ user_id: uid, ref, rating, tags: cleanTags(b.tags), body: cleanText(b.body, COMMENT_MAX), mode, page: "result", device });
    return NextResponse.json({ ok: true, rating: { rating: row.rating, tags: row.tags, body: row.body } });
  }

  const kind = SUGGEST_KINDS.find((k) => k.id === b?.kind);
  if (!kind) return NextResponse.json({ error: "어떤 의견인지 골라 줘라냥." }, { status: 400 });
  const body = cleanText(b?.body, SUGGEST_MAX);
  if (body.length < SUGGEST_MIN) return NextResponse.json({ error: `${SUGGEST_MIN}글자 이상 적어 줘라냥.` }, { status: 400 });
  if ((await db.feedbackCountSince(uid, kstStart(kstDay()))) >= SUGGEST_PER_DAY)
    return NextResponse.json({ error: `건의는 하루에 ${SUGGEST_PER_DAY}번까지 보낼 수 있다냥. 내일 또 들려줘라냥 🐾` }, { status: 429 });
  const row = await db.feedbackAdd({ user_id: uid, kind: kind.id, body, mode, page, device });

  // 🐞 오류 신고 goes to the 관리자 mail right away (the rest is in the morning summary)
  const to = process.env.ADMIN_EMAIL;
  if (kind.id === "bug" && to && mailConfigured()) {
    after(async () => {
      const user = await db.getUser(uid).catch(() => null);
      await sendMail(
        to,
        `[냥신 점괘] 🐞 오류 신고: ${body.slice(0, 40)}`,
        [
          "회원이 냥신 건의함으로 오류를 알려 왔어요.",
          "",
          `보낸 회원: ${user?.nickname ?? "-"}`,
          `보낸 곳: ${page ?? "-"}${mode ? ` · ${mode}` : ""} · ${device ?? "-"}`,
          "",
          body,
          "",
          `답장·상태 바꾸기: ${SITE}/admin#feedback`,
        ].join("\n"),
      ).catch((e) => console.error("bug report mail failed", e));
    });
  }
  return NextResponse.json({ ok: true, item: view(row) });
}

/** PATCH /api/feedback — 내 건의함을 봤다: the red dot goes away. */
export async function PATCH(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json(LOGIN, { status: 401 });
  await db.feedbackSeen(uid);
  return NextResponse.json({ ok: true });
}
