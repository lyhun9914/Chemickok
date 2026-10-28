// ───────────── Questionnaire input ─────────────

export type Gender = "female" | "male" | "other";

/** solo = 나 혼자 보기, couple = 마음에 둔 사람과 궁합 보기 */
/** 연애 점괘 (the original interview + love engine) */
export type LoveMode = "solo" | "couple";
/** 사주·운세 점괘: their own short interview, chart-based readings */
export type FortuneMode = "newyear" | "saju" | "daeun" | "reunion" | "spouse";
export type Mode = LoveMode | FortuneMode;

export type RelationshipStatus = "crush" | "dating" | "slump" | "breakup";

export type CoupleConcernId = "contact" | "uncertainty" | "conflict" | "boredom" | "future" | "reunion";
export type SoloConcernId = "when" | "who" | "fizzle" | "pattern" | "ex" | "lazy";
export type ConcernId = CoupleConcernId | SoloConcernId;

export type BloodType = "A" | "B" | "O" | "AB";

export interface PersonInput {
  name: string;
  gender: Gender;
  birthdate: string; // YYYY-MM-DD ("" = unknown, allowed for partner)
  birthtime?: string; // HH:mm (optional)
  mbti?: string; // e.g. "INFP" ("" = unknown)
  blood?: BloodType | ""; // "" = unknown
}

export interface QuestionnaireInput {
  mode: Mode;
  me: PersonInput;
  /** couple mode only */
  partner: PersonInput;
  /** couple mode only */
  status: RelationshipStatus;
  /** interview question id → chosen option id */
  self: Record<string, string>;
  /** partner-observation question id → chosen option id (couple mode only) */
  partnerObs: Record<string, string>;
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
  /** 혈액형으로 본 연애 기질 — null when unknown */
  bloodReading?: string | null;
  /** 남들은 모르는 두 얼굴: outer vs inner */
  twoFaces: { outer: string; inner: string };
  signature: string;
  /** all 4 axes, most decisive first */
  traits: { title: string; label: string; pct: number; text: string; why?: string }[];
  /** the two most telling interview answers, decoded (the rest are in the paid report) */
  tells: Tell[];
  /** the color the user picked, read against their saju */
  colorReading: string | null;
  /** two answers read together (the strongest pair) */
  combo: string | null;
  /** hidden gauges (미련 / 질투 / 자기 의심); readings are paid */
  hidden: { key: string; icon: string; label: string; pct: number }[];
  scenes: string[];
}

export interface Tell {
  question: string;
  answer: string;
  /** why 냥신 asked this */
  why: string;
  read: string;
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
  /** the real opening of the paid section, cut off mid-sentence (the curiosity hook) */
  tease: string;
  /** how many analysis lines the section holds (true count) */
  count: number;
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

/** What the share card / story image need — a TeaserReport fits it, and it can travel alone in a handoff URL. */
export interface StoryCard {
  myType: TypeInfo;
  match: { myMbti: string | null; bestType: Pick<TypeInfo, "name" | "emoji">; bestMbti: string[]; goodAnimals: string[] };
  saju: { dayMaster: { hangul: string; hanja: string } } | null;
  couple: { matchScore: number; coupleTitle: string } | null;
}

/** The share card / story image for a 사주·대운·재회·배우자 reading. */
export interface FortuneStoryCard {
  kind: "fortune";
  /** "김지은의 사주 감정서" */
  label: string;
  emoji: string;
  /** the big line, e.g. "기토(己土)" / "재회 가능성 80%" */
  headline: string;
  sub: string;
  /** small line under it, e.g. the 원국 in 한자 */
  meta: string;
  /** the hanji slip at the bottom */
  slipLabel: string;
  slipValue?: string;
  slipText: string;
}

export type ShareableCard = StoryCard | FortuneStoryCard;
export const isFortuneCard = (c: ShareableCard): c is FortuneStoryCard => "kind" in c && c.kind === "fortune";

/** One card in a 사주·운세 reading. */
export type FortuneCard =
  | { kind: "chart" }
  | { kind: "basis"; rows: [string, string][]; note?: string }
  | { kind: "text"; icon: string; title: string; body: string }
  | { kind: "score"; label: string; score: number; headline: string; body?: string }
  | {
      kind: "timeline";
      title: string;
      items: { age: string; ganji: string; hanja: string; score: number; current: boolean; god: string }[];
      /** label under each bar after the number: "세" for 대운 (default), "월" for 12달 */
      unit?: string;
      icon?: string;
      /** line under the graph explaining the lit bar */
      note?: string;
    }
  | { kind: "keywords"; title: string; items: string[]; body?: string };

export interface FortuneBeat {
  say: string;
  mood: "talk" | "smug" | "wow" | "happy";
  card?: FortuneCard;
  /** label of the button that reveals the next beat */
  next: string;
}

/** Free part of a 사주·운세 reading; the paid part is a FullReport. */
export interface FortuneTeaser {
  mode: FortuneMode;
  /** "김지은의 사주 감정서" */
  title: string;
  saju: SajuSummary | null;
  beats: FortuneBeat[];
  /** 냥신's line right before the paywall */
  paywall: string;
  locked: LockedPreview[];
  /** share card; missing on readings saved before it existed */
  story?: FortuneStoryCard;
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

export interface FortuneAnalyzeResponse {
  teaser: FortuneTeaser;
  inputHash: string;
}

export interface UnlockResponse {
  level: UnlockLevel;
  report: FullReport;
  /** set when the reading was saved to the user's 내 점괘함 */
  readingId?: string;
}

export type PaymentMethod = "toss" | "kakaopay";
