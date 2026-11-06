import { randomBytes } from "node:crypto";
import { NextResponse, after, type NextRequest } from "next/server";
import { adminOnly } from "@/services/server/admin";
import { audit } from "@/services/server/audit";
import { getDb } from "@/services/server/db";

/** GET /api/admin/coupons — every coupon, newest first. */
export async function GET(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  return NextResponse.json({ coupons: await db.couponList() });
}

/** A code nobody guesses: 8 letters/digits without look-alikes (0/O, 1/I). */
const randomCode = () => Array.from(randomBytes(8), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

/** POST /api/admin/coupons { code?, coins, maxUses?, expiresAt?, socialOnly, note } — makes a coupon. */
export async function POST(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { code?: string; coins?: number; maxUses?: number | null; expiresAt?: string; socialOnly?: boolean; note?: string } | null;
  const code = String(b?.code ?? "").trim().toUpperCase() || randomCode();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return NextResponse.json({ error: "코드는 영문 대문자·숫자 3~24자로 넣어 주세요." }, { status: 400 });
  const coins = Math.trunc(Number(b?.coins));
  if (!(coins >= 1 && coins <= 100)) return NextResponse.json({ error: "쿠폰 냥은 1~100냥으로 넣어 주세요." }, { status: 400 });
  const maxUses = b?.maxUses === null || b?.maxUses === undefined || String(b.maxUses) === "" ? null : Math.trunc(Number(b.maxUses));
  if (maxUses !== null && !(maxUses >= 1 && maxUses <= 100000)) return NextResponse.json({ error: "선착순 인원은 1명 이상으로 넣거나 비워 두세요." }, { status: 400 });
  const exp = String(b?.expiresAt ?? "").trim();
  if (exp && Number.isNaN(Date.parse(exp))) return NextResponse.json({ error: "마감 날짜가 올바르지 않아요." }, { status: 400 });
  const expiresAt = exp ? new Date(exp).toISOString() : null;
  if (expiresAt && Date.parse(expiresAt) < Date.now()) return NextResponse.json({ error: "마감 날짜가 이미 지났어요." }, { status: 400 });
  const note = String(b?.note ?? "").trim().slice(0, 60) || null;
  const ok = await db.couponCreate({ code, coins, max_uses: maxUses, expires_at: expiresAt, social_only: b?.socialOnly !== false, note });
  if (!ok) return NextResponse.json({ error: "이미 있는 코드예요." }, { status: 409 });
  after(() => audit("쿠폰 만들기", code, `${coins}냥 · ${maxUses ? `선착순 ${maxUses}명` : "인원 제한 없음"} · ${expiresAt ?? "마감 없음"} · ${b?.socialOnly !== false ? "소셜 가입만" : "모든 회원"}${note ? ` · ${note}` : ""}`));
  return NextResponse.json({ ok: true, code });
}

/** PATCH /api/admin/coupons { code, active } — turns a coupon on or off. */
export async function PATCH(req: NextRequest) {
  const denied = adminOnly(req);
  if (denied) return denied;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DB가 연결되지 않았어요." }, { status: 503 });
  const b = (await req.json().catch(() => null)) as { code?: string; active?: boolean } | null;
  if (!b?.code) return NextResponse.json({ error: "쿠폰이 없어요." }, { status: 400 });
  await db.couponSetActive(b.code, Boolean(b.active));
  after(() => audit(b.active ? "쿠폰 켜기" : "쿠폰 끄기", b.code ?? null, null));
  return NextResponse.json({ ok: true });
}
