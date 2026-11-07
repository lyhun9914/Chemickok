import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { IS_TEST } from "@/lib/stage";
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

/** 401 unless the request carries the admin cookie. */
export const adminOnly = (req: NextRequest) => (isAdmin(req) ? null : NextResponse.json({ error: "관리자 로그인이 필요해요." }, { status: 401 }));
