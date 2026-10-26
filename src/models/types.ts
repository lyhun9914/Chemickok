// ───────────── Questionnaire input ─────────────

export type Gender = "female" | "male" | "other";

/** solo = 나 혼자 보기, couple = 마음에 둔 사람과 궁합 보기 */
export type Mode = "solo" | "couple";

export type RelationshipStatus = "crush" | "dating" | "slump" | "breakup";

export type CoupleConcernId = "contact" | "uncertainty" | "conflict" | "boredom" | "future" | "reunion";
export type SoloConcernId = "when" | "who" | "fizzle" | "pattern" | "ex" | "lazy";
export type ConcernId = CoupleConcernId | SoloConcernId;

export interface PersonInput {
  name: string;
  gender: Gender;
  birthdate: string; // YYYY-MM-DD ("" = unknown, allowed for partner)
  birthtime?: string; // HH:mm (optional)
  mbti?: string; // e.g. "INFP" ("" = unknown)
}

export interface QuestionnaireInput {
  mode: Mode;
  me: PersonInput;
  /** couple mode only */
  partner: PersonInput;
  /** couple mode only */
  status: RelationshipStatus;
  /** self-question id → Likert 1..5 */
  self: Record<string, number>;
  /** partner-observation question id → Likert 1..5 (couple mode only) */
  partnerObs: Record<string, number>;
}

// ───────────── Analysis model ─────────────

export type AxisKey = "drive" | "express" | "conflict" | "attach";
/** First pole of each axis: G(직진) E(표현) F(직면) A(확인) — second: W H R S */
export type Pole = "G" | "W" | "E" | "H" | "F" | "R" | "A" | "S";
export type Intensity = "strong" | "clear" | "mild";

export interface AxisResult {
  key: AxisKey;
  title: string;
  leftLabel: string;
  rightLabel: string;
  leftPct: number; // 0..100, share of the first pole
  pole: Pole;
  intensity: Intensity;
}

export interface TypeInfo {
  code: string; // e.g. "GEFA"
  name: string;
  emoji: string;
  tagline: string;
}

export type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

export interface Pillar {
  label: "년주" | "월주" | "일주" | "시주";
  hanja: string; // 丙午
  hangul: string; // 병오
}

export interface SajuSummary {
  pillars: Pillar[];
  dayMaster: { hanja: string; hangul: string; image: string; element: ElementKey };
  elements: Record<ElementKey, number>;
  lacking: ElementKey;
  animal: string; // 띠, e.g. "토끼"
}

export interface PersonalReading {
  dayMasterReading: string | null;
  /** 오행 기질: dominant / lacking element in love */
  elementReading: string | null;
  /** 이름 기운 (한글 수리오행) — null for nicknames / non-Hangul names */
  nameReading: string | null;
  /** 남들은 모르는 두 얼굴: outer vs inner */
  twoFaces: { outer: string; inner: string };
  signature: string;
  /** all 4 axes, most decisive first */
  traits: { title: string; label: string; pct: number; text: string }[];
  quote: { question: string; answer: string; reading: string } | null;
  scenes: string[];
}

export type MbtiLevel = "천생연분" | "좋음" | "무난" | "노력 필요";

export interface MbtiPair {
  pair: string; // "INFP × ENFJ"
  level: MbtiLevel;
  line: string;
}

/** Free "who suits me" card (both modes). */
export interface MatchTeaser {
  bestType: TypeInfo;
  myMbti: string | null;
  myMbtiLine: string | null;
  bestMbti: string[];
  goodAnimals: string[]; // 찰떡 띠
}

export interface LockedPreview {
  id: string;
  icon: string;
  title: string;
}

export interface CoupleTeaser {
  partnerType: TypeInfo;
  partnerDayMaster: string | null;
  matchScore: number;
  coupleTitle: string;
  teaserSummary: string;
  overallHeadline: string;
  mbti: MbtiPair | null;
}

export interface SoloTeaser {
  loveLuck: number; // 이번 달 연애운 %
  loveLuckHeadline: string;
}

export interface TeaserReport {
  mode: Mode;
  myType: TypeInfo;
  axes: AxisResult[];
  reliability: number; // 0..100
  saju: SajuSummary | null;
  personal: PersonalReading;
  match: MatchTeaser;
  couple: CoupleTeaser | null;
  solo: SoloTeaser | null;
  /** Paid sections, in display order; the first one is the share-to-unlock section. */
  locked: LockedPreview[];
}

export interface ReportSection {
  title: string;
  headline: string;
  body: string;
  bullets: string[];
}

export interface LuckSection {
  title: string;
  headline: string;
  body: string;
  luckyColor: string;
  luckyPlace: string;
  luckyItem: string;
  luckyDays: string[];
  actionItems: string[];
}

export interface FullReport {
  subScores: { label: string; score: number }[];
  sections: { id: string; icon: string; section: ReportSection }[];
  luck: LuckSection | null;
}

/** "share" unlocks only the first locked section; "full" unlocks everything. */
export type UnlockLevel = "share" | "full";

export interface AnalyzeResponse {
  teaser: TeaserReport;
  inputHash: string;
}

export interface UnlockResponse {
  level: UnlockLevel;
  report: FullReport;
}

export type PaymentMethod = "toss" | "kakaopay";
