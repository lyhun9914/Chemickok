import "server-only";
import { createHash } from "node:crypto";
import { copula, daNyang, josa } from "@/lib/josa";
import { BLOOD_LOVE, normalizeBlood } from "@/lib/blood";
import { syllableStrokes } from "@/lib/nameCompat";
import { PARTNER_INTERVIEW, selfInterview } from "@/lib/interview";
import { COUPLE_CONCERNS, SOLO_CONCERNS } from "@/lib/questions";
import type {
  AxisKey,
  CoupleConcernId,
  CoupleTeaser,
  FullReport,
  LockedPreview,
  LuckSection,
  MatchTeaser,
  PersonInput,
  Pole,
  QuestionnaireInput,
  ReportSection,
  SoloConcernId,
  SoloTeaser,
  TeaserReport,
  TypeInfo,
} from "@/models/types";
import {
  DAY_MASTER_READING,
  ELEMENT_STRONG,
  ELEMENT_WEAK,
  INNER,
  NAME_RELATION,
  OUTER,
  SCENES,
  TYPES,
  traitText,
} from "./content/free";
import { COLOR_VS_SAJU, HIDDEN_META, HIDDEN_READING, PARTNER_DECODE, selfDecode, type Decoded, type HiddenKey } from "./content/decode";
import * as P from "./content/paid";
import * as SOLO from "./content/solo";
import { isValidAnswer, normalizeAnswer, resolve } from "./freeText";
import { crossCombos, decodeBullets, decodeTells, partnerCombos, selfCombos, traitEvidence, type AnswerSet } from "./insight";
import { MBTI_LOVE, bestMbti, hardMbti, mbtiPair, mbtiShort, normalizeMbti } from "./mbti";
import { core as coreOf, punch } from "@/lib/tone";
import { AXES, hiddenPct, reliability, scoreProfile, seedOf, tellingOrder, type Profile } from "./profile";
import {
  ELEMENT_LABEL,
  branchRelation,
  clashAnimal,
  combineStemLabel,
  computeSaju,
  currentMonthBranch,
  dayMasterLabel,
  goodAnimals,
  luckyDays,
  monthRelation,
  stemRelation,
  type SajuResult,
  type StemRelation,
} from "./saju";

// ───────────── Input hygiene ─────────────

const answered = (decode: Record<string, Decoded>, a: unknown) =>
  Object.entries(decode).every(([qid, d]) => isValidAnswer(d, (a as Record<string, unknown>)?.[qid]));

export function validateInput(raw: unknown): QuestionnaireInput | null {
  const i = raw as QuestionnaireInput;
  if (i?.mode !== "solo" && i?.mode !== "couple") return null;
  if (!i.me?.name?.trim() || !i.me.birthdate) return null;
  if (!answered(selfDecode(i.mode), i.self)) return null;
  if (i.mode === "couple") {
    if (!i.partner?.name?.trim()) return null;
    if (!["crush", "dating", "slump", "breakup"].includes(i.status)) return null;
    if (!answered(PARTNER_DECODE, i.partnerObs)) return null;
  }
  return normalize(i);
}

function normalize(i: QuestionnaireInput): QuestionnaireInput {
  const person = (p?: PersonInput): PersonInput => ({
    name: (p?.name ?? "").trim().slice(0, 12),
    gender: p?.gender ?? "other",
    birthdate: p?.birthdate ?? "",
    birthtime: p?.birthtime ?? "",
    mbti: normalizeMbti(p?.mbti),
    blood: normalizeBlood(p?.blood),
  });
  const couple = i.mode === "couple";
  return {
    mode: i.mode,
    me: person(i.me),
    partner: couple ? person(i.partner) : person(),
    status: couple ? i.status : "dating",
    self: Object.fromEntries(Object.keys(selfDecode(i.mode)).map((id) => [id, normalizeAnswer(i.self[id])])),
    partnerObs: couple ? Object.fromEntries(Object.keys(PARTNER_DECODE).map((id) => [id, normalizeAnswer(i.partnerObs[id])])) : {},
  };
}

/** Binds a payment to exactly these answers (orderId carries a prefix of this hash). */
export function inputHash(i: QuestionnaireInput): string {
  return createHash("sha256").update(JSON.stringify(normalize(i))).digest("hex").slice(0, 16);
}

// ───────────── Shared (both modes) ─────────────

/** Fortune-teller cadence: each point cut to its core, one per line. */
const lines = (parts: (string | null | undefined)[], n = 2) =>
  parts.filter((p): p is string => Boolean(p)).map((p) => punch(p, n)).join("\n");
const punchOrNull = (s: string | null, n: number) => (s ? punch(s, n) : null);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));
const opposite: Record<Pole, Pole> = { G: "W", W: "G", E: "H", H: "E", F: "R", R: "F", A: "S", S: "A" };

interface Core {
  input: QuestionnaireInput;
  me: Profile;
  mySaju: SajuResult | null;
  seed: number;
  /** my axes, most decisive first */
  ranked: AxisKey[];
}

function core(input: QuestionnaireInput): Core {
  const me = scoreProfile(selfDecode(input.mode), input.self, input.me.mbti ?? "");
  return {
    input,
    me,
    mySaju: computeSaju(input.me.birthdate, input.me.birthtime),
    seed: seedOf(JSON.stringify(input)),
    ranked: [...AXES].sort((a, b) => Math.abs(me.raw[b.key]) - Math.abs(me.raw[a.key])).map((a) => a.key),
  };
}

function typeInfo(code: string): TypeInfo {
  const t = TYPES[code];
  return { code, name: t.name, emoji: t.emoji, tagline: t.tagline };
}

/**
 * Best partner: opposite drive (no chase or standoff), same expression & conflict style
 * (same "language"), secure attachment. Worst: the reverse, with an anxious partner.
 */
function bestTypeCode(me: Profile): string {
  const p = me.poles;
  return `${opposite[p.drive]}${p.express}${p.conflict}S`;
}
function worstTypeCode(me: Profile): string {
  const p = me.poles;
  return `${p.drive}${opposite[p.express]}${opposite[p.conflict]}A`;
}

