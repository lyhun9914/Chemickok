import type { CoupleConcernId, Gender, Mode, RelationshipStatus, SoloConcernId } from "@/models/types";

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

export const MODE_OPTIONS: { id: Mode; emoji: string; label: string; desc: string }[] = [
  { id: "solo", emoji: "🙋", label: "나 혼자 보기", desc: "솔로 · 나의 연애 유형과 찰떡 궁합" },
  { id: "couple", emoji: "💞", label: "그 사람과 궁합 보기", desc: "연애 중 · 썸 · 짝사랑 · 권태기 · 이별 후" },
];

export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export const SOLO_CONCERNS: { id: SoloConcernId; label: string; emoji: string }[] = [
  { id: "when", emoji: "⏳", label: "나 연애 언제 할 수 있을까?" },
  { id: "who", emoji: "🎯", label: "나랑 맞는 사람이 누군지 모르겠어요" },
  { id: "fizzle", emoji: "🫧", label: "썸만 타다 흐지부지 끝나요" },
  { id: "pattern", emoji: "🔁", label: "매번 비슷한 사람에게 상처받아요" },
  { id: "ex", emoji: "🌧️", label: "전 연인을 아직 못 잊었어요" },
  { id: "lazy", emoji: "🛋️", label: "연애는 귀찮은데 외롭긴 해요" },
];

export const COUPLE_CONCERNS: { id: CoupleConcernId; label: string; emoji: string }[] = [
  { id: "contact", emoji: "📱", label: "연락 문제 (빈도·답장 속도)" },
  { id: "uncertainty", emoji: "❓", label: "그 사람 마음을 모르겠어요" },
  { id: "conflict", emoji: "🔁", label: "같은 문제로 자꾸 싸워요" },
  { id: "boredom", emoji: "🫠", label: "설렘이 예전 같지 않아요" },
  { id: "future", emoji: "🧭", label: "미래가 불안해요 (결혼·거리 등)" },
  { id: "reunion", emoji: "🌧️", label: "다시 만나고 싶어요 / 잊고 싶어요" },
];
