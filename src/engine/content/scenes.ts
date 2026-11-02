import "server-only";

/**
 * The situation each interview question puts the person in. Answers are only read against each other when their
 * situations are comparable: "다툰 날 밤" next to "어릴 때 혼날 때" says something; "다툰 날 밤" next to
 * "{p}가 힘들다고 할 때" doesn't (one is about my hurt, the other about comforting someone).
 */
export type Scene =
  | "contact" // 답장 · 연락을 기다림
  | "trust" // 낯선 알림 · 전 연인 · 다른 이성
  | "conflict" // 다툼 · 혼남
  | "unsaid" // 못 한 말 · 무너지는 말
  | "care" // 상대가 힘들 때
  | "affection" // 호칭 · 보고 싶다 · SNS · 기념일
  | "past" // 지난 연애
  | "first" // 첫인상 · 누가 좋아한다고 할 때
  | "alone" // 혼자 있는 시간
  | "symbol" // 꿈 · 자리 · 날씨 (상징)
  | "future"
  | "lead" // 데이트 · 고백 · 만남을 누가 이끄나
  | "together" // 둘이 있을 때의 공기
  | "unsure" // 마음이 헷갈릴 때
  | "slump" // 권태가 보이는 장면
  | "ending" // 이별의 순간 · 이유
  | "aftermath"; // 이별 직후 버티는 법

export const SCENE: Record<string, Scene> = {
  // 솔로
  s1: "symbol",
  s2: "alone",
  s3: "contact",
  n1: "first",
  s4: "symbol",
  n2: "contact",
  s7: "past",
  n3: "alone",
  s10: "alone",
  n4: "first",
  s12: "conflict",
  s13: "past",
  s14: "symbol",
  // 커플
  c1: "contact",
  c2: "contact",
  c3: "trust",
  c4: "conflict",
  c5: "affection",
  c6: "unsaid",
  c7: "trust",
  c9: "future",
  c10: "care",
  c11: "contact",
  c12: "unsaid",
  c13: "symbol",
  // 그 사람 (관찰)
  o1: "contact",
  o2: "affection",
  o3: "conflict",
  o4: "trust",
  o5: "lead",
  o6: "care",
  o7: "affection",
  o8: "trust",
  o9: "affection",
  o10: "affection",
  // 짝사랑·썸
  h1: "contact",
  h2: "contact",
  h3: "together",
  h9: "first",
  h4: "trust",
  h7: "together",
  h5: "lead",
  h11: "care",
  h6: "unsure",
  h8: "unsaid",
  h10: "future",
  // 권태기
  k1: "slump",
  k2: "slump",
  k3: "slump",
  k4: "future",
  k5: "affection",
  // 이별 후
  b1: "past",
  b2: "ending",
  b3: "ending",
  b6: "aftermath",
  b4: "contact",
  b5: "trust",
  b7: "past",
  b9: "unsaid",
  b8: "future",
  b11: "trust",
  b10: "future",
  b12: "symbol",
  // 썸 상대 · 헤어진 상대 (관찰)
  x2: "affection",
  x3: "conflict",
  x4: "contact",
  x5: "lead",
  x7: "affection",
  x9: "affection",
  x10: "affection",
  y1: "contact",
  y2: "conflict",
  y3: "ending",
  y4: "care",
  y5: "affection",
  y6: "trust",
  y7: "past",
  y8: "unsaid",
  y9: "conflict",
  y10: "ending",
};

/** Situations close enough that the same lean showing up in both means something. */
const RELATED: Scene[][] = [
  ["contact", "trust"],
  ["conflict", "unsaid"],
  ["ending", "aftermath"],
];

/** Symbols (a seat, a dream, a colour of mood) are read on their own: tying them to each other or to behaviour overreaches. */
export const sameScene = (a: string, b: string) => Boolean(SCENE[a]) && SCENE[a] !== "symbol" && SCENE[a] === SCENE[b];

export const relatedScene = (a: string, b: string) =>
  sameScene(a, b) || RELATED.some((g) => g.includes(SCENE[a]) && g.includes(SCENE[b]));