function personalReading(c: Core): TeaserReport["personal"] {
  const { me, input, mySaju } = c;
  const evidence = traitEvidence(selfSet(c));
  const traits = c.ranked.map((key) => {
    const r = me.axes.find((a) => a.key === key)!;
    const first = r.leftPct >= 50;
    return {
      title: r.title,
      label: first ? r.leftLabel : r.rightLabel,
      pct: first ? r.leftPct : 100 - r.leftPct,
      text: punch(traitText(r.pole, r.intensity), 2),
      why: evidence[key],
    };
  });
  const scenes = c.ranked.map((key, i) => {
    const list = SCENES[me.poles[key]];
    return list[(c.seed >> (i * 2)) % list.length];
  });

  // Two faces: outer = expression (drive when expression is mild), inner = attachment (conflict when mild).
  const ax = (k: AxisKey) => me.axes.find((a) => a.key === k)!;
  const outerKey: AxisKey = ax("express").intensity === "mild" ? "drive" : "express";
  const innerKey: AxisKey = ax("attach").intensity === "mild" ? "conflict" : "attach";

  let elementReading: string | null = null;
  if (mySaju) {
    const els = mySaju.summary.elements;
    const keys = Object.keys(els) as (keyof typeof els)[];
    const strong = keys.reduce((b, k) => (els[k] > els[b] ? k : b), mySaju.dm.element);
    const weak = mySaju.summary.lacking;
    elementReading = [ELEMENT_STRONG[strong], strong !== weak ? ELEMENT_WEAK[weak] : ""].filter(Boolean).join(" ");
  }

  return {
    nameReading: mySaju ? punchOrNull(nameReading(input.me.name, mySaju.dm.element), 2) : null,
    bloodReading: input.me.blood ? BLOOD_LOVE[input.me.blood] : null,
    dayMasterReading: mySaju
      ? `네 일간은 ${dayMasterLabel(mySaju.dm)}, ${daNyang(`'${mySaju.summary.dayMaster.image}'`)}. ${punch(DAY_MASTER_READING[mySaju.dm.stem], 2)}`
      : null,
    elementReading: elementReading && punch(elementReading, 3),
    twoFaces: { outer: OUTER[me.poles[outerKey]], inner: INNER[me.poles[innerKey]] },
    signature: TYPES[me.code].signature,
    traits,
    tells: tellingOrder(selfDecode(input.mode), input.self)
      .filter((id) => id !== COLOR_Q)
      .slice(0, FREE_TELLS)
      .map((id) => decodeTells(selfSet(c), mbtiShort).get(id)!),
    colorReading: colorReading(c),
    combo: selfCombos(selfSet(c), 1)[0] ?? null,
    hidden: hiddenGauges(me),
    scenes,
  };
}

const ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"] as const;

const COLOR_Q = "s6";
const FREE_TELLS = 2;
const HIDDEN_KEYS = Object.keys(HIDDEN_META) as HiddenKey[];

/** The user's own answers, with everything known about them, for decoding answers in context. */
function selfSet(c: Core): AnswerSet {
  return {
    qs: selfInterview(c.input.mode),
    decode: selfDecode(c.input.mode),
    answers: c.input.self,
    person: { profile: c.me, mbti: c.input.me.mbti ?? "", dm: c.mySaju ? { label: dayMasterLabel(c.mySaju.dm), element: c.mySaju.dm.element } : null },
    aboutPartner: false,
    couple: c.input.mode === "couple",
    p: c.input.partner.name,
  };
}

/** What the user told us about the partner, read against the partner's profile. */
function partnerSet(x: Couple): AnswerSet {
  return {
    qs: PARTNER_INTERVIEW,
    decode: PARTNER_DECODE,
    answers: x.input.partnerObs,
    person: { profile: x.partner, mbti: x.input.partner.mbti ?? "", dm: x.partnerSaju ? { label: dayMasterLabel(x.partnerSaju.dm), element: x.partnerSaju.dm.element } : null },
    aboutPartner: true,
    couple: true,
    p: x.input.partner.name,
  };
}

function colorReading(c: Core): string | null {
  const r = resolve(selfDecode(c.input.mode)[COLOR_Q], COLOR_Q, c.input.self[COLOR_Q]);
  if (!r?.oid) return null;
  const pick = r.oid as (typeof ELEMENT_ORDER)[number];
  const base = coreOf(r.read, 2);
  if (!c.mySaju) return base;
  const els = c.mySaju.summary.elements;
  const max = Math.max(...Object.values(els));
  const vs =
    pick === c.mySaju.summary.lacking
      ? COLOR_VS_SAJU.lacking
      : pick === c.mySaju.dm.element
        ? COLOR_VS_SAJU.dayMaster
        : els[pick] === max
          ? COLOR_VS_SAJU.strongest
          : COLOR_VS_SAJU.other;
  return `${base} ${punch(vs, 2)}`;
}

const hiddenLevel = (pct: number) => (pct >= 66 ? "high" : pct >= 42 ? "mid" : "low");

function hiddenGauges(me: Profile): TeaserReport["personal"]["hidden"] {
  return HIDDEN_KEYS.map((k) => ({ key: k, ...HIDDEN_META[k], pct: hiddenPct(me.hidden[k]) }));
}

/** Paid: what each hidden gauge means for this person, strongest first. */
function hiddenReadings(me: Profile): string[] {
  return hiddenGauges(me)
    .sort((a, b) => b.pct - a.pct)
    .map((g) => `${g.icon} ${g.label} ${g.pct}% · ${HIDDEN_READING[g.key as HiddenKey][hiddenLevel(g.pct)]}`);
}

/** The one combo the free result already showed (couples: my answer × theirs); the paid sections skip it. */
const teaserCombo = (c: Core, x?: Couple) => (x ? crossCombos(selfSet(c), partnerSet(x), 1)[0] : undefined) ?? selfCombos(selfSet(c), 1)[0] ?? null;

function decodeSection(c: Core, intro: string, shown: string | null): ReportSection {
  return {
    title: "면담 기록 전체 해석 · 냥신이 그 질문을 한 이유",
    headline: `'왜 이런 걸 묻지?' 싶었던 ${selfInterview(c.input.mode).length}개, 전부 이유가 있었다냥 🔍`,
    body: intro,
    bullets: [...selfCombos(selfSet(c)).filter((l) => l !== shown), ...decodeBullets(selfSet(c), mbtiShort)],
  };
}

/**
 * 이름 기운 (한글 수리오행): total strokes of a real Hangul name (2–4 syllables) → element by last digit,
 * then read against the day master. Nicknames and non-Hangul names return null.
 */
