import "server-only";
import { MBTI_TYPES } from "@/lib/questions";
import type { MbtiLevel, MbtiPair } from "@/models/types";

export function normalizeMbti(v: unknown): string {
  const s = typeof v === "string" ? v.toUpperCase().trim() : "";
  return (MBTI_TYPES as readonly string[]).includes(s) ? s : "";
}

/** 연애할 때의 MBTI 한 줄 */
export const MBTI_LOVE: Record<string, string> = {
  ISTJ: "약속과 신뢰가 곧 사랑인 사람. 기념일은 절대 안 잊지만 표현은 담백해요.",
  ISFJ: "티 안 나게 챙겨 주는 헌신형. 서운해도 참다가 혼자 지쳐요.",
  INFJ: "한 사람을 깊이 이해하고 싶은 영혼의 동반자형. 실망하면 조용히 문을 닫아요.",
  INTJ: "연애에도 계획이 있는 전략가. 겉은 차가워도 내 사람에겐 의외의 순정파예요.",
  ISTP: "말보다 행동, 간섭은 싫은 자유인. 위기 땐 누구보다 든든해요.",
  ISFP: "다정하고 감성적인 힐러. 갈등이 싫어서 서운함을 쉽게 말 못 해요.",
  INFP: "사랑에 진심인 낭만주의자. 머릿속 연애 시뮬레이션만 백 번은 돌려요.",
  INTP: "관심 있는 사람에겐 질문이 많아지는 탐구형. 감정 표현은 번역이 필요해요.",
  ESTP: "밀당보다 직진, 재미가 최우선인 모험가. 지루함을 제일 못 참아요.",
  ESFP: "함께 있으면 매일이 이벤트인 분위기 메이커. 관심이 곧 사랑이에요.",
  ENFP: "사랑에 빠지면 온 세상이 그 사람인 열정파. 식을까 봐 불안해하기도 해요.",
  ENTP: "티키타카가 통해야 반하는 토론형. 지루해지면 장난으로 상대를 시험해요.",
  ESTJ: "책임감 있는 리더형 연인. 계획대로 안 되면 답답해해요.",
  ESFJ: "상대 기분을 제일 먼저 챙기는 다정한 매니저. 반응이 없으면 서운해요.",
  ENFJ: "상대를 성장시키고 싶은 헌신형 리더. 내 노력만큼 돌아오길 바라요.",
  ENTJ: "연애도 목표 지향적인 추진력 갑. 약한 모습을 보여주는 데 서툴러요.",
};

/** 흔히 쓰이는 MBTI 궁합표의 '천생연분' 조합 */
const BEST: Record<string, string[]> = {
  INFP: ["ENFJ", "ENTJ"],
  ENFP: ["INFJ", "INTJ"],
  INFJ: ["ENFP", "ENTP"],
  ENFJ: ["INFP", "ISFP"],
  INTJ: ["ENFP", "ENTP"],
  ENTJ: ["INFP", "INTP"],
  INTP: ["ENTJ", "ESTJ"],
  ENTP: ["INFJ", "INTJ"],
  ISFP: ["ENFJ", "ESFJ", "ESTJ"],
  ESFP: ["ISFJ", "ISTJ"],
  ISTP: ["ESFJ", "ESTJ"],
  ESTP: ["ISFJ", "ISTJ"],
  ISFJ: ["ESFP", "ESTP"],
  ESFJ: ["ISFP", "ISTP"],
  ISTJ: ["ESFP", "ESTP"],
  ESTJ: ["INTP", "ISFP", "ISTP"],
};

const LEVEL_LINE: Record<MbtiLevel, string> = {
  천생연분: "서로의 빈칸을 정확히 채워 주는 조합이에요. 처음 만났을 때부터 이상하게 편했을 거예요.",
  좋음: "세상을 보는 방식이 비슷해서 말이 잘 통하고, 같이 있으면 편한 조합이에요.",
  무난: "다른 점이 오히려 매력이 되는 조합이에요. 맞춰 가는 재미가 있어요.",
  "노력 필요": "세상을 보는 방식이 달라서 서로의 말을 '번역'해야 하는 조합이에요. 대신 서로에게 없는 걸 배워요.",
};

const isNF = (m: string) => m[1] === "N" && m[2] === "F";

export function mbtiLevel(a: string, b: string): MbtiLevel {
  if (BEST[a]?.includes(b) || BEST[b]?.includes(a)) return "천생연분";
  if ((isNF(a) && b[1] === "S") || (isNF(b) && a[1] === "S")) return "노력 필요";
  return a[1] === b[1] ? "좋음" : "무난";
}

export function mbtiPair(a: string, b: string): MbtiPair | null {
  if (!a || !b) return null;
  const level = mbtiLevel(a, b);
  return { pair: `${a} × ${b}`, level, line: LEVEL_LINE[level] };
}

export function bestMbti(m: string): string[] {
  return m ? (BEST[m] ?? []) : [];
}

export function hardMbti(m: string): string[] {
  if (!m) return [];
  return (MBTI_TYPES as readonly string[]).filter((o) => mbtiLevel(m, o) === "노력 필요").slice(0, 3);
}

/** First clause of the love line, for quoting inside a sentence: "상대를 성장시키고 싶은 헌신형 리더" */
export function mbtiShort(m: string): string {
  return (MBTI_LOVE[m] ?? "").split(". ")[0].replace(/\.$/, "");
}
