import type { AxisKey, ConcernId, Gender, RelationshipStatus } from "@/models/types";

export const GENDER_LABEL: Record<Gender, string> = {
  female: "여성",
  male: "남성",
  other: "기타",
};

export const STATUS_OPTIONS: { id: RelationshipStatus; label: string; emoji: string; desc: string }[] = [
  { id: "crush", label: "짝사랑·썸", emoji: "🫣", desc: "아직 시작 전이에요" },
  { id: "dating", label: "연애 중", emoji: "💞", desc: "지금 만나고 있어요" },
  { id: "slump", label: "권태기", emoji: "🥱", desc: "익숙함과 지루함 사이" },
  { id: "breakup", label: "이별 후", emoji: "💔", desc: "끝났는데 안 끝난 느낌" },
];

export const CONCERNS: { id: ConcernId; label: string; emoji: string }[] = [
  { id: "contact", emoji: "📱", label: "연락 문제 (빈도·답장 속도)" },
  { id: "uncertainty", emoji: "❓", label: "그 사람 마음을 모르겠어요" },
  { id: "conflict", emoji: "🔁", label: "같은 문제로 자꾸 싸워요" },
  { id: "boredom", emoji: "🫠", label: "설렘이 예전 같지 않아요" },
  { id: "future", emoji: "🧭", label: "미래가 불안해요 (결혼·거리 등)" },
  { id: "reunion", emoji: "🌧️", label: "다시 만나고 싶어요 / 잊고 싶어요" },
];

export const LIKERT_LABELS = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"] as const;

export interface LikertQuestion {
  id: string;
  axis: AxisKey;
  /** true = agreeing points to the axis's SECOND pole (W/H/R/S) */
  reverse: boolean;
  text: string;
}

/** PART 1 — 나의 연애 성향 (애착 이론·갈등 대처 유형을 참고해 구성) */
export const SELF_QUESTIONS: LikertQuestion[] = [
  { id: "s1", axis: "drive", reverse: false, text: "마음에 드는 사람이 생기면 내가 먼저 연락하거나 약속을 잡는 편이다." },
  { id: "s2", axis: "express", reverse: true, text: "서운한 일이 있어도 티 내지 않고 혼자 삭이는 편이다." },
  { id: "s3", axis: "conflict", reverse: false, text: "싸움이 생기면 그날 안에 대화로 끝장을 봐야 마음이 편하다." },
  { id: "s4", axis: "attach", reverse: false, text: "답장이 평소보다 늦으면 '무슨 일 있나, 마음이 식었나' 신경 쓰인다." },
  { id: "s5", axis: "drive", reverse: true, text: "상대가 먼저 다가와 주기 전까지는 내 마음을 들키지 않으려 한다." },
  { id: "s6", axis: "express", reverse: false, text: "'보고 싶어', '좋아해' 같은 말을 자주, 자연스럽게 하는 편이다." },
  { id: "s7", axis: "conflict", reverse: true, text: "다툼이 커질 것 같으면 일단 자리를 피하거나 연락을 멈춘다." },
  { id: "s8", axis: "attach", reverse: true, text: "연인과 며칠 연락이 뜸해도 크게 불안하지 않다." },
  { id: "s9", axis: "drive", reverse: false, text: "관계의 다음 단계(고백, 기념일 계획 등)는 주로 내가 이끈다." },
  { id: "s10", axis: "express", reverse: false, text: "기분이 좋거나 나쁘면 상대가 바로 알아챌 만큼 얼굴에 드러난다." },
  { id: "s11", axis: "conflict", reverse: false, text: "상대가 잘못했다고 생각하면 돌려 말하지 않고 정확히 짚는다." },
  { id: "s12", axis: "attach", reverse: false, text: "상대가 나를 얼마나 좋아하는지 확인하고 싶어질 때가 많다." },
];

/** PART 2 — 그 사람 관찰 ({p} is replaced with the partner's name) */
export const PARTNER_QUESTIONS: LikertQuestion[] = [
  { id: "p1", axis: "drive", reverse: false, text: "{p}님은 먼저 연락하거나 만나자고 하는 쪽이다." },
  { id: "p2", axis: "express", reverse: false, text: "{p}님은 애정 표현을 말이나 행동으로 자주 한다." },
  { id: "p3", axis: "conflict", reverse: false, text: "{p}님은 갈등이 생기면 바로 이야기해서 풀려고 한다." },
  { id: "p4", axis: "attach", reverse: false, text: "{p}님은 내 일정이나 연락에 민감하게 반응한다." },
  { id: "p5", axis: "drive", reverse: true, text: "중요한 일은 대부분 내가 먼저 꺼내야 {p}님과 진행된다." },
  { id: "p6", axis: "express", reverse: true, text: "{p}님은 속마음을 물어봐도 '그냥', '괜찮아'로 넘어갈 때가 많다." },
  { id: "p7", axis: "conflict", reverse: true, text: "{p}님은 싸우고 나면 연락이 뜸해지거나 혼자 있고 싶어 한다." },
  { id: "p8", axis: "attach", reverse: true, text: "{p}님은 혼자만의 시간과 공간을 꽤 중요하게 여긴다." },
];

export function fillPartner(text: string, partnerName: string): string {
  return text.replaceAll("{p}", partnerName || "그 사람");
}
