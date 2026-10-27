import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/services/server/db";
import { fetchProfile, isProvider } from "@/services/server/oauth";
import { STATE_COOKIE, setSession, unseal } from "@/services/server/session";

/** GET /api/auth/{provider}/callback?code&state — the provider sends the user back here. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  const { provider } = await ctx.params;
  const params = req.nextUrl.searchParams;
  const saved = unseal<{ state: string; provider: string; next: string }>(req.cookies.get(STATE_COOKIE)?.value);
  const next = saved?.next ? `&next=${saved.next}` : "";
  const finish = (q: string) => {
    const res = NextResponse.redirect(new URL(`/?${q}${next}`, req.url));
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  const db = getDb();
  const code = params.get("code");
  // User pressed "cancel" on the consent screen, or the state doesn't match (CSRF / expired).
  if (!db || !isProvider(provider) || !code || !saved || saved.provider !== provider || saved.state !== params.get("state")) {
    return finish(params.get("error") ? "login=cancel" : "login=fail");
  }
  try {
    const redirectUri = new URL(`/api/auth/${provider}/callback`, req.url).toString();
    const profile = await fetchProfile(provider, code, saved.state, redirectUri);
    const user = await db.upsertUser({ provider, ...profile });
    const res = finish(`login=ok&via=${provider}`);
    setSession(res, user.id);
    return res;
  } catch (e) {
    console.error("oauth callback failed", provider, e);
    return finish("login=fail");
  }
}
