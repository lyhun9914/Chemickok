import "server-only";

// Kakao / Naver / Google OAuth 2.0 authorization-code flow. Only the provider's user id and a nickname are kept.
export type ProviderId = "kakao" | "naver" | "google";

export interface OAuthProfile {
  providerId: string;
  nickname: string;
  email: string | null;
}

interface Provider {
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
  /** Kakao's client secret is optional (only when enabled in the console). */
  secretOptional?: boolean;
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope?: string;
  parse: (json: Record<string, unknown>) => OAuthProfile;
}

const PROVIDERS: Record<ProviderId, Provider> = {
  kakao: {
    clientId: () => process.env.KAKAO_REST_API_KEY,
    clientSecret: () => process.env.KAKAO_CLIENT_SECRET,
    secretOptional: true,
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    profileUrl: "https://kapi.kakao.com/v2/user/me",
    parse: (j) => {
      const acc = (j.kakao_account ?? {}) as { profile?: { nickname?: string }; email?: string };
      const props = (j.properties ?? {}) as { nickname?: string };
      return { providerId: String(j.id), nickname: acc.profile?.nickname ?? props.nickname ?? "", email: acc.email ?? null };
    },
  },
  naver: {
    clientId: () => process.env.NAVER_CLIENT_ID,
    clientSecret: () => process.env.NAVER_CLIENT_SECRET,
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    profileUrl: "https://openapi.naver.com/v1/nid/me",
    parse: (j) => {
      const r = (j.response ?? {}) as { id?: string; nickname?: string; name?: string; email?: string };
      return { providerId: String(r.id), nickname: r.nickname ?? r.name ?? "", email: r.email ?? null };
    },
  },
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid profile email",
    parse: (j) => ({ providerId: String(j.sub), nickname: String(j.name ?? ""), email: (j.email as string) ?? null }),
  },
};

export function isProvider(p: string): p is ProviderId {
  return p in PROVIDERS;
}

export function enabledProviders(): ProviderId[] {
  return (Object.keys(PROVIDERS) as ProviderId[]).filter((id) => {
    const p = PROVIDERS[id];
    return Boolean(p.clientId()) && (p.secretOptional || Boolean(p.clientSecret()));
  });
}

export function authorizeUrl(id: ProviderId, state: string, redirectUri: string): string {
  const p = PROVIDERS[id];
  const q = new URLSearchParams({ response_type: "code", client_id: p.clientId()!, redirect_uri: redirectUri, state });
  if (p.scope) q.set("scope", p.scope);
  return `${p.authorizeUrl}?${q}`;
}

export async function fetchProfile(id: ProviderId, code: string, state: string, redirectUri: string): Promise<OAuthProfile> {
  const p = PROVIDERS[id];
  const body = new URLSearchParams({ grant_type: "authorization_code", client_id: p.clientId()!, redirect_uri: redirectUri, code, state });
  const secret = p.clientSecret();
  if (secret) body.set("client_secret", secret);
  const tokenRes = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    cache: "no-store",
  });
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string; error_code?: string };
  if (!tokenRes.ok || !token.access_token) throw new Error(`token: ${token.error_code ?? token.error ?? tokenRes.status}`);
  const profileRes = await fetch(p.profileUrl, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
  if (!profileRes.ok) throw new Error(`profile: ${profileRes.status}`);
  const profile = p.parse((await profileRes.json()) as Record<string, unknown>);
  if (!profile.providerId || profile.providerId === "undefined") throw new Error("profile: no id");
  return profile;
}