function nameReading(name: string, dm: (typeof ELEMENT_ORDER)[number]): string | null {
  const chars = [...name];
  if (chars.length < 2 || chars.length > 4) return null;
  const strokes = chars.map(syllableStrokes);
  if (strokes.some((n) => n === null)) return null;
  const total = (strokes as number[]).reduce((a, b) => a + b, 0);
  const el = ELEMENT_ORDER[Math.floor(((total % 10) + 9) % 10 / 2)];
  const i = ELEMENT_ORDER.indexOf(el);
  const d = ELEMENT_ORDER.indexOf(dm);
  // 생: index+1 generates the next; 극: index+2 controls
  const rel =
    el === dm ? "same" : (i + 1) % 5 === d ? "nourish" : (d + 1) % 5 === i ? "express" : (d + 2) % 5 === i ? "wealth" : "pressure";
  return `'${name}' 이름의 총 획수는 ${total}획, 수리오행으로 ${ELEMENT_LABEL[el]}의 기운이다냥. ${NAME_RELATION[rel]}`;
}

function matchTeaser(c: Core): MatchTeaser {
  const mbti = c.input.me.mbti ?? "";
  return {
    bestType: typeInfo(bestTypeCode(c.me)),
    myMbti: mbti || null,
    myMbtiLine: mbti ? MBTI_LOVE[mbti] : null,
    bestMbti: bestMbti(mbti),
    goodAnimals: c.mySaju ? goodAnimals(c.mySaju.dm.yearBranch) : [],
  };
}

function lackingLuck(c: Core) {
  return P.ELEMENT_LUCK[c.mySaju?.summary.lacking ?? "water"];
}

// ───────────── Solo mode ─────────────


function soloMonthFlow(c: Core): "harmony" | "samhap" | "clash" | "none" {
  return (c.mySaju && monthRelation(c.mySaju.dm.branch, currentMonthBranch())) || "none";
}

function soloLoveLuck(c: Core): SoloTeaser {
  const flow = soloMonthFlow(c);
  const month = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  const jitter = (seedOf(JSON.stringify(c.input) + month) % 11) - 5; // stable within a month
  const score = clamp(
    72 + { harmony: 12, samhap: 9, clash: 6, none: 0 }[flow] + (c.me.poles.drive === "G" ? 4 : 0) + jitter,
    61,
    96,
  );
  const headline =
    score >= 88
      ? `이번 달 연애운 ${score}%, 인연의 문이 활짝 열린 달이다냥 🔥`
      : score >= 78
        ? `이번 달 연애운 ${score}%, 먼저 움직이면 잡히는 달이다냥 💘`
        : score >= 68
          ? `이번 달 연애운 ${score}%, 작은 기회만 잘 잡으면 되는 달이다냥 🍀`
          : `이번 달 연애운 ${score}%, 너부터 채우면 좋은 달이다냥 🌙`;
  return { loveLuck: score, loveLuckHeadline: headline };
}

