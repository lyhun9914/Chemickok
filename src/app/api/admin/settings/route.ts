import { NextResponse, after, type NextRequest } from "next/server";
import { won } from "@/lib/config";
import { cleanFeedbackSettings } from "@/lib/feedback";
import { DEFAULT_PRICING, cleanBanner, cleanPricing, cleanSale, type Banner, type Pricing, type Sale } from "@/lib/pricing";
import { followUpMail, priceFollowUps, type FollowUp } from "@/lib/priceFollowUps";
import { adminOnly } from "@/services/server/admin";
import { audit } from "@/services/server/audit";
import { getDb } from "@/services/server/db";
import { mailConfigured, sendMail } from "@/services/server/mailer";
import { dropSettingsCache, getSettings } from "@/services/server/settings";

/** GET /api/admin/settings — the live 가격 · 세일 · 공지, and the code's default prices (to go back to). */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  return NextResponse.json({ ...(await getSettings(true)), defaults: DEFAULT_PRICING });
}

const sumPricing = (p: Pricing) =>
  `묶음 ${p.packs.map((x) => `${x.coins}냥 ${won(x.price)}`).join(", ")} / 점괘 ${Object.entries(p.costs).map(([m, c]) => `${m} ${c}냥`).join(", ")}`;
const sumSale = (s: Sale) =>
  s.on ? `켬 · ${s.label || "충전 세일"} · 할인 ${s.discountPct}% · 보너스 ${s.bonusPct}% · ${s.from || "지금"} ~ ${s.to || "끝 없음"}` : "끔";
const sumBanner = (b: Banner) => (b.on ? `켬 · ${b.tone} · ${b.text}${b.link ? ` (${b.link})` : ""}` : "끔");

/** POST /api/admin/settings { key: "pricing" | "sale" | "banner" | "feedback", value } — saves after the same checks the app uses. */
export async function POST(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { key?: string; value?: unknown } | null;
  const before = await getSettings(true);
  let summary: [string, string];
  let value: unknown;
  let followUps: FollowUp[] = [];
  switch (body?.key) {
    case "pricing": {
      const r = cleanPricing(body.value);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      value = r.value;
      summary = [sumPricing(before.pricing), sumPricing(r.value)];
      followUps = priceFollowUps(before.pricing, r.value);
      break;
    }
    case "sale": {
      const r = cleanSale(body.value);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      value = r.value;
      summary = [sumSale(before.sale), sumSale(r.value)];
      break;
    }
    case "banner": {
      const r = cleanBanner(body.value);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      value = r.value;
      summary = [sumBanner(before.banner), sumBanner(r.value)];
      break;
    }
    case "feedback": {
      const r = cleanFeedbackSettings(body.value);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      value = r.value;
      summary = [`채택 선물 ${before.feedback.adoptReward}냥`, `채택 선물 ${r.value.adoptReward}냥`];
      break;
    }
    default:
      return NextResponse.json({ error: "바꿀 설정이 없어요." }, { status: 400 });
  }
  await db.setSetting(body.key, value);
  dropSettingsCache();
  const name = { pricing: "가격 변경", sale: "세일 설정", banner: "공지 배너", feedback: "건의 채택 선물" }[body.key];
  after(() => audit(name, body.key ?? null, `전: ${summary[0]}\n후: ${summary[1]}`));
  // 사이트 밖에 적어 둔 가격(인스타 DM 답변, 릴스 캡션, 토스 결제경로): the 관리자 gets the list by mail as well
  const to = process.env.ADMIN_EMAIL;
  if (followUps.length && to && mailConfigured()) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    after(() =>
      sendMail(to, `[냥신 점괘] 가격을 바꿨어요 · 같이 고칠 곳 ${followUps.length}개`, followUpMail(followUps, site)).catch((e) => console.error("price follow-up mail failed", e)),
    );
  }
  return NextResponse.json({ ok: true, followUps, ...(await getSettings(true)) });
}
