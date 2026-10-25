import "server-only";
import type { ElementKey, Pillar, SajuSummary } from "@/models/types";

// 천간(天干) / 지지(地支)
const STEMS_HANJA = "甲乙丙丁戊己庚辛壬癸";
const STEMS_HANGUL = "갑을병정무기경신임계";
const BRANCHES_HANJA = "子丑寅卯辰巳午未申酉戌亥";
const BRANCHES_HANGUL = "자축인묘진사오미신유술해";

const STEM_ELEMENT: ElementKey[] = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const BRANCH_ELEMENT: ElementKey[] = [
  "water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water",
];

export const ELEMENT_LABEL: Record<ElementKey, string> = {
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
};

/** 상생: key generates value */
const GENERATES: Record<ElementKey, ElementKey> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};
/** 상극: key controls value */
const CONTROLS: Record<ElementKey, ElementKey> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

export function generatorOf(el: ElementKey): ElementKey {
  return (Object.keys(GENERATES) as ElementKey[]).find((k) => GENERATES[k] === el)!;
}

/** Day-master imagery (일간 물상) */
export const DAY_MASTER_IMAGE = [
  "곧게 뻗은 큰 나무",
  "바람에 흔들리며 피는 꽃",
  "한여름의 태양",
  "밤을 밝히는 촛불",
  "묵직한 큰 산",
  "모든 걸 품는 기름진 땅",
  "단단한 원석",
  "세공된 보석",
  "깊고 넓은 바다",
  "새벽 이슬과 봄비",
];

function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 60갑자 index of a calendar day (0 = 甲子). 2000-01-01 → 戊午. */
export function dayCycleIndex(y: number, m: number, d: number): number {
  return mod(jdn(y, m, d) + 49, 60);
}

function pillar(label: Pillar["label"], stem: number, branch: number): Pillar {
  return {
    label,
    hanja: STEMS_HANJA[stem] + BRANCHES_HANJA[branch],
    hangul: STEMS_HANGUL[stem] + BRANCHES_HANGUL[branch],
  };
}

// Approximate start days of each solar month (절입일). ±1 day is accepted precision for this app.
// [month, day, branchIndex]
const SOLAR_TERMS: [number, number, number][] = [
  [1, 6, 1], [2, 4, 2], [3, 6, 3], [4, 5, 4], [5, 6, 5], [6, 6, 6],
  [7, 7, 7], [8, 8, 8], [9, 8, 9], [10, 8, 10], [11, 7, 11], [12, 7, 0],
];

export interface DayMasterInfo {
  stem: number; // 0..9
  branch: number; // day branch 0..11
  element: ElementKey;
  yearBranch: number; // 띠 0..11
}

export const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

/** 삼합(三合) groups */
const SAMHAP = [
  [8, 0, 4],
  [2, 6, 10],
  [5, 9, 1],
  [11, 3, 7],
];

export interface SajuResult {
  summary: SajuSummary;
  dm: DayMasterInfo;
}

export function parseDate(s: string): { y: number; m: number; d: number } | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!r) return null;
  const [y, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export function computeSaju(birthdate: string, birthtime?: string): SajuResult | null {
  const p = parseDate(birthdate);
  if (!p) return null;
  const { y, m, d } = p;

  // Year pillar changes at 입춘 (~Feb 4)
  const beforeIpchun = m < 2 || (m === 2 && d < 4);
  const sajuYear = beforeIpchun ? y - 1 : y;
  const yIdx = mod(sajuYear - 4, 60);
  const yearStem = yIdx % 10;

  // Month pillar from solar terms
  let monthBranch = 0; // before 1/6 → 子月 of previous saju year
  for (const [tm, td, br] of SOLAR_TERMS) {
    if (m > tm || (m === tm && d >= td)) monthBranch = br;
  }
  const monthStemStart = mod((yearStem % 5) * 2 + 2, 10);
  const monthStem = mod(monthStemStart + mod(monthBranch - 2, 12), 10);

  // Day pillar
  const dIdx = dayCycleIndex(y, m, d);
  const dayStem = dIdx % 10;
  const dayBranch = dIdx % 12;

  const pillars: Pillar[] = [
    pillar("년주", yearStem, yIdx % 12),
    pillar("월주", monthStem, monthBranch),
    pillar("일주", dayStem, dayBranch),
  ];

  // Hour pillar (Korea: 자시 = 23:30–01:29 because of the KST/solar-time offset)
  const t = birthtime && /^(\d{2}):(\d{2})$/.exec(birthtime);
  if (t) {
    const minutes = Number(t[1]) * 60 + Number(t[2]);
    const hourBranch = Math.floor(mod(minutes + 30, 1440) / 120);
    const hourStem = mod((dayStem % 5) * 2 + hourBranch, 10);
    pillars.push(pillar("시주", hourStem, hourBranch));
  }

  const elements: Record<ElementKey, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const pl of pillars) {
    elements[STEM_ELEMENT[STEMS_HANJA.indexOf(pl.hanja[0])]]++;
    elements[BRANCH_ELEMENT[BRANCHES_HANJA.indexOf(pl.hanja[1])]]++;
  }

  const dmElement = STEM_ELEMENT[dayStem];
  // Lacking element: the lowest count; ties prefer the one that nourishes the day master (인성).
  const order: ElementKey[] = [generatorOf(dmElement), "wood", "fire", "earth", "metal", "water"];
  const lacking = order.reduce((best, el) => (elements[el] < elements[best] ? el : best), order[0]);

  return {
    dm: { stem: dayStem, branch: dayBranch, element: dmElement, yearBranch: yIdx % 12 },
    summary: {
      pillars,
      dayMaster: {
        hanja: STEMS_HANJA[dayStem],
        hangul: STEMS_HANGUL[dayStem],
        image: DAY_MASTER_IMAGE[dayStem],
        element: dmElement,
      },
      elements,
      lacking,
      animal: ANIMALS[yIdx % 12],
    },
  };
}

