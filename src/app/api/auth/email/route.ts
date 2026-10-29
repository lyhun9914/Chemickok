import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/services/server/db";
import { REF_COOKIE, giftNewUser } from "@/services/server/gifts";
import { mailConfigured, sendMail } from "@/services/server/mailer";
import { hashPassword, passwordOk, verifyPassword } from "@/services/server/password";
import { authConfigured, seal, setSession, unseal } from "@/services/server/session";

interface Body {
  action?: "signup" | "login" | "reset-request" | "reset";
  email?: string;
  password?: string;
  nickname?: string;
  token?: string;
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const normEmail = (e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : "");
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Wrong passwords: 5 tries per address per 10 minutes on this server instance (a speed bump against guessing).
const tries = new Map<string, { n: number; until: number }>();
const WINDOW = 10 * 60e3;
function blocked(key: string) {
  const t = tries.get(key);
  return Boolean(t && t.until > Date.now() && t.n >= 5);
}
function missed(key: string) {
  const t = tries.get(key);
  tries.set(key, t && t.until > Date.now() ? { n: t.n + 1, until: t.until } : { n: 1, until: Date.now() + WINDOW });
  if (tries.size > 5000) for (const [k, v] of tries) if (v.until < Date.now()) tries.delete(k);
}

/** A reset link works once: it carries a fingerprint of the password it replaces. */
const pwPrint = (hash: string | null | undefined) => createHash("sha256").update(hash ?? "").digest("base64url").slice(0, 16);

/**
 * POST /api/auth/email — 이메일 회원.
 *   signup        { email, password, nickname? }  → logged in
 *   login         { email, password }             → logged in
 *   reset-request { email }                       → a reset link by mail (same answer whether or not the address exists)
 *   reset         { token, password }             → new password, logged in
 */
export async function POST(req: NextRequest) {
  const db = getDb();
  if (!db || !authConfigured()) return fail("지금은 로그인을 쓸 수 없어요.", 503);
  const body = (await req.json().catch(() => null)) as Body | null;
  const email = normEmail(body?.email);

  switch (body?.action) {
    case "signup": {
      if (!EMAIL.test(email)) return fail("이메일 주소를 확인해 주세요.");
      if (!passwordOk(body.password)) return fail("비밀번호는 영문과 숫자를 섞어 8자 이상으로 해 주세요.");
      if (await db.findUser("email", email)) return fail("이미 가입된 이메일이에요. 로그인해 주세요.", 409);
      const nickname = (typeof body.nickname === "string" ? body.nickname.trim() : "").slice(0, 12) || email.split("@")[0].slice(0, 12);
      const user = await db.createUser({ provider: "email", providerId: email, nickname, email, passwordHash: await hashPassword(body.password) }).catch(() => null);
      if (!user) return fail("가입하지 못했어요. 잠시 후 다시 해 주세요.", 500);
      await giftNewUser(db, user, req.cookies.get(REF_COOKIE)?.value);
      const res = NextResponse.json({ ok: true, created: true });
      setSession(res, user.id);
      return res;
    }
    case "login": {
      const key = `${email}|${req.headers.get("x-forwarded-for")?.split(",")[0] ?? ""}`;
      if (blocked(key)) return fail("비밀번호를 여러 번 틀렸어요. 10분 뒤에 다시 해 주세요.", 429);
      const user = EMAIL.test(email) ? await db.findUser("email", email) : null;
      if (!user || !(await verifyPassword(String(body.password ?? ""), user.password_hash))) {
        missed(key);
        return fail("이메일 또는 비밀번호가 맞지 않아요.", 401);
      }
      tries.delete(key);
      const res = NextResponse.json({ ok: true });
      setSession(res, user.id);
      return res;
    }
    case "reset-request": {
      if (!mailConfigured()) return fail("지금은 재설정 메일을 보낼 수 없어요. 고객문의로 가입한 이메일을 알려 주시면 도와드릴게요.", 503);
      if (!EMAIL.test(email)) return fail("이메일 주소를 확인해 주세요.");
      const user = await db.findUser("email", email);
      if (user) {
        const token = seal({ uid: user.id, purpose: "reset", pw: pwPrint(user.password_hash), exp: Date.now() + 30 * 60e3 });
        const link = new URL(`/?reset=${token}`, req.url).toString();
        await sendMail(
          email,
          "[냥신 점괘] 비밀번호 재설정 링크",
          `냥신 점괘 비밀번호 재설정 링크예요. 30분 동안, 한 번만 쓸 수 있어요.\n\n${link}\n\n직접 요청하지 않았다면 이 메일은 무시해 주세요.`,
        ).catch((e) => console.error("reset mail failed", e));
      }
      return NextResponse.json({ ok: true });
    }
    case "reset": {
      const t = unseal<{ uid: string; purpose: string; pw: string }>(body.token);
      if (!t || t.purpose !== "reset") return fail("링크가 만료됐어요. 재설정 메일을 다시 받아 주세요.");
      if (!passwordOk(body.password)) return fail("비밀번호는 영문과 숫자를 섞어 8자 이상으로 해 주세요.");
      const user = await db.getUser(t.uid);
      if (!user || user.provider !== "email" || pwPrint(user.password_hash) !== t.pw) return fail("이미 쓴 링크예요. 재설정 메일을 다시 받아 주세요.");
      await db.setPassword(user.id, await hashPassword(body.password));
      const res = NextResponse.json({ ok: true });
      setSession(res, user.id);
      return res;
    }
    default:
      return fail("요청이 올바르지 않아요.");
  }
}
