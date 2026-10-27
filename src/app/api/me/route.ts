import { NextResponse, type NextRequest } from "next/server";
import { normalizeMbti } from "@/engine/mbti";
import type { Gender, PersonInput } from "@/models/types";
import { devLoginEnabled, getDb } from "@/services/server/db";
import { enabledProviders } from "@/services/server/oauth";
import { authConfigured, clearSession, sessionUserId } from "@/services/server/session";

const providers = () => (getDb() && authConfigured() ? [...enabledProviders(), ...(devLoginEnabled() ? ["dev"] : [])] : []);

/** GET /api/me — who is logged in (or null), and which login buttons to show. */
export async function GET(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  const user = db && uid ? await db.getUser(uid).catch(() => null) : null;
  const res = NextResponse.json({
    user: user && { id: user.id, provider: user.provider, nickname: user.nickname, profile: user.profile },
    providers: providers(),
  });
  if (uid && !user) clearSession(res);
  return res;
}

function cleanProfile(p: Partial<PersonInput> | undefined): PersonInput | null {
  const name = String(p?.name ?? "").trim().slice(0, 12);
  const birthdate = String(p?.birthdate ?? "");
  const birthtime = String(p?.birthtime ?? "");
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) return null;
  return {
    name,
    gender: (["female", "male", "other"] as Gender[]).includes(p?.gender as Gender) ? (p!.gender as Gender) : "other",
    birthdate,
    birthtime: /^\d{2}:\d{2}$/.test(birthtime) ? birthtime : "",
    mbti: normalizeMbti(p?.mbti),
  };
}

/** PUT /api/me — save 기본 정보. */
export async function PUT(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { profile?: Partial<PersonInput> } | null;
  const profile = cleanProfile(body?.profile);
  if (!profile) return NextResponse.json({ error: "기본 정보가 올바르지 않아요." }, { status: 400 });
  await db.updateProfile(uid, profile);
  return NextResponse.json({ profile });
}

/** DELETE /api/me — 회원 탈퇴: deletes the account and every saved reading; payment records lose the user link. */
export async function DELETE(req: NextRequest) {
  const db = getDb();
  const uid = sessionUserId(req);
  if (!db || !uid) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  await db.deleteUser(uid);
  const res = NextResponse.json({ ok: true });
  clearSession(res);
  return res;
}