function buildSoloReport(c: Core, level: "share" | "full"): FullReport {
  const { me, input, mySaju } = c;
  const name = input.me.name;
  const mbti = input.me.mbti ?? "";
  const best = typeInfo(bestTypeCode(me));
  const worst = typeInfo(worstTypeCode(me));
  const [top1, top2] = c.ranked;

  const reasons = [top1, top2].map((k) => (k === "attach" ? SOLO.MATCH_REASON.attach[me.poles.attach] : SOLO.MATCH_REASON[k][me.poles[k]]));
  const bestM = bestMbti(mbti);
  const hardM = hardMbti(mbti);
  const animals = mySaju ? goodAnimals(mySaju.dm.yearBranch) : [];
  const matchBody = lines([
    `너랑 제일 잘 맞는 건 '${best.name}' 유형이다냥.`,
    ...reasons,
    bestM.length
      ? `MBTI로 보면 ${mbti}인 너는 ${bestM.join(", ")}랑 천생연분이다냥. 특히 ${bestM[0]}는 '${mbtiShort(bestM[0])}' 타입이라 네 빈칸을 딱 채워 준다냥.`
      : "",
    animals.length ? `띠로는 ${animals.map((a) => `${a}띠`).join(", ")}랑 기운이 잘 맞는다냥(삼합·육합).` : "",
    mySaju ? `사주로는 일간이 ${combineStemLabel(mySaju.dm.stem)}인 놈이랑 천간합(天干合), 즉 '끌림의 합'이다냥. 이런 놈 만나면 이유 없이 끌린다냥.` : "",
  ]);

  const match: ReportSection = {
    title: "나와 맞는 사람 vs 피해야 할 사람",
    headline: `${best.emoji} '${best.name}' 유형 만나면 절대 놓치지 마라냥`,
    body: matchBody,
    bullets: [
      `✅ 찰떡 유형: ${best.emoji} ${best.name} (${best.tagline})`,
      bestM.length ? `💯 찰떡 MBTI: ${bestM.join(" · ")}` : "",
      animals.length ? `🐾 찰떡 띠: ${animals.map((a) => `${a}띠`).join(" · ")}` : "",
      `🚫 피해야 할 유형: ${worst.emoji} ${worst.name}. ${SOLO.AVOID_REASON[top1][me.poles[top1]]}`,
      hardM.length ? `⚠️ 노력이 필요한 MBTI: ${hardM.join(" · ")}` : "",
      mySaju ? `💥 부딪히는 띠: ${clashAnimal(mySaju.dm.yearBranch)}띠` : "",
    ].filter(Boolean),
  };
  if (level === "share") return { subScores: [], sections: [{ id: "match", icon: "🎯", section: match }], luck: null };

  const pattern: ReportSection = {
    title: "내가 연애에서 반복하는 패턴 & 실수",
    headline: `${TYPES[me.code].emoji} '${TYPES[me.code].name}'의 연애 공식`,
    body: lines([
      SOLO.PATTERN[me.poles[top1]],
      SOLO.PATTERN[me.poles[top2]],
      mbti ? `MBTI로 봐도 ${mbti}는 '${mbtiShort(mbti)}' 타입이라 이 패턴이 더 선명하게 나온다냥.` : "",
    ]),
    bullets: [
      ...hiddenReadings(me),
      `⚠️ 자주 하는 실수: ${SOLO.MISTAKE[me.poles[top1]]}`,
      `⚠️ 이것도 조심: ${SOLO.MISTAKE[me.poles[top2]]}`,
      `💡 바꾸면 달라지는 한 가지: ${P.SELF_ACTION[me.poles[top1]].replace(/^📝 /, "")}`,
    ],
  };

  const decode = decodeSection(
    c,
    `${name}, 면담 중에 '이걸 왜 묻지?' 싶었지? 냥신은 처음부터 네 답 하나하나에서 연애 습관을 읽고 있었다냥. 전부 풀어 주겠다냥.`,
    teaserCombo(c),
  );

  const topHidden = [...HIDDEN_KEYS].sort((a, b) => me.hidden[b] - me.hidden[a])[0];
  const crisisKey = hiddenPct(me.hidden[topHidden]) >= 66 ? topHidden : me.poles.attach;
  const days = mySaju ? luckyDays(mySaju.dm) : [];
  const future: ReportSection = {
    title: "다음 연애 시나리오 · 첫 만남부터 6주 차 고비까지",
    headline: "냥신이 미리 본 네 다음 연애 🎬",
    body: `네 성향이랑 사주 흐름으로 다음 연애가 어떻게 흘러갈지 미리 돌려 봤다냥. ${
      days.length ? `인연이 들어올 확률이 제일 높은 날은 ${days[0]}이다냥.` : ""
    } 장면마다 네가 할 일까지 적어 뒀다냥.`,
    bullets: [
      `📍 첫 만남 · ${lackingLuck(c).place}\n${SOLO.SCENARIO.meet[me.poles.drive as "G" | "W"]}`,
      `💬 첫 한 달\n${SOLO.SCENARIO.month1[me.poles.express as "E" | "H"]}`,
      `⚠️ 6주 차 고비\n${SOLO.SCENARIO.crisis[crisisKey as keyof typeof SOLO.SCENARIO.crisis]}`,
      `🔑 ${SOLO.SCENARIO.key[me.poles.conflict as "F" | "R"]}`,
    ],
  };

  const loveLuck = soloLoveLuck(c);
  const prescriptions: ReportSection = {
    title: "솔로 고민 6가지 맞춤 처방",
    headline: `냥신이 너한테만 써 주는 처방전 6장 🩺`,
    body: "솔로들이 제일 많이 하는 고민 6가지를 네 연애 성향이랑 사주에 맞춰 풀었다냥. 지금 마음에 걸리는 것부터 읽어라냥.",
    bullets: SOLO_CONCERNS.map((q) => {
      const a = SOLO.SOLO_ADVICE[q.id];
      return `${q.emoji} ${q.label}\n→ ${a.byPole[me.poles[a.axis]] ?? ""}`;
    }),
  };
  const myLuck = lackingLuck(c);
  const lackingLabel = mySaju ? ELEMENT_LABEL[mySaju.summary.lacking] : null;
  const luck: LuckSection = {
    title: "이번 달 연애운 & 인연이 들어오는 날",
    headline: loveLuck.loveLuckHeadline,
    body: lines([
      SOLO.MONTH_FLOW[soloMonthFlow(c)],
      lackingLabel ? `네 사주에서 제일 약한 기운은 ${daNyang(lackingLabel)}. 이 기운을 채우는 색이랑 장소가 인연을 불러온다냥.` : "",
    ]),
    luckyColor: myLuck.color,
    luckyPlace: myLuck.place,
    luckyItem: myLuck.item,
    luckyDays: mySaju ? luckyDays(mySaju.dm) : [],
    actionItems: [myLuck.action, P.SELF_ACTION[me.poles[top1]], SOLO.SOLO_CONCERN_ACTION[autoSoloConcern(me.poles[top1])]],
  };

  const pct = (k: AxisKey) => me.axes.find((a) => a.key === k)!.leftPct;
  const j = (k: number) => ((c.seed >> k) % 7) - 3;
  const subScores = [
    { label: "이번 달 연애운", score: loveLuck.loveLuck },
    { label: "끌림 매력", score: clamp(62 + (pct("drive") + pct("express")) / 6 + j(3), 55, 97) },
    { label: "연애 안정감", score: clamp(60 + (100 - pct("attach")) / 3 + j(5), 55, 97) },
    { label: "소통력", score: clamp(62 + pct("conflict") / 4 + (pct("express") > 50 ? 6 : 0) + j(7), 55, 97) },
  ];

  return {
    subScores,
    sections: [
      { id: "match", icon: "🎯", section: match },
      { id: "decode", icon: "🔍", section: decode },
      { id: "pattern", icon: "💔", section: pattern },
      { id: "future", icon: "🎬", section: future },
      { id: "prescriptions", icon: "🩺", section: prescriptions },
    ],
    luck,
  };
}

// ───────────── Couple mode ─────────────


interface Couple extends Core {
  names: P.Names;
  partner: Profile;
  partnerSaju: SajuResult | null;
  stemRel: StemRelation | null;
  branchRel: "harmony" | "clash" | null;
  sub: { attraction: number; talk: number; stability: number; future: number };
  score: number;
}

const pair = (a: Profile, b: Profile, axis: AxisKey) => a.poles[axis] + b.poles[axis];

function couple(c: Core): Couple {
  const { input, me, mySaju, seed } = c;
  const names = { me: input.me.name, p: input.partner.name };
  const partner = scoreProfile(PARTNER_DECODE, input.partnerObs, input.partner.mbti ?? "");
  const partnerSaju = computeSaju(input.partner.birthdate, input.partner.birthtime);
  const stemRel = mySaju && partnerSaju ? stemRelation(mySaju.dm, partnerSaju.dm) : null;
  const branchRel = mySaju && partnerSaju ? branchRelation(mySaju.dm.branch, partnerSaju.dm.branch) : null;
  const jitter = (k: number) => ((seed >> k) % 7) - 3; // -3..+3, stable per input

  const g = pair(me, partner, "drive");
  const e = pair(me, partner, "express");
  const f = pair(me, partner, "conflict");
  const a = pair(me, partner, "attach");
  const sajuSpark = { combine: 12, iControl: 6, theyControl: 6, iGenerate: 4, theyGenerate: 4, same: 2 }[stemRel ?? "same"] * (stemRel ? 1 : 0.5);
  const sajuCalm = { combine: 6, iGenerate: 6, theyGenerate: 6, same: 4, iControl: -3, theyControl: -3 }[stemRel ?? "same"] * (stemRel ? 1 : 0.5);
  const mbti = mbtiPair(input.me.mbti ?? "", input.partner.mbti ?? "");
  const mbtiAdj = mbti ? { 천생연분: 5, 좋음: 3, 무난: 0, "노력 필요": -3 }[mbti.level] : 0;

  const attraction =
    72 + (g[0] !== g[1] ? 7 : 0) + (e[0] !== e[1] ? 5 : 0) + (a === "AS" || a === "SA" ? 7 : a === "AA" ? 5 : 0) +
    sajuSpark + (branchRel === "clash" ? 5 : 0) + jitter(3);
  const talk =
    70 + (f === "FF" ? 8 : f === "RR" ? -3 : -7) + (e === "EE" ? 6 : e === "HH" ? -4 : 0) + (g === "WW" ? -4 : 0) + mbtiAdj + jitter(5);
  const stability =
    70 + (a === "SS" ? 12 : a === "AA" ? -6 : 0) + (f === "FR" || f === "RF" ? -6 : 0) + sajuCalm +
    (branchRel === "harmony" ? 5 : 0) + jitter(7);
  const statusAdj = { crush: 0, dating: 3, slump: -3, breakup: -8 }[input.status];
  const future = (talk + stability) / 2 + statusAdj + (branchRel === "harmony" ? 4 : 0) + jitter(9);

  const sub = {
    attraction: clamp(attraction, 52, 98),
    talk: clamp(talk, 48, 96),
    stability: clamp(stability, 48, 96),
    future: clamp(future, 45, 96),
  };
  const score = clamp(0.32 * sub.attraction + 0.24 * sub.talk + 0.24 * sub.stability + 0.2 * sub.future + 4, 58, 97);
  return { ...c, names, partner, partnerSaju, stemRel, branchRel, sub, score };
}

