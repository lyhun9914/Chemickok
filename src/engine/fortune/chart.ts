import "server-only";
import type { ElementKey, Gender } from "@/models/types";
import {
  BRANCHES_HANGUL,
  BRANCHES_HANJA,
  BRANCH_ELEMENT,
  CONTROLS,
  ELEMENT_LABEL,
  GENERATES,
  SAMHAP,
  SOLAR_TERMS,
  STEMS_HANGUL,
  STEMS_HANJA,
  STEM_ELEMENT,
  branchRelation,
  computeSaju,
  mod,
  parseDate,
  type SajuResult,
} from "../saju";

// The deeper chart the 사주 / 대운 / 배우자 / 재회 readings stand on: 십성, 신강·신약, 용신, 신살, 대운, 세운.
// Simplified where schools differ (용신 by strength only, 절입일 to the day) — consistent and explainable.

export type TenGod = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";
export type TenGroup = "비겁" | "식상" | "재성" | "관성" | "인성";
export const GROUP_OF: Record<TenGod, TenGroup> = {
  비견: "비겁",
  겁재: "비겁",
  식신: "식상",
  상관: "식상",
  편재: "재성",
  정재: "재성",
  편관: "관성",
  정관: "관성",
  편인: "인성",
  정인: "인성",
};

/** 지장간 정기: the stem each branch mainly carries. */
const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

const yang = (stem: number) => stem % 2 === 0;

export function tenGod(dayStem: number, stem: number): TenGod {
  const me = STEM_ELEMENT[dayStem];
  const el = STEM_ELEMENT[stem];
  const same = yang(dayStem) === yang(stem);
  if (el === me) return same ? "비견" : "겁재";
  if (GENERATES[me] === el) return same ? "식신" : "상관";
  if (CONTROLS[me] === el) return same ? "편재" : "정재";
  if (CONTROLS[el] === me) return same ? "편관" : "정관";
  return same ? "편인" : "정인";
}
export const branchTenGod = (dayStem: number, branch: number) => tenGod(dayStem, BRANCH_MAIN_STEM[branch]);

/** The element that plays a group for this day master (e.g. 재성 of 甲木 = 토). */
export function groupElement(dmEl: ElementKey, g: TenGroup): ElementKey {
  switch (g) {
    case "비겁":
      return dmEl;
    case "식상":
      return GENERATES[dmEl];
    case "재성":
      return CONTROLS[dmEl];
    case "관성":
      return (Object.keys(CONTROLS) as ElementKey[]).find((k) => CONTROLS[k] === dmEl)!;
    case "인성":
      return (Object.keys(GENERATES) as ElementKey[]).find((k) => GENERATES[k] === dmEl)!;
  }
}

export interface Sinsal {
  dohwa: boolean; // 도화: 끌림·인기
  yeokma: boolean; // 역마: 이동·변화
  hwagae: boolean; // 화개: 예술·종교·고독
  hongyeom: boolean; // 홍염: 숨은 매력
  gwiin: boolean; // 천을귀인: 도와주는 사람
}

const GROUP_STARS: {
  members: number[];
  dohwa: number;
  yeokma: number;
  hwagae: number;
}[] = [
  { members: [2, 6, 10], dohwa: 3, yeokma: 8, hwagae: 10 },
  { members: [8, 0, 4], dohwa: 9, yeokma: 2, hwagae: 4 },
  { members: [5, 9, 1], dohwa: 6, yeokma: 11, hwagae: 1 },
  { members: [11, 3, 7], dohwa: 0, yeokma: 5, hwagae: 7 },
];
const HONGYEOM = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];
const GWIIN: number[][] = [
  [1, 7],
  [0, 8],
  [11, 9],
  [11, 9],
  [1, 7],
  [0, 8],
  [1, 7],
  [2, 6],
  [5, 3],
  [5, 3],
];

export const groupStars = (branch: number) => GROUP_STARS.find((g) => g.members.includes(branch))!;
export const dohwaOf = (branch: number) => groupStars(branch).dohwa;
export const hongyeomOf = (dayStem: number) => HONGYEOM[dayStem];
export const gwiinOf = (dayStem: number) => GWIIN[dayStem];

export interface Daeun {
  /** 대운 starts at this (Korean) age; each lasts 10 years */
  age: number;
  stem: number;
  branch: number;
  ganji: string; // "갑자"
  hanja: string; // "甲子"
  god: TenGod; // 대운 천간의 십성
  branchGod: TenGod;
  score: number; // 20..95
}

