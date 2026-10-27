import { NextResponse, type NextRequest } from "next/server";
import { devLoginEnabled, getDb } from "@/services/server/db";
import { authorizeUrl, enabledProviders, isProvider } from "@/services/server/oauth";
import { authConfigured, randomToken, setSession, setStateCookie } from "@/services/server/session";

/** GET /api/auth/{kakao|naver|google}/login?next=pay — starts the OAuth round-trip. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]/login">) {
  const { provider } = await ctx.params;
  const next = req.nextUrl.searchParams.get("next") === "pay" ? "pay" : "";
  const back = (q: string) => NextResponse.redirect(new URL(`/?${q}${next ? `&next=${next}` : ""}`, req.url));
  const db = getDb();
  if (!db || !authConfigured()) return back("login=off");

  // Local testing without real OAuth apps (AUTH_DEV_LOGIN=1, never on Vercel production).
  if (provider === "dev" && devLoginEnabled()) {
    const user = await db.upsertUser({ provider: "dev", providerId: "dev-user", nickname: "테스트냥", email: null });
    const res = back("login=ok");
    setSession(res, user.id);
    return res;
  }

  if (!isProvider(provider) || !enabledProviders().includes(provider)) return back("login=off");
  const state = randomToken();
  const redirectUri = new URL(`/api/auth/${provider}/callback`, req.url).toString();
  const res = NextResponse.redirect(authorizeUrl(provider, state, redirectUri));
  setStateCookie(res, { state, provider, next });
  return res;
}