function coupleTitle(x: Couple): string {
  const a = pair(x.me, x.partner, "attach");
  const f = pair(x.me, x.partner, "conflict");
  const anxiousAvoidant =
    (x.me.poles.attach === "A" && x.partner.poles.attach === "S" && x.partner.poles.conflict === "R") ||
    (x.partner.poles.attach === "A" && x.me.poles.attach === "S" && x.me.poles.conflict === "R");
  if (x.stemRel === "combine") return "사주가 먼저 알아본 천간합 운명 커플";
  if (anxiousAvoidant) return "미치게 끌리지만 터지기 직전의 시한폭탄 커플";
  if (a === "AA") return "서로의 사랑을 확인하느라 바쁜 불꽃 롤러코스터 커플";
  if (f === "RR") return "싸운 적은 없는데 풀린 적도 없는 평화로운 냉전 커플";
  if (f === "FF" && pair(x.me, x.partner, "express") === "EE") return "싸우면서 정드는 앙숙 케미 커플";
  if (pair(x.me, x.partner, "drive") === "WW") return "서로 먼저 다가와 주길 기다리는 망부석 커플";
  if (x.branchRel === "clash") return "부딪힐수록 더 끌리는 자석 커플";
  if (x.score >= 85) return "말 안 해도 통하는 소울메이트 커플";
  if (a === "SS") return "편안함이 무기인 장기 연애 체질 커플";
  return "다른 언어로 같은 사랑을 하는 번역기 커플";
}

function overallHeadline(score: number): string {
  if (score >= 88) return `${score}점, 이 정도면 사주가 먼저 알아본 인연이다냥 🔥`;
  if (score >= 78) return `${score}점, 끌림은 확실한데 사용법이 필요한 커플이다냥 💘`;
  if (score >= 68) return `${score}점, 맞춰 가는 재미가 있는 커플이다냥 🧩`;
  return `${score}점, 서로 다른 언어로 사랑하는 중이다냥 🌗`;
}

function coupleTeaser(x: Couple): CoupleTeaser {
  const a = pair(x.me, x.partner, "attach");
  const f = pair(x.me, x.partner, "conflict");
  return {
    partnerType: typeInfo(x.partner.code),
    partnerDayMaster: x.partnerSaju ? dayMasterLabel(x.partnerSaju.dm) : null,
    matchScore: x.score,
    coupleTitle: coupleTitle(x),
    teaserSummary: `${P.PAIR_SHORT[a](x.names)} ${P.PAIR_SHORT[f](x.names)}`,
    overallHeadline: overallHeadline(x.score),
    mbti: mbtiPair(x.input.me.mbti ?? "", x.input.partner.mbti ?? ""),
  };
}

function sajuParagraph(x: Couple): string {
  const { me, p } = x.names;
  if (!x.mySaju) return "";
  if (!x.partnerSaju || !x.stemRel) {
    return `${p} 생일을 알면 둘의 일주(日柱) 궁합까지 볼 수 있다냥. 지금은 성향 위주로 읽었다냥.`;
  }
  const mine = dayMasterLabel(x.mySaju.dm);
  const theirs = dayMasterLabel(x.partnerSaju.dm);
  const el1 = ELEMENT_LABEL[x.mySaju.dm.element];
  const el2 = ELEMENT_LABEL[x.partnerSaju.dm.element];
  const rel: Record<StemRelation, string> = {
    combine: `둘의 일간은 ${josa(mine, "과/와")} ${theirs}, 사주에서 말하는 천간합(天干合)이다냥! 서로 끌어당겨 하나가 되려는 기운이라, 처음 봤을 때부터 이유 없이 끌렸을 거다냥.`,
    same: `둘 다 ${el1}의 기운을 타고났다냥(비화 比和). 친구처럼 편하고 말이 잘 통하는데, 고집 부딪히면 둘 다 절대 안 물러선다냥.`,
    iGenerate: `네 ${josa(el1, "이/가")} ${p}의 ${josa(el2, "을/를")} 살려 주는 상생(相生) 관계다냥. 네가 주는 사랑이 ${josa(p, "을/를")} 키우는데, 주기만 하다 지치지 않게 조심하라냥.`,
    theyGenerate: `${p}의 ${josa(el2, "이/가")} 네 ${josa(el1, "을/를")} 북돋아 주는 상생(相生) 관계다냥. ${p} 옆에 있으면 네가 더 너다워진다냥.`,
    iControl: `네 ${josa(el1, "이/가")} ${p}의 ${josa(el2, "을/를")} 다스리는 상극(相剋) 관계다냥. 네가 리드하기 쉬운데, 그게 통제로 느껴지면 끝이다냥.`,
    theyControl: `${p}의 ${josa(el2, "이/가")} 네 ${josa(el1, "을/를")} 누르는 상극(相剋) 관계다냥. 묘한 긴장감이 끌림을 만드는데, 네 목소리를 잃으면 안 된다냥.`,
  };
  const branch =
    x.branchRel === "clash"
      ? " 게다가 일지(日支)가 서로 충(沖)해서, 부딪힐수록 더 끌리는 묘한 인연이다냥."
      : x.branchRel === "harmony"
        ? " 일지(日支)끼리는 육합(六合)이라, 같이 있으면 생활 리듬이 저절로 맞는다냥."
        : "";
  return rel[x.stemRel] + branch;
}