export interface Chart {
  saju: SajuResult;
  gender: Gender;
  birthYear: number;
  stems: number[]; // year, month, day, (hour)
  branches: number[];
  dayStem: number;
  dayBranch: number;
  dm: ElementKey;
  /** weighted count per 십성 group, excluding the day stem itself */
  groups: Record<TenGroup, number>;
  gods: TenGod[];
  /** + = 신강, − = 신약 */
  strength: number;
  strong: boolean;
  yongsin: ElementKey;
  gisin: ElementKey;
  sinsal: Sinsal;
  forward: boolean;
  daeunSu: number;
  daeun: Daeun[];
  /** Korean age (세는 나이) this year */
  age: number;
  currentDaeun: number; // index into daeun, -1 before the first
}

const EL_KEYS: ElementKey[] = ["wood", "fire", "earth", "metal", "water"];

/** Year pillar of a calendar year (입춘 basis), as stem/branch. */
export function yearPillar(year: number): { stem: number; branch: number } {
  const i = mod(year - 4, 60);
  return { stem: i % 10, branch: i % 12 };
}

export const ganji = (stem: number, branch: number) => STEMS_HANGUL[stem] + BRANCHES_HANGUL[branch];
export const ganjiHanja = (stem: number, branch: number) => STEMS_HANJA[stem] + BRANCHES_HANJA[branch];

/** 60갑자 index from a stem/branch pair (same parity). */
const cycleIndex = (stem: number, branch: number) => [...Array(60).keys()].find((i) => i % 10 === stem && i % 12 === branch)!;

function kstNow(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate() };
}
export const thisYear = () => kstNow().y;

/** How much an element helps this chart: 용신 +2, what feeds 용신 +1, 기신 −2, what feeds 기신 −1. */
export function elementValue(c: Pick<Chart, "yongsin" | "gisin">, el: ElementKey): number {
  if (el === c.yongsin) return 2;
  if (el === c.gisin) return -2;
  if (GENERATES[el] === c.yongsin) return 1;
  if (GENERATES[el] === c.gisin) return -1;
  return 0;
}

/** Luck of a pillar (대운 / 세운 / 월운) for this chart, 20..95. */
export function pillarScore(c: Pick<Chart, "yongsin" | "gisin" | "dayBranch">, stem: number, branch: number): number {
  let v = elementValue(c, STEM_ELEMENT[stem]) * 1.2 + elementValue(c, BRANCH_ELEMENT[branch]);
  const rel = branchRelation(c.dayBranch, branch);
  if (rel === "harmony") v += 1;
  if (rel === "clash") v -= 1.5;
  return Math.round(Math.max(20, Math.min(95, 58 + v * 8)));
}

