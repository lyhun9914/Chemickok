import { PARTNER_INTERVIEW, selfInterview } from "@/lib/interview";
import type { PersonInput, QuestionnaireInput, StoryCard } from "@/models/types";

/**
 * Carry a finished interview to another browser (PC → phone via QR, KakaoTalk in-app → the phone's real
 * browser) so the result can be re-read there and shared. The answers ride in the URL (?r=…); nothing is stored.
 */
const toB64Url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));

// Compact form for short URLs / scannable QR codes: answers in interview order, people as small tuples.
type P = [string, string, string, string, string];
type Packed = [string, string, P, P, string[], string[]];
const GENDER: Record<string, PersonInput["gender"]> = { f: "female", m: "male", o: "other" };
const packP = (p: PersonInput): P => [p.name, p.gender[0], p.birthdate.replace(/-/g, ""), (p.birthtime ?? "").replace(":", ""), p.mbti ?? ""];
const unpackP = ([name, g, b, t, mbti]: P): PersonInput => ({
  name,
  gender: GENDER[g] ?? "female",
  birthdate: b ? `${b.slice(0, 4)}-${b.slice(4, 6)}-${b.slice(6, 8)}` : "",
  birthtime: t ? `${t.slice(0, 2)}:${t.slice(2, 4)}` : "",
  mbti,
});

// Card-only form: for readings reopened from 내 점괘함, which keep the result but not the answers.
type C = [string, string, [string, string, string, string], string, [string, string] | null, [string, string], string[], string[], [number, string] | null];
const packC = (c: StoryCard, me: string, partner: string): C => [
  me,
  partner,
  [c.myType.code, c.myType.name, c.myType.emoji, c.myType.tagline],
  c.match.myMbti ?? "",
  c.saju ? [c.saju.dayMaster.hangul, c.saju.dayMaster.hanja] : null,
  [c.match.bestType.name, c.match.bestType.emoji],
  c.match.bestMbti,
  c.match.goodAnimals,
  c.couple ? [c.couple.matchScore, c.couple.coupleTitle] : null,
];
const unpackC = ([me, partner, [code, name, emoji, tagline], mbti, dm, [bn, be], bestMbti, animals, couple]: C): StoryShare => ({
  me,
  partner,
  card: {
    myType: { code, name, emoji, tagline },
    match: { myMbti: mbti || null, bestType: { name: bn, emoji: be }, bestMbti, goodAnimals: animals },
    saju: dm ? { dayMaster: { hangul: dm[0], hanja: dm[1] } } : null,
    couple: couple ? { matchScore: couple[0], coupleTitle: couple[1] } : null,
  },
});

export interface StoryShare {
  card: StoryCard;
  me: string;
  partner: string;
  /** arrived to post on Instagram: open straight onto the tap-to-share screen */
  insta?: boolean;
}

/** True when the store holds a full interview (a fresh result), not just a reopened reading. */
function complete(input: QuestionnaireInput): boolean {
  if (!input.me.name || !input.me.birthdate) return false;
  if (!selfInterview(input.mode).every((q) => input.self[q.id])) return false;
  return input.mode === "solo" || (Boolean(input.partner.name) && PARTNER_INTERVIEW.every((q) => input.partnerObs[q.id]));
}

/**
 * A link that reopens this result elsewhere. For Instagram (and whenever the answers aren't at hand, e.g. a
 * reading reopened from 내 점괘함) it carries just the card (?c=) and opens the share screen directly, so the
 * person isn't walked through the whole reading again; otherwise the full interview (?r=).
 */
export function handoffUrl(input: QuestionnaireInput, share: StoryShare, then?: "insta"): string {
  const u = new URL("/", window.location.origin);
  if (then !== "insta" && complete(input)) {
    const self = selfInterview(input.mode).map((q) => input.self[q.id] ?? "");
    const obs = input.mode === "couple" ? PARTNER_INTERVIEW.map((q) => input.partnerObs[q.id] ?? "") : [];
    const packed: Packed = [input.mode[0], input.status, packP(input.me), packP(input.partner), self, obs];
    u.searchParams.set("r", toB64Url(JSON.stringify(packed)));
  } else {
    u.searchParams.set("c", toB64Url(JSON.stringify(packC(share.card, share.me, share.partner))));
  }
  if (then) u.searchParams.set("then", then);
  return u.toString();
}

export type Handoff = { kind: "input"; input: QuestionnaireInput; then: string | null } | { kind: "card"; share: StoryShare; then: string | null };

export function readHandoff(search: string): Handoff | null {
  const q = new URLSearchParams(search);
  const then = q.get("then");
  try {
    const c = q.get("c");
    if (c) return { kind: "card", share: unpackC(JSON.parse(fromB64Url(c)) as C), then };
    const r = q.get("r");
    if (!r) return null;
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
    return { kind: "input", input, then };
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