const SUB_LABEL = { attraction: "끌림 케미", talk: "대화 케미", stability: "감정 안정", future: "미래 케미" } as const;
const WEAPON = {
  attraction: "✨ 이 커플의 무기: 처음의 끌림이 쉽게 안 식는다냥",
  talk: "✨ 이 커플의 무기: 말이 통한다는 게 뭔지 서로 알려 준 사이다냥",
  stability: "✨ 이 커플의 무기: 같이 있으면 마음 놓이는 안정감이다냥",
  future: "✨ 이 커플의 무기: 같이 그리는 미래 그림이 닮았다냥",
};
const WEAKNESS = {
  attraction: "⚠️ 이 커플의 약점: 편안함에 설렘이 묻히기 쉽다냥",
  talk: "⚠️ 이 커플의 약점: 같은 말을 서로 다르게 알아듣는다냥",
  stability: "⚠️ 이 커플의 약점: 감정 기복이 관계를 흔든다냥",
  future: "⚠️ 이 커플의 약점: '우리 어디로 가?' 앞에서 작아진다냥",
};

const mixKey = <K extends string>(pairCode: string, same1: K, same2: K, mix: K): K =>
  pairCode[0] === pairCode[1] ? (pairCode[0] === same1[0] ? same1 : same2) : mix;

function buildCoupleReport(x: Couple, level: "share" | "full"): FullReport {
  const { names: n, me, partner, input } = x;
  const g = pair(me, partner, "drive");
  const e = pair(me, partner, "express");
  const f = pair(me, partner, "conflict");
  const a = pair(me, partner, "attach");

  // 🔒 Hidden mind: partner's two most decisive axes, plus the most mismatched axis for "섭섭한 점".
  const partnerRanked = [...AXES].sort((p, q) => Math.abs(partner.raw[q.key]) - Math.abs(partner.raw[p.key]));
  const topPole = partner.poles[partnerRanked[0].key];
  const mismatch = [...AXES]
    .filter((ax) => me.poles[ax.key] !== partner.poles[ax.key])
    .sort((p, q) => Math.abs(me.raw[q.key] - partner.raw[q.key]) - Math.abs(me.raw[p.key] - partner.raw[p.key]))[0];
  const hurt = mismatch
    ? P.PARTNER_HURT[me.poles[mismatch.key] + partner.poles[mismatch.key]](n)
    : P.PARTNER_HURT_SAME[partner.poles.attach as "A" | "S"](n);
  const partnerMbti = input.partner.mbti ?? "";

  const hiddenMind: ReportSection = {
    title: "상대방이 말하지 않는 진짜 속마음 & 섭섭한 점",
    headline: `${TYPES[partner.code].emoji} ${josa(n.p, "은/는")} '${TYPES[partner.code].name}' 유형이다냥`,
    body: lines([
      P.PARTNER_HIDDEN[partner.poles[partnerRanked[0].key]](n),
      P.PARTNER_HIDDEN[partner.poles[partnerRanked[1].key]](n),
      partnerMbti ? `MBTI로 봐도 ${partnerMbti}는 '${mbtiShort(partnerMbti)}' 타입이라 이런 면이 더 세게 나온다냥.` : "",
      hurt,
    ]),
    bullets: [
      `🙊 속으로 하고 싶은 말: ${P.WANT_TO_SAY[topPole]}`,
      `😢 섭섭 포인트: ${shortHurt(mismatch?.key)}`,
      `💌 듣고 싶은 말: ${P.WANT_TO_HEAR[topPole]}`,
    ],
  };
  if (level === "share") return { subScores: [], sections: [{ id: "hiddenMind", icon: "🔒", section: hiddenMind }], luck: null };

  const subKeys = Object.keys(x.sub) as (keyof typeof x.sub)[];
  const subScores = subKeys.map((k) => ({ label: SUB_LABEL[k], score: x.sub[k] }));
  const sortedSub = [...subKeys].sort((p, q) => x.sub[q] - x.sub[p]);
  const mbti = mbtiPair(input.me.mbti ?? "", partnerMbti);

  const overall: ReportSection = {
    title: "종합 궁합 & 연애 스타일",
    headline: overallHeadline(x.score),
    body: lines([
      P.STATUS_OPENER[input.status],
      sajuParagraph(x),
      mbti ? `MBTI로는 ${mbti.pair}, '${mbti.level}' 조합이다냥. ${mbti.line}` : "",
      P.PAIR[g](n),
      P.PAIR[e](n),
    ]),
    bullets: [
      WEAPON[sortedSub[0]],
      WEAKNESS[sortedSub[sortedSub.length - 1]],
      `🔑 관계의 열쇠: ${me.poles.conflict === "F" ? "말의 내용보다 말할 타이밍을 고르라냥" : "거리를 둘 땐 '돌아올게' 한마디 남기라냥"}`,
    ],
  };

  const letterBody = [
    `${vocative(givenName(n.me))},`,
    P.LETTER.attach[partner.poles.attach as "A" | "S"],
    P.LETTER.express[partner.poles.express as "E" | "H"],
    P.LETTER.conflict[partner.poles.conflict as "F" | "R"],
    P.LETTER.drive[partner.poles.drive as "G" | "W"],
    P.LETTER.closing[input.status],
    `― ${n.p}`,
  ].join("\n\n");
  const letter: ReportSection = {
    title: `${josa(n.p, "이/가")} 보내지 못한 편지`,
    headline: `💌 냥신이 ${n.p}의 기운을 받아 적었다냥`,
    body: letterBody,
    bullets: [
      `✉️ 답장 대신 이 말을 해 줘라냥: ${P.WANT_TO_HEAR[partner.poles.express]}`,
      `🙊 ${josa(n.p, "이/가")} 편지에도 못 쓴 말: ${P.WANT_TO_SAY[partner.poles.attach]}`,
    ],
  };

  const partnerDecode: ReportSection = {
    title: `네가 말한 ${n.p}의 행동 ${PARTNER_INTERVIEW.length}가지, 진짜 의미`,
    headline: `사소해 보여도 ${n.p}의 마음은 습관에 새어 나온다냥 🕵️`,
    body: `${n.p} 얘기할 때 냥신이 이상한 것만 물어봤지? 사람 속마음은 말보다 습관에 먼저 나온다냥. 네가 본 ${n.p}의 모습 ${PARTNER_INTERVIEW.length}개를 하나씩 번역해 주겠다냥.`,
    bullets: [...crossCombos(selfSet(x), partnerSet(x)).filter((l) => l !== teaserCombo(x, x)), ...partnerCombos(partnerSet(x)), ...decodeBullets(partnerSet(x), mbtiShort)],
  };

  const decode = decodeSection(x, `이번엔 너다냥, ${n.me}. 면담 때 '이걸 왜 묻지?' 싶었던 것들, 네 답에 숨은 것까지 다 읽었다냥.`, teaserCombo(x, x));
  decode.bullets.unshift(...hiddenReadings(me));

  const expressKey = mixKey(e, "EE", "HH", "MIX");
  const attachKey = mixKey(a, "AA", "SS", "MIX");
  const conflictKey = mixKey(f, "FF", "RR", "MIX");
  const myLuck = lackingLuck(x);

  const chemistry: ReportSection = {
    title: "스킨십 / 속궁합 & 멘탈 케미 폭발 지점",
    headline:
      x.sub.attraction >= 85
        ? `끌림 케미 ${x.sub.attraction}점, 눈만 마주쳐도 공기가 달라지는 사이 ✨`
        : `끌림 케미 ${x.sub.attraction}점, 분위기를 만들면 확 타오르는 사이 🔥`,
    body: lines([P.MOOD_BY_EXPRESS[expressKey], P.TIMING_BY_ATTACH[attachKey]]),
    bullets: [`🕯️ 최고의 무드: ${myLuck.place}`, P.INTIMACY_SWITCH[partner.poles.express as "E" | "H"], P.MENTAL_SPARK[conflictKey]],
  };

  const crisis: ReportSection = {
    title: "위기 순간 & 트러블 회피법",
    headline:
      conflictKey === "MIX"
        ? "싸움의 진짜 원인은 내용이 아니라 '속도'다냥 ⏱️"
        : conflictKey === "FF"
          ? "둘 다 안 물러설 때가 제일 위험하다냥 ⚔️"
          : "조용한 거리감이 제일 큰 적이다냥 🧊",
    body: lines([P.PAIR[f](n), P.PAIR[a](n)]),
    bullets: [P.DANGER_SIGN[conflictKey], P.EXTINGUISHER[conflictKey], P.BREAKUP_GUARD[attachKey]],
  };

  const lackingLabel = x.mySaju ? ELEMENT_LABEL[x.mySaju.summary.lacking] : null;
  const luck: LuckSection = {
    title: "이번 달 연애 개운(開運) 솔루션",
    headline: lackingLabel
      ? `이번 달 너한테 필요한 기운은 ${daNyang(lackingLabel)} 🍀`
      : "이번 달은 '먼저 표현하는 놈'한테 운이 몰린다냥 🍀",
    body: lackingLabel
      ? `네 사주 여덟 글자에서 제일 약한 기운이 ${daNyang(lackingLabel)}. 모자란 기운을 채우면 관계 흐름이 부드러워진다냥. 아래 날짜는 네 일간이랑 합(合)이 되거나 기운을 북돋아 주는 날이라, 중요한 대화나 데이트는 이날 잡아라냥.`
      : "아래 행동들이 너희 성향 조합에서 제일 잘 먹힌다냥.",
    luckyColor: myLuck.color,
    luckyPlace: myLuck.place,
    luckyItem: myLuck.item,
    luckyDays: x.mySaju ? luckyDays(x.mySaju.dm) : [],
    actionItems: [myLuck.action, P.SELF_ACTION[me.poles[x.ranked[0]]], concernAction(autoCoupleConcern(x))],
  };

  const prescriptions: ReportSection = {
    title: "커플 고민 6가지 맞춤 처방",
    headline: `냥신이 ${n.p} 성향에 맞춰 쓴 처방전 6장 🩺`,
    body: `커플들이 제일 많이 하는 고민 6가지를 ${n.p} 유형에 맞춰 풀었다냥. 지금 너희한테 해당하는 것부터 읽어라냥.`,
    bullets: COUPLE_CONCERNS.map((q) => {
      const a = P.CONCERN_ADVICE[q.id];
      return `${q.emoji} ${q.label}\n→ ${a.byPole[partner.poles[a.axis]]?.(n) ?? ""}`;
    }),
  };

  return {
    subScores,
    sections: [
      { id: "overall", icon: "💖", section: overall },
      { id: "hiddenMind", icon: "🔒", section: hiddenMind },
      { id: "letter", icon: "💌", section: letter },
      { id: "partnerDecode", icon: "🕵️", section: partnerDecode },
      { id: "chemistry", icon: "🔥", section: chemistry },
      { id: "crisis", icon: "⚡", section: crisis },
      { id: "decode", icon: "🔍", section: decode },
      { id: "prescriptions", icon: "🩺", section: prescriptions },
    ],
    luck,
  };
}

