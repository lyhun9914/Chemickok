import { NextResponse, type NextRequest } from "next/server";
import { SITE } from "@/lib/site";
import { devLoginEnabled, getDb } from "@/services/server/db";
import { REF_COOKIE, giftNewUser, giftQuery } from "@/services/server/gifts";
import { authorizeUrl, enabledProviders, isProvider } from "@/services/server/oauth";
import { authConfigured, randomToken, setSession, setStateCookie } from "@/services/server/session";

/**
 * GET /api/auth/{kakao|naver|google}/login?next=pay — starts the OAuth round-trip. `?again=1` asks 네이버 · 구글 to show
 * the 정보 제공 동의 screen again (for a review capture, or to give the email after declining it).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]/login">) {
  const { provider } = await ctx.params;
  const next = req.nextUrl.searchParams.get("next") === "pay" ? "pay" : "";
  const back = (q: string) => NextResponse.redirect(new URL(`/?${q}${next ? `&next=${next}` : ""}`, req.url));
  // Kakao · Naver · Google only send people back to the callback address registered for the site (else KOE006 and
  // the like). Started on another address of this project (a branch or single-deployment URL), the login goes
  // through the site's own address instead, and ends there.
  // (the Host the browser asked for: nextUrl's host can be the server's own name)
  const home = new URL(SITE);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (process.env.VERCEL && host && host !== home.host) {
    return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, home));
  }

  const db = getDb();
  if (!db || !authConfigured()) return back("login=off");

  // Local testing without real OAuth apps (AUTH_DEV_LOGIN=1, never on Vercel production).
  if (provider === "dev" && devLoginEnabled()) {
    // ?as=… makes a separate test account (for 친구 초대 tests)
    const providerId = `dev-${(req.nextUrl.searchParams.get("as") ?? "user").replace(/\W/g, "").slice(0, 20)}`;
    const existed = await db.findUser("dev", providerId);
    const user = await db.upsertUser({ provider: "dev", providerId, nickname: "테스트냥", email: null });
    const gifts = existed ? { welcome: 0, invited: 0 } : await giftNewUser(db, user, req.cookies.get(REF_COOKIE)?.value);
    const res = back(`login=ok${existed ? "" : "&new=1"}${giftQuery(gifts)}`);
    setSession(res, user.id);
    return res;
  }

  if (!isProvider(provider) || !enabledProviders().includes(provider)) return back("login=off");
  const state = randomToken();
  const redirectUri = new URL(`/api/auth/${provider}/callback`, req.url).toString();
  const res = NextResponse.redirect(authorizeUrl(provider, state, redirectUri, req.nextUrl.searchParams.get("again") === "1"));
  setStateCookie(res, { state, provider, next });
  return res;
}
