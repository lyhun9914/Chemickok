import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, after, type NextRequest } from "next/server";
import { IS_TEST } from "@/lib/stage";
import { audit } from "./audit";
import { authConfigured, seal, unseal } from "./session";

// 관리자: one shared key (ADMIN_KEY, 16+ chars) opens /admin; a signed cookie keeps it open for 12 hours.
// The 테스트용 site holds no real data, so there a short key (4+) will do and the login lasts 30 days.
export const ADMIN_COOKIE = "nyang_admin";
const HOURS = IS_TEST ? 24 * 30 : 12;

const adminKey = () => process.env.ADMIN_KEY ?? "";
export const adminConfigured = () => adminKey().length >= (IS_TEST ? 4 : 16) && authConfigured();

/** Constant-time compare of the typed key with ADMIN_KEY. */
export function adminKeyMatches(given: string): boolean {
  if (!adminConfigured()) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given), h(adminKey()));
}

export function setAdmin(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, seal({ admin: true, exp: Date.now() + HOURS * 3600e3 }), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: HOURS * 3600,
  });
}

export function clearAdmin(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
}

export const isAdmin = (req: NextRequest) => adminConfigured() && Boolean(unseal<{ admin: boolean }>(req.cookies.get(ADMIN_COOKIE)?.value)?.admin);

/** `Authorization: Bearer <ADMIN_KEY>` on a GET: the read-only MCP server (mcp/nyangsin-admin). Changes stay cookie-only. */
const bearerKey = (req: NextRequest) => (req.method === "GET" ? req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] : undefined);

/**
 * 401 unless the request carries the admin cookie, or (GET only) the admin key as a Bearer header. A wrong key header
 * costs a second like a wrong login; every route does `if (denied) return denied`, so the delayed 401 is awaited there.
 */
export const adminOnly = (req: NextRequest) => {
  const key = bearerKey(req);
  if (key ? adminKeyMatches(key) : isAdmin(req)) return null;
  const res = NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 });
  if (!key) return res;
  // logged like a failed login, so repeated key guessing shows up in the audit log
  after(() => audit("관리자 키 헤더 실패", req.headers.get("x-forwarded-for")?.split(",")[0] ?? null, req.headers.get("user-agent")));
  return new Promise<NextResponse>((r) => setTimeout(() => r(res), 1000));
};
