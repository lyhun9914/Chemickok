import { isMobile } from "@/services/shareService";

/**
 * 이용 흐름 and 화면 오류, from the browser: fire-and-forget beacons to /api/track and /api/log. Only random ids, the
 * product and how far an interview got; never names, birthdays or answers (links that carry those, ?c= · ?r=, are
 * reduced to where they came from).
 */

const VISIT = "nyang-visit";

const beacon = (url: string, body: unknown) => {
  try {
    const data = JSON.stringify(body);
    // plain text: a beacon with a JSON type isn't allowed everywhere
    if (navigator.sendBeacon?.(url, data)) return;
    fetch(url, { method: "POST", body: data, keepalive: true }).catch(() => {});
  } catch {
    /* never let tracking break the page */
  }
};

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

function visitId(): string | null {
  try {
    return sessionStorage.getItem(VISIT);
  } catch {
    return null;
  }
}

const REFERRERS: [RegExp, string][] = [
  [/instagram\./, "인스타그램"],
  [/kakao|daum\.net/, "카카오·다음"],
  [/naver\./, "네이버"],
  [/google\./, "구글"],
  [/youtube\.|youtu\.be/, "유튜브"],
  [/tiktok\./, "틱톡"],
  [/facebook\.|fb\./, "페이스북"],
  [/(^|\.)x\.com|twitter\./, "X(트위터)"],
  [/threads\./, "스레드"],
];

/** Where a visit came from: the link's own marks first, then the page it came from, then the app it opened in. */
function sourceOf(search: string): string {
  const q = new URLSearchParams(search);
  const utm = q.get("utm_source");
  if (utm) return utm.slice(0, 40);
  if (q.get("then") === "friend") return q.get("play") ? "카톡 결과 카드 (게임)" : "카톡 점괘 카드";
  if (q.get("then") === "insta") return "인스타 QR 이어 보기";
  if (q.get("c") || q.get("r")) return "공유 링크";
  if (q.get("pair")) return "맞궁합 초대장";
  if (q.get("present")) return "냥 선물 링크";
  if (q.get("ref")) return "친구 초대 링크";
  if (q.get("game")) return "게임 링크";
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    if (ref && ref.host === location.host) return /^\/(ilju|tti)/.test(ref.pathname) ? "일주·띠 페이지" : "사이트 안";
    if (ref) return REFERRERS.find(([re]) => re.test(ref.host))?.[1] ?? ref.host.replace(/^www\./, "");
  } catch {
    /* odd referrer */
  }
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "카카오톡";
  if (/Instagram/i.test(ua)) return "인스타그램";
  if (/NAVER/i.test(ua)) return "네이버";
  return "직접 방문";
}

function deviceOf(): string {
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao-app";
  if (/Instagram|FBAN|FBAV|NAVER|Line\/|DaumApps|everytimeApp|; wv\)/i.test(ua)) return "in-app";
  return isMobile() ? "mobile" : "pc";
}

/** The first page of a browser session counts as one visit. */
export function trackVisit(search: string) {
  if (typeof window === "undefined" || visitId()) return;
  const id = newId();
  try {
    sessionStorage.setItem(VISIT, id);
  } catch {
    return; // without storage every reload would count again
  }
  beacon("/api/track", { t: "visit", id, source: sourceOf(search), device: deviceOf() });
}

export type Step = "start" | "q" | "result" | "paysheet" | "paid" | "game";

/** One step of an interview (or a mini game opened). */
export function track(t: Step, run: string | null | undefined, extra: { product?: string; status?: string; n?: number; total?: number } = {}) {
  if (!run || typeof window === "undefined") return;
  beacon("/api/track", { t, run, visit: visitId(), ...extra });
}

// ───────────── 화면 오류 ─────────────

const reported = new Set<string>();

/** An error to the 관리자 오류 기록: each message once per page load, ten at most (a loop can't flood it). */
export function reportClientError(source: "client" | "api", message: string, detail?: string) {
  if (typeof window === "undefined" || !message) return;
  const key = `${source}:${message}`.slice(0, 200);
  if (reported.has(key) || reported.size >= 10) return;
  reported.add(key);
  const screen = (window as { __nyangScreen?: string }).__nyangScreen;
  beacon("/api/log", { source, message: message.slice(0, 500), detail: detail?.slice(0, 2000), path: `${location.pathname}${screen ? ` · ${screen}` : ""}` });
}