export function dayMasterLabel(dm: DayMasterInfo): string {
  const el = ELEMENT_LABEL[dm.element];
  return `${STEMS_HANGUL[dm.stem]}${el[0]}(${STEMS_HANJA[dm.stem]}${el[2]})`;
}

export type StemRelation =
  | "combine" // 천간합
  | "same" // 비화
  | "iGenerate"
  | "theyGenerate"
  | "iControl"
  | "theyControl";

export function stemRelation(me: DayMasterInfo, them: DayMasterInfo): StemRelation {
  if (Math.abs(me.stem - them.stem) === 5) return "combine";
  if (me.element === them.element) return "same";
  if (GENERATES[me.element] === them.element) return "iGenerate";
  if (GENERATES[them.element] === me.element) return "theyGenerate";
  if (CONTROLS[me.element] === them.element) return "iControl";
  return "theyControl";
}

const SIX_HARMONY = new Set(["0-1", "2-11", "3-10", "4-9", "5-8", "6-7"]);

/** 일지 관계: 육합 / 충 / none */
export function branchRelation(a: number, b: number): "harmony" | "clash" | null {
  const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
  if (SIX_HARMONY.has(key)) return "harmony";
  if (Math.abs(a - b) === 6) return "clash";
  return null;
}

const WEEKDAYS = "일월화수목금토";

/**
 * Auspicious love days this month (KST): days whose stem forms 천간합 with the day master,
 * or whose element nourishes it (인성). Prefers upcoming days.
 */
export function luckyDays(dm: DayMasterInfo, now = new Date()): string[] {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const today = kst.getUTCDate();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const nourish = generatorOf(dm.element);

  const candidates: { d: number; rank: number; idx: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const idx = dayCycleIndex(y, m, d);
    const stem = idx % 10;
    if (Math.abs(stem - dm.stem) === 5) candidates.push({ d, rank: 0, idx });
    else if (STEM_ELEMENT[stem] === nourish) candidates.push({ d, rank: 1, idx });
  }
  const upcoming = candidates.filter((c) => c.d >= today);
  const pool = (upcoming.length >= 2 ? upcoming : candidates).sort((a, b) => a.rank - b.rank || a.d - b.d);
  return pool
    .slice(0, 3)
    .sort((a, b) => a.d - b.d)
    .map(({ d, idx }) => {
      const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      return `${m}월 ${d}일(${wd}) ${STEMS_HANGUL[idx % 10]}${BRANCHES_HANGUL[idx % 12]}일`;
    });
}

/** 찰떡 띠: the other two of my 삼합 group plus my 육합 partner. */
export function goodAnimals(yearBranch: number): string[] {
  const group = SAMHAP.find((g) => g.includes(yearBranch))!.filter((b) => b !== yearBranch);
  const harmony = [...Array(12).keys()].find((b) => b !== yearBranch && branchRelation(yearBranch, b) === "harmony")!;
  return [...group, harmony].map((b) => ANIMALS[b]);
}

export function clashAnimal(yearBranch: number): string {
  return ANIMALS[mod(yearBranch + 6, 12)];
}

/** Earthly branch of the current solar month (KST), for 이번 달 연애운. */
export function currentMonthBranch(now = new Date()): number {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  let branch = 0;
  for (const [tm, td, br] of SOLAR_TERMS) {
    if (m > tm || (m === tm && d >= td)) branch = br;
  }
  return branch;
}

export function monthRelation(dayBranch: number, monthBranch: number): "harmony" | "clash" | "samhap" | null {
  const rel = branchRelation(dayBranch, monthBranch);
  if (rel) return rel;
  if (dayBranch !== monthBranch && SAMHAP.some((g) => g.includes(dayBranch) && g.includes(monthBranch))) return "samhap";
  return null;
}

/** "계수(癸水)" — the day master that forms 천간합 with mine. */
export function combineStemLabel(stem: number): string {
  const partner = mod(stem + 5, 10);
  const el = ELEMENT_LABEL[STEM_ELEMENT[partner]];
  return `${STEMS_HANGUL[partner]}${el[0]}(${STEMS_HANJA[partner]}${el[2]})`;
}
