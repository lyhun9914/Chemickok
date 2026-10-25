// ───────────── Questionnaire input ─────────────

export type Gender = "female" | "male" | "other";

export type RelationshipStatus = "crush" | "dating" | "slump" | "breakup";

export type ConcernId = "contact" | "uncertainty" | "conflict" | "boredom" | "future" | "reunion";

export interface PersonInput {
  name: string;
  gender: Gender;
  birthdate: string; // YYYY-MM-DD ("" = unknown, allowed for partner)
  birthtime?: string; // HH:mm (optional)
}

export interface QuestionnaireInput {
  me: PersonInput;
  partner: PersonInput;
  status: RelationshipStatus;
  concern: ConcernId;
  /** self-question id → Likert 1..5 */
  self: Record<string, number>;
  /** partner-observation question id → Likert 1..5 */
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
}

export interface PersonalReading {
  dayMasterReading: string | null;
  signature: string;
  traits: string[];
  quote: { question: string; answer: string; reading: string } | null;
  scenes: string[];
}

export interface TeaserReport {
  myType: TypeInfo;
  partnerType: TypeInfo;
  axes: AxisResult[];
  reliability: number; // 0..100
  saju: SajuSummary | null;
  partnerDayMaster: string | null; // e.g. "임수(壬水)"
  personal: PersonalReading;
  matchScore: number;
  coupleTitle: string;
  teaserSummary: string;
  overallHeadline: string;
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
  overall: ReportSection;
  hiddenMind: ReportSection;
  chemistry: ReportSection;
  crisis: ReportSection;
  luck: LuckSection;
}

/** "share" unlocks only the hidden-mind section; "full" unlocks everything. */
export type UnlockLevel = "share" | "full";

export interface AnalyzeResponse {
  teaser: TeaserReport;
  inputHash: string;
}

export interface UnlockResponse {
  level: UnlockLevel;
  report: Partial<FullReport>;
}

export type PaymentMethod = "toss" | "kakaopay";