/** "김지민" → "지민": a 3-syllable Hangul name is read as surname + given name. */
function givenName(name: string): string {
  return /^[가-힣]{3}$/.test(name) ? name.slice(1) : name;
}

/** "지민" → "지민아", "태현" → "태현아", "수지" → "수지야" */
function vocative(name: string): string {
  return josa(name, "이/가").endsWith("이") ? `${name}아` : `${name}야`;
}

function shortHurt(axis?: AxisKey): string {
  switch (axis) {
    case "drive":
      return "관계의 속도가 엇갈릴 때";
    case "express":
      return "표현 방식을 몰라줄 때";
    case "conflict":
      return "싸운 뒤의 거리가 다를 때";
    case "attach":
      return "연락과 거리감의 온도가 다를 때";
    default:
      return "서로 알겠지 하고 넘어간 순간들";
  }
}

/** The concern this pair most likely has, for the luck section's action item. */
function autoCoupleConcern(x: Couple): CoupleConcernId {
  const f = pair(x.me, x.partner, "conflict");
  const e = pair(x.me, x.partner, "express");
  const a = pair(x.me, x.partner, "attach");
  if (x.input.status === "breakup") return "reunion";
  if (x.input.status === "slump") return "boredom";
  if (f[0] !== f[1]) return "conflict";
  if (a[0] !== a[1]) return "contact";
  if (e[0] !== e[1]) return "uncertainty";
  return "future";
}

function autoSoloConcern(top: Pole): SoloConcernId {
  return ({ G: "who", W: "when", E: "fizzle", H: "fizzle", F: "who", R: "ex", A: "pattern", S: "lazy" } as const)[top];
}

