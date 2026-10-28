import { PARTNER_INTERVIEW, selfInterview } from "@/lib/interview";
import type { PersonInput, QuestionnaireInput } from "@/models/types";

/**
 * Carry a finished interview to another browser (PC → phone via QR, KakaoTalk in-app → the phone's real
 * browser) so the result can be re-read there and shared. The answers ride in the URL (?r=…); nothing is stored.
 */
const toB64Url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

// Compact form for short URLs / scannable QR codes: answers in interview order, people as small tuples.
type P = [string, string, string, string, string];
type Packed = [string, string, P, P, string[], string[]];
const packP = (p: PersonInput): P => [p.name, p.gender[0], p.birthdate.replace(/-/g, ""), (p.birthtime ?? "").replace(":", ""), p.mbti ?? ""];
const unpackP = ([name, g, b, t, mbti]: P): PersonInput => ({
  name,
  gender: g === "m" ? "male" : "female",
  birthdate: b ? `${b.slice(0, 4)}-${b.slice(4, 6)}-${b.slice(6, 8)}` : "",
  birthtime: t ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : "",
  mbti,
});

export function handoffUrl(input: QuestionnaireInput, then?: "insta"): string {
  const self = selfInterview(input.mode).map((q) => input.self[q.id] ?? "");
  const obs = input.mode === "couple" ? PARTNER_INTERVIEW.map((q) => input.partnerObs[q.id] ?? "") : [];
  const packed: Packed = [input.mode[0], input.status, packP(input.me), packP(input.partner), self, obs];
  const u = new URL("/", window.location.origin);
  u.searchParams.set("r", toB64Url(JSON.stringify(packed)));
  if (then) u.searchParams.set("then", then);
  return u.toString();
}

export function readHandoff(search: string): { input: QuestionnaireInput; then: string | null } | null {
  const q = new URLSearchParams(search);
  const r = q.get("r");
  if (!r) return null;
  try {
    const [m, status, me, partner, self, obs] = JSON.parse(fromB64Url(r)) as Packed;
    const mode = m === "c" ? "couple" : "solo";
    const input: QuestionnaireInput = {
      mode,
      status: status as QuestionnaireInput["status"],
      me: unpackP(me),
      partner: unpackP(partner),
      self: Object.fromEntries(selfInterview(mode).map((qq, i) => [qq.id, self[i]]).filter(([, v]) => v)),
      partnerObs: Object.fromEntries(PARTNER_INTERVIEW.map((qq, i) => [qq.id, obs[i]]).filter(([, v]) => v)),
    };
    return { input, then: q.get("then") };
  } catch {
    return null;
  }
}

/** In-app browsers (KakaoTalk, Instagram, Facebook, Naver, Line, Android WebView) can't hand files to other apps. */
export function inAppBrowser(): "kakao" | "android" | "ios" | null {
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (!/Instagram|FBAN|FBAV|NAVER|Line\/|DaumApps|everytimeApp|; wv\)/i.test(ua)) return null;
  return /Android/i.test(ua) ? "android" : "ios";
}

/** Reopen `url` in the phone's real browser. Returns false when only the user can do it (iOS in-app). */
export function openExternally(url: string): boolean {
  const kind = inAppBrowser();
  if (kind === "kakao") {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    return true;
  }
  if (kind === "android") {
    const u = new URL(url);
    window.location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
    return true;
  }
  return false;
}
