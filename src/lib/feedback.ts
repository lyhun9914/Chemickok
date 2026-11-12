/** 냥신 건의함 · 점괘 평가: what can be sent, the words for it, and the limits (shared by the app, the API and 관리자). */

export type SuggestKind = "idea" | "sad" | "bug" | "praise";
export type FeedbackKind = "rating" | SuggestKind;
export type Rating = "great" | "ok" | "meh";
export type FeedbackStatus = "new" | "seen" | "planned" | "done" | "closed";

export const SUGGEST_KINDS: { id: SuggestKind; emoji: string; label: string; placeholder: string }[] = [
  { id: "idea", emoji: "💡", label: "이런 거 생겼으면", placeholder: "예: 친구랑 같이 보는 운세가 있으면 좋겠어요" },
  { id: "sad", emoji: "😿", label: "아쉬웠던 점", placeholder: "예: 결과가 너무 길어서 끝까지 읽기 힘들었어요" },
  { id: "bug", emoji: "🐞", label: "오류가 났어요", placeholder: "예: 결과 화면에서 공유 버튼을 누르면 화면이 멈춰요" },
  { id: "praise", emoji: "💌", label: "칭찬", placeholder: "예: 대운 풀이가 소름 돋게 맞았어요" },
];
export const KIND_LABEL: Record<FeedbackKind, string> = {
  rating: "⭐ 점괘 평가",
  idea: "💡 이런 거 생겼으면",
  sad: "😿 아쉬웠던 점",
  bug: "🐞 오류",
  praise: "💌 칭찬",
};

export const RATINGS: { id: Rating; emoji: string; label: string; tags: string[] }[] = [
  { id: "great", emoji: "😻", label: "딱 내 얘기", tags: ["소름 돋게 맞아", "위로가 됐어", "설명이 쉬워", "친구한테 보여 주고 싶어"] },
  { id: "ok", emoji: "😺", label: "괜찮았어", tags: ["맞는 부분도 있어", "더 자세히 알고 싶어", "너무 길어", "조금 뻔해"] },
  { id: "meh", emoji: "😿", label: "좀 아쉬워", tags: ["잘 안 맞아", "뻔한 얘기", "너무 길어", "더 자세히 알고 싶어", "가격이 아쉬워"] },
];
export const RATING_LABEL: Record<Rating, string> = { great: "😻 딱 내 얘기", ok: "😺 괜찮았어", meh: "😿 좀 아쉬워" };
const ALL_TAGS = new Set(RATINGS.flatMap((r) => r.tags));

/** what the 관리자 sees / what the member sees for each 상태 */
export const STATUS: Record<FeedbackStatus, { admin: string; member: string }> = {
  new: { admin: "새 의견", member: "📬 접수됐다냥" },
  seen: { admin: "확인함", member: "👀 냥신이 읽었다냥" },
  planned: { admin: "반영 예정", member: "🛠️ 반영 준비 중이다냥" },
  done: { admin: "반영됨", member: "✅ 반영됐다냥" },
  closed: { admin: "보류", member: "💭 지금은 어렵지만 기억해 둘게냥" },
};
/** 상태 changes the member is told about (red dot on 내 점괘함) */
export const NOTIFY_STATUS: FeedbackStatus[] = ["planned", "done", "closed"];

export const SUGGEST_MIN = 5;
export const SUGGEST_MAX = 500;
export const COMMENT_MAX = 150;
export const TAGS_MAX = 3;
/** 건의 a member may send in one KST day */
export const SUGGEST_PER_DAY = 5;
/** 채택된 건의 one may be thanked for, in 냥 */
export const ADOPT_MAX = 10;

export interface FeedbackSettings {
  /** 채택 선물 (냥); 0 = no gift */
  adoptReward: number;
}
export const DEFAULT_FEEDBACK: FeedbackSettings = { adoptReward: 1 };

export function cleanFeedbackSettings(v: unknown): { ok: true; value: FeedbackSettings } | { ok: false; error: string } {
  const n = Number((v as Partial<FeedbackSettings> | null)?.adoptReward);
  if (!Number.isInteger(n) || n < 0 || n > ADOPT_MAX) return { ok: false, error: `채택 선물은 0~${ADOPT_MAX}냥 사이 정수로 넣어 주세요.` };
  return { ok: true, value: { adoptReward: n } };
}

export const cleanTags = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.map(String).filter((t) => ALL_TAGS.has(t)))].slice(0, TAGS_MAX) : [];

/** one line, control characters out */
export const cleanText = (v: unknown, max: number) =>
  String(v ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
