import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// A signed cookie holds only the user id; everything else is read from the DB.
export const SESSION_COOKIE = "nyang_session";
export const STATE_COOKIE = "nyang_oauth";
const SESSION_DAYS = 30;

const secret = () => process.env.AUTH_SECRET ?? "";
export const authConfigured = () => secret().length >= 16;

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function seal(payload: object): string {
  const data = b64(JSON.stringify(payload));
  return `${data}.${sign(data)}`;
}

export function unseal<T>(token: string | undefined): T | null {
  if (!token || !authConfigured()) return null;
  const [data, mac] = token.split(".");
  if (!data || !mac) return null;
  const expected = Buffer.from(sign(data));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as T & { exp?: number };
    return p.exp && p.exp < Date.now() ? null : p;
  } catch {
    return null;
  }
}

export const randomToken = () => randomBytes(16).toString("base64url");

const cookieBase = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };

export function setSession(res: NextResponse, userId: string) {
  res.cookies.set(SESSION_COOKIE, seal({ uid: userId, exp: Date.now() + SESSION_DAYS * 864e5 }), {
    ...cookieBase,
    maxAge: SESSION_DAYS * 86400,
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

export function setStateCookie(res: NextResponse, value: object) {
  res.cookies.set(STATE_COOKIE, seal({ ...value, exp: Date.now() + 10 * 60e3 }), { ...cookieBase, maxAge: 600 });
}

export function sessionUserId(req: NextRequest | Request): string | null {
  const raw = "cookies" in req && typeof (req as NextRequest).cookies?.get === "function"
    ? (req as NextRequest).cookies.get(SESSION_COOKIE)?.value
    : parseCookie(req.headers.get("cookie"), SESSION_COOKIE);
  return unseal<{ uid: string }>(raw)?.uid ?? null;
}

function parseCookie(header: string | null, name: string): string | undefined {
  return header
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