export function buildChart(birthdate: string, birthtime: string | undefined, gender: Gender): Chart | null {
  const saju = computeSaju(birthdate, birthtime);
  const p = parseDate(birthdate);
  if (!saju || !p) return null;
  const stems = saju.summary.pillars.map((pl) => STEMS_HANJA.indexOf(pl.hanja[0]));
  const branches = saju.summary.pillars.map((pl) => BRANCHES_HANJA.indexOf(pl.hanja[1]));
  const dayStem = stems[2];
  const dayBranch = branches[2];
  const dm = STEM_ELEMENT[dayStem];

  // 십성 with weights: 월지 is the season and counts most.
  const groups: Record<TenGroup, number> = {
    비겁: 0,
    식상: 0,
    재성: 0,
    관성: 0,
    인성: 0,
  };
  const gods: TenGod[] = [];
  stems.forEach((s, i) => {
    if (i === 2) return;
    const g = tenGod(dayStem, s);
    gods.push(g);
    groups[GROUP_OF[g]] += 1;
  });
  branches.forEach((b, i) => {
    const g = branchTenGod(dayStem, b);
    gods.push(g);
    groups[GROUP_OF[g]] += i === 1 ? 2.5 : i === 2 ? 1.5 : 1;
  });
  const strength = groups.비겁 + groups.인성 - (groups.식상 + groups.재성 + groups.관성);
  const strong = strength >= 0;

  // 용신: 신강 → the scarcest of 식상·재성·관성 (to spend the surplus); 신약 → the scarcer of 인성·비겁.
  const count = saju.summary.elements;
  const helpers: TenGroup[] = strong ? ["식상", "재성", "관성"] : ["인성", "비겁"];
  const opposers: TenGroup[] = strong ? ["인성", "비겁"] : ["관성", "재성", "식상"];
  const yongsin = helpers.map((g) => groupElement(dm, g)).reduce((a, b) => (count[b] < count[a] ? b : a));
  const gisin = opposers.map((g) => groupElement(dm, g)).reduce((a, b) => (count[b] > count[a] ? b : a));

  // 신살 from the year and day branches.
  const others = (exclude: number) => branches.filter((_, i) => i !== exclude);
  const starHit = (key: "dohwa" | "yeokma" | "hwagae") => others(0).includes(groupStars(branches[0])[key]) || others(2).includes(groupStars(dayBranch)[key]);
  const sinsal: Sinsal = {
    dohwa: starHit("dohwa"),
    yeokma: starHit("yeokma"),
    hwagae: starHit("hwagae"),
    hongyeom: branches.includes(hongyeomOf(dayStem)),
    gwiin: branches.some((b) => gwiinOf(dayStem).includes(b)),
  };

  // 대운: 양년 남 / 음년 여 → 순행, otherwise 역행. 대운수 = days to the next (or since the last) 절입 ÷ 3.
  const female = gender !== "male";
  const forward = yang(stems[0]) !== female;
  const birth = Date.UTC(p.y, p.m - 1, p.d);
  const terms: number[] = [];
  for (const yy of [p.y - 1, p.y, p.y + 1]) for (const [tm, td] of SOLAR_TERMS) terms.push(Date.UTC(yy, tm - 1, td));
  terms.sort((a, b) => a - b);
  const next = terms.find((t) => t > birth)!;
  const prev = [...terms].reverse().find((t) => t <= birth)!;
  const days = Math.abs((forward ? next : prev) - birth) / 86400000;
  const daeunSu = Math.max(1, Math.min(10, Math.round(days / 3)));

  const base = { yongsin, gisin, dayBranch };
  const monthIdx = cycleIndex(stems[1], branches[1]);
  const daeun: Daeun[] = Array.from({ length: 9 }, (_, k) => {
    const i = mod(monthIdx + (forward ? k + 1 : -(k + 1)), 60);
    const s = i % 10;
    const b = i % 12;
    return {
      age: daeunSu + k * 10,
      stem: s,
      branch: b,
      ganji: ganji(s, b),
      hanja: ganjiHanja(s, b),
      god: tenGod(dayStem, s),
      branchGod: branchTenGod(dayStem, b),
      score: pillarScore(base, s, b),
    };
  });
  const age = kstNow().y - p.y + 1;
  const currentDaeun = daeun.reduce((cur, d, i) => (age >= d.age ? i : cur), -1);

  return {
    saju,
    gender,
    birthYear: p.y,
    stems,
    branches,
    dayStem,
    dayBranch,
    dm,
    groups,
    gods,
    strength,
    strong,
    yongsin,
    gisin,
    sinsal,
    forward,
    daeunSu,
    daeun,
    age,
    currentDaeun,
  };
}

/** The strongest and weakest 십성 groups. */
export function dominantGroups(c: Chart): { top: TenGroup; low: TenGroup } {
  const entries = Object.entries(c.groups) as [TenGroup, number][];
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  return { top: sorted[0][0], low: sorted[sorted.length - 1][0] };
}

/** 세운 for the next `n` years from this year. */
export function yearlyLuck(c: Chart, n: number, from = thisYear()) {
  return Array.from({ length: n }, (_, k) => {
    const year = from + k;
    const { stem, branch } = yearPillar(year);
    return {
      year,
      stem,
      branch,
      ganji: ganji(stem, branch),
      hanja: ganjiHanja(stem, branch),
      god: tenGod(c.dayStem, stem),
      score: pillarScore(c, stem, branch),
    };
  });
}

/** 월운 for the solar months (寅월 = Feb …) of a year: [{ month(1-12 calendar month the term starts in), stem, branch }]. */
export function monthlyPillars(year: number) {
  const ys = yearPillar(year).stem;
  const start = mod((ys % 5) * 2 + 2, 10); // 寅월 stem
  return Array.from({ length: 12 }, (_, k) => {
    const branch = mod(2 + k, 12);
    const stem = mod(start + k, 10);
    const [tm] = SOLAR_TERMS.find(([, , br]) => br === branch)!;
    return { month: tm, year: tm === 1 ? year + 1 : year, stem, branch };
  });
}

export const samhapWith = (a: number, b: number) => a !== b && SAMHAP.some((g) => g.includes(a) && g.includes(b));
export const elementLabel = (el: ElementKey) => ELEMENT_LABEL[el];
export const ELEMENTS = EL_KEYS;
export { STEM_ELEMENT, BRANCH_ELEMENT, STEMS_HANGUL, BRANCHES_HANGUL };
