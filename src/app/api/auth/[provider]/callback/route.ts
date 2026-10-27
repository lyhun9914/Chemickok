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
  if (params.get("error")) return finish("login=cancel");
  if (!db || !isProvider(provider) || !code) return finish("login=fail&reason=setup");
  if (!saved || saved.provider !== provider || saved.state !== params.get("state")) return finish("login=fail&reason=state");
  try {
    const redirectUri = new URL(`/api/auth/${provider}/callback`, req.url).toString();
    const profile = await fetchProfile(provider, code, saved.state, redirectUri);
    const user = await db.upsertUser({ provider, ...profile });
    const res = finish(`login=ok&via=${provider}`);
    setSession(res, user.id);
    return res;
  } catch (e) {
    console.error("oauth callback failed", provider, e);
    // A short, non-secret cause (e.g. "token-KOE010", "db-401") so failures can be diagnosed from the screen.
    const m = /^(token|profile|db)\W+(\w+)/.exec(String((e as Error).message));
    return finish(`login=fail&reason=${m ? `${m[1]}-${m[2]}` : "unknown"}`);
  }
}
