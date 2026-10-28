import "server-only";
import { createHash } from "node:crypto";
import { FORTUNE_INTERVIEW } from "@/lib/fortuneQuestions";
import { UNKNOWN_ANSWER } from "@/lib/interview";
import type { FortuneMode, FortuneTeaser, FullReport, Gender, PersonInput, QuestionnaireInput } from "@/models/types";
import { normalizeMbti } from "../mbti";
import { buildChart } from "./chart";
import { daeunReading } from "./daeunReading";
import { reunionReading } from "./reunionReading";
import { sajuReading } from "./sajuReading";
import { spouseReading } from "./spouseReading";

const FORTUNE_MODES: FortuneMode[] = ["saju", "daeun", "reunion", "spouse"];
export const isFortuneMode = (m: unknown): m is FortuneMode => FORTUNE_MODES.includes(m as FortuneMode);

const GENDERS: Gender[] = ["female", "male", "other"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function person(p?: Partial<PersonInput>): PersonInput {
  const bd = p?.birthdate ?? "";
  const bt = p?.birthtime ?? "";
  return {
    name: (p?.name ?? "").trim().slice(0, 12),
    gender: GENDERS.includes(p?.gender as Gender) ? (p!.gender as Gender) : "other",
    birthdate: DATE.test(bd) ? bd : "",
    birthtime: TIME.test(bt) ? bt : "",
    mbti: normalizeMbti(p?.mbti),
  };
}

function normalizeFortune(i: QuestionnaireInput & { mode: FortuneMode }): QuestionnaireInput {
  const qs = FORTUNE_INTERVIEW[i.mode];
  return {
    mode: i.mode,
    me: person(i.me),
    partner: i.mode === "reunion" ? person(i.partner) : person(),
    status: "dating",
    self: Object.fromEntries(qs.map((q) => [q.id, i.self[q.id]])),
    partnerObs: {},
  };
}

/** Each answer must be one of the question's options, or "잘 모르겠어". The chart needs a real birthdate. */
export function validateFortune(raw: unknown): QuestionnaireInput | null {
  const i = raw as QuestionnaireInput;
  if (!isFortuneMode(i?.mode)) return null;
  if (!i.me?.name?.trim() || !DATE.test(i.me.birthdate ?? "")) return null;
  if (!i.self || typeof i.self !== "object") return null;
  for (const q of FORTUNE_INTERVIEW[i.mode]) {
    const a = i.self[q.id];
    if (a !== UNKNOWN_ANSWER && !q.options.some((o) => o.id === a)) return null;
  }
  if (i.mode === "reunion" && !i.partner?.name?.trim()) return null;
  const n = normalizeFortune(i as QuestionnaireInput & { mode: FortuneMode });
  return buildChart(n.me.birthdate, n.me.birthtime, n.me.gender) ? n : null;
}

export function fortuneHash(i: QuestionnaireInput): string {
  return createHash("sha256")
    .update(JSON.stringify(normalizeFortune(i as QuestionnaireInput & { mode: FortuneMode })))
    .digest("hex")
    .slice(0, 16);
}

function read(input: QuestionnaireInput): {
  teaser: FortuneTeaser;
  report: FullReport;
} {
  const c = buildChart(input.me.birthdate, input.me.birthtime, input.me.gender)!;
  switch (input.mode as FortuneMode) {
    case "saju":
      return sajuReading(input, c);
    case "daeun":
      return daeunReading(input, c);
    case "reunion":
      return reunionReading(input, c);
    case "spouse":
      return spouseReading(input, c);
  }
}

export const buildFortuneTeaser = (input: QuestionnaireInput) => read(input).teaser;

/** level "share" → only the first section; "full" → everything. */
export function buildFortuneReport(input: QuestionnaireInput, level: "share" | "full"): FullReport {
  const { report } = read(input);
  return level === "full" ? report : { ...report, subScores: [], sections: report.sections.slice(0, 1) };
}

export function fortuneTitle(input: QuestionnaireInput): string {
  const n = input.me.name;
  switch (input.mode as FortuneMode) {
    case "saju":
      return `${n}의 사주 감정서`;
    case "daeun":
      return `${n}의 대운 감정서`;
    case "reunion":
      return `${n} 🔁 ${input.partner.name} 재회 감정서`;
    case "spouse":
      return `${n}의 배우자 감정서`;
  }
}