function concernAction(c: CoupleConcernId): string {
  return {
    contact: "📱 연락 규칙 딱 하나만 같이 정하기",
    uncertainty: "❓ 추측 대신 가볍게 한 번 물어보기",
    conflict: "🔁 다음 싸움 전에 '타임아웃 규칙' 미리 합의하기",
    boredom: "🎟️ 둘 다 처음 가 보는 곳으로 데이트 잡기",
    future: "🧭 '올해 안에 같이 할 것 3가지' 적어 보기",
    reunion: "🌧️ 연락하기 전에 일주일 동안 나를 위한 일 하나씩 하기",
  }[c];
}

// ───────────── Public API ─────────────

/** Cut real text mid-sentence so the reader sees where it's going but not where it lands. */
function cut(text: string, len = 34): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= len ? t : `${t.slice(0, len).trimEnd()}…`;
}

const sentenceCount = (s: ReportSection) => s.body.split(/(?<=[.?!])\s+/).length + s.bullets.length;

/**
 * Paid-section previews for the paywall: personalised titles, the real first words of each
 * section (truncated), and true line counts. The full text still only ships after unlock.
 */
function lockedPreviews(input: QuestionnaireInput, report: FullReport): LockedPreview[] {
  const me = input.me.name;
  const p = input.partner.name;
  const sec = (id: string) => report.sections.find((x) => x.id === id)!.section;
  const days = report.luck?.luckyDays ?? [];
  const luckTease = days.length
    ? `이번 달 길일 ${days.length}개 · 첫 번째는 ${days[0].split(" ")[0]} ??일, 이날 하면 좋은 건…`
    : cut(report.luck?.body ?? "");
  const luckCount = (report.luck?.actionItems.length ?? 0) + days.length + 3;

  // Tease the decode with an answer that wasn't decoded for free.
  const order = tellingOrder(selfDecode(input.mode), input.self).filter((id) => id !== COLOR_Q);
  const hiddenTell = order[FREE_TELLS] ?? order[0];
  const ht = decodeTells(selfSet(core(input)), mbtiShort).get(hiddenTell)!;
  const decodeTease = `"${ht.question}" → ${ht.answer}. ${cut(ht.read, 26)}`;
  const decodeTitle = `냥신이 그 질문을 한 진짜 이유 (네 답 ${selfInterview(input.mode).length}개 전부 해석)`;

  if (input.mode === "solo") {
    return [
      { id: "match", icon: "🎯", title: "네가 절대 만나면 안 되는 유형 & 찰떡 상대 상세", tease: cut(sec("match").bullets.find((b) => b.startsWith("🚫")) ?? sec("match").body, 15), count: sentenceCount(sec("match")) },
      { id: "decode", icon: "🔍", title: decodeTitle, tease: decodeTease, count: selfInterview(input.mode).length },
      { id: "pattern", icon: "💔", title: "네가 연애할 때마다 반복하는 치명적 실수 + 숨은 미련·질투 해석", tease: cut(sec("pattern").body), count: sentenceCount(sec("pattern")) },
      { id: "future", icon: "🎬", title: "다음 연애 시나리오: 첫 만남 장소부터 6주 차 고비까지", tease: cut(sec("future").bullets[0].replace("\n", " "), 30), count: sec("future").bullets.length },
      { id: "prescriptions", icon: "🩺", title: "솔로 탈출 처방전 6장 (언제 · 누구랑 · 어떻게)", tease: cut(sec("prescriptions").bullets[0].replace("\n", " ")), count: 6 },
      { id: "luck", icon: "🔮", title: `이번 달 인연이 들어오는 날짜 ${days.length || ""}개 공개`.replace("  ", " "), tease: luckTease, count: luckCount },
    ];
  }
  return [
    { id: "hiddenMind", icon: "🔒", title: `${p}의 진짜 속마음 & 너한테 섭섭한 점`, tease: cut(sec("hiddenMind").body.split(/(?<=[.?!])\s+/).slice(-1)[0], 22), count: sentenceCount(sec("hiddenMind")) },
    { id: "letter", icon: "💌", title: `${josa(p, "이/가")} 너한테 끝내 보내지 못한 편지`, tease: cut(sec("letter").body.split("\n\n")[1], 24), count: sec("letter").body.split("\n\n").length - 2 + sec("letter").bullets.length },
    { id: "partnerDecode", icon: "🕵️", title: `네가 말한 ${p}의 행동 ${PARTNER_INTERVIEW.length}가지, 진짜 의미`, tease: cut(sec("partnerDecode").bullets.find((b) => b.startsWith("Q4."))?.split("🔮 ")[1] ?? "", 28), count: PARTNER_INTERVIEW.length },
    { id: "chemistry", icon: "🔥", title: "두 사람 스킨십 · 속궁합, 불붙는 순간", tease: cut(sec("chemistry").body), count: sentenceCount(sec("chemistry")) },
    { id: "crisis", icon: "⚡", title: "이 커플이 헤어진다면, 바로 이 순간 (이별 예방책)", tease: cut(sec("crisis").body), count: sentenceCount(sec("crisis")) },
    { id: "decode", icon: "🔍", title: decodeTitle, tease: decodeTease, count: selfInterview(input.mode).length },
    { id: "prescriptions", icon: "🩺", title: `${p} 맞춤 연애 처방전 6장`, tease: cut(sec("prescriptions").bullets[0].replace("\n", " ")), count: 6 },
    { id: "luck", icon: "🔮", title: `이번 달 두 사람의 연애 길일 ${days.length || ""}개 공개`.replace("  ", " "), tease: luckTease, count: luckCount },
  ];
}

export function buildTeaser(input: QuestionnaireInput): TeaserReport {
  const c = core(input);
  const base = {
    mode: input.mode,
    myType: typeInfo(c.me.code),
    axes: c.me.axes,
    reliability: reliability(selfDecode(input.mode), input.self),
    saju: c.mySaju?.summary ?? null,
    personal: personalReading(c),
    match: matchTeaser(c),
  };
  if (input.mode === "solo") {
    return { ...base, couple: null, solo: soloLoveLuck(c), locked: lockedPreviews(input, buildSoloReport(c, "full")) };
  }
  const x = couple(c);
  // Couples get the sharpest free pair: one of my answers next to one of theirs.
  const personal = { ...base.personal, combo: teaserCombo(c, x) };
  return { ...base, personal, couple: coupleTeaser(x), solo: null, locked: lockedPreviews(input, buildCoupleReport(x, "full")) };
}

/** level "share" → only the first locked section; "full" → everything. */
export function buildReport(input: QuestionnaireInput, level: "share" | "full"): FullReport {
  const c = core(input);
  return input.mode === "solo" ? buildSoloReport(c, level) : buildCoupleReport(couple(c), level);
}
