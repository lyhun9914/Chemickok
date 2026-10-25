import "server-only";
import { createHash } from "node:crypto";
import { copula, josa } from "@/lib/josa";
import { COUPLE_CONCERNS, PARTNER_QUESTIONS, SELF_QUESTIONS, SOLO_CONCERNS } from "@/lib/questions";
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
import { DAY_MASTER_READING, QUOTE_READING, SCENES, TYPES, traitText } from "./content/free";
import * as P from "./content/paid";
import * as SOLO from "./content/solo";
import { MBTI_LOVE, bestMbti, hardMbti, mbtiPair, mbtiShort, normalizeMbti } from "./mbti";
import { AXES, mostDecisive, reliability, scoreProfile, seedOf, type Profile } from "./profile";
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

const likert = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;

export function validateInput(raw: unknown): QuestionnaireInput | null {
  const i = raw as QuestionnaireInput;
  if (i?.mode !== "solo" && i?.mode !== "couple") return null;
  if (!i.me?.name?.trim() || !i.me.birthdate) return null;
  if (!SELF_QUESTIONS.every((q) => likert(i.self?.[q.id]))) return null;
  if (i.mode === "solo") {
    if (!SOLO_CONCERNS.some((c) => c.id === i.concern)) return null;
  } else {
    if (!i.partner?.name?.trim()) return null;
    if (!["crush", "dating", "slump", "breakup"].includes(i.status)) return null;
    if (!COUPLE_CONCERNS.some((c) => c.id === i.concern)) return null;
    if (!PARTNER_QUESTIONS.every((q) => likert(i.partnerObs?.[q.id]))) return null;
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
  });
  const couple = i.mode === "couple";
  return {
    mode: i.mode,
    me: person(i.me),
    partner: couple ? person(i.partner) : person(),
    status: couple ? i.status : "dating",
    concern: i.concern,
    self: Object.fromEntries(SELF_QUESTIONS.map((q) => [q.id, i.self[q.id]])),
    partnerObs: couple ? Object.fromEntries(PARTNER_QUESTIONS.map((q) => [q.id, i.partnerObs[q.id]])) : {},
  };
}

/** Binds a payment to exactly these answers (orderId carries a prefix of this hash). */
export function inputHash(i: QuestionnaireInput): string {
  return createHash("sha256").update(JSON.stringify(normalize(i))).digest("hex").slice(0, 16);
}

// ───────────── Shared (both modes) ─────────────

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
  const me = scoreProfile(SELF_QUESTIONS, input.self);
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
  const traits = c.ranked.slice(0, 2).map((key) => {
    const r = me.axes.find((a) => a.key === key)!;
    return traitText(r.pole, r.intensity);
  });
  const scenes = c.ranked.slice(0, 3).map((key, i) => {
    const list = SCENES[me.poles[key]];
    return list[(c.seed >> (i * 2)) % list.length];
  });
  const decisive = mostDecisive(SELF_QUESTIONS, input.self);
  return {
    dayMasterReading: mySaju
      ? `${input.me.name}님의 일간은 ${dayMasterLabel(mySaju.dm)}, '${mySaju.summary.dayMaster.image}'의 기운이에요. ${DAY_MASTER_READING[mySaju.dm.stem]}`
      : null,
    signature: TYPES[me.code].signature,
    traits,
    quote: decisive
      ? {
          question: decisive.q.text,
          answer: decisive.answer,
          reading: QUOTE_READING[decisive.q.id][decisive.value > 3 ? "agree" : "disagree"],
        }
      : null,
    scenes,
  };
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

const SOLO_LOCKED: LockedPreview[] = [
  { id: "match", icon: "🎯", title: "나와 맞는 사람 vs 피해야 할 사람 (유형·MBTI·띠 상세)" },
  { id: "pattern", icon: "💔", title: "내가 연애에서 반복하는 패턴 & 자주 하는 실수" },
  { id: "luck", icon: "🔮", title: "이번 달 연애운 & 인연이 들어오는 날 (길일)" },
];

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
      ? `이번 달 연애운 ${score}%, 인연의 문이 활짝 열린 달이에요 🔥`
      : score >= 78
        ? `이번 달 연애운 ${score}%, 먼저 움직이면 잡히는 달이에요 💘`
        : score >= 68
          ? `이번 달 연애운 ${score}%, 작은 기회를 살리면 좋은 달이에요 🍀`
          : `이번 달 연애운 ${score}%, 나를 먼저 채우면 좋은 달이에요 🌙`;
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
  const matchBody = [
    `${name}님에게 가장 잘 맞는 건 '${best.name}' 유형이에요.`,
    ...reasons,
    bestM.length
      ? `MBTI로 보면 ${mbti}인 ${name}님은 ${bestM.join(", ")}와 천생연분 조합이에요. 특히 ${bestM[0]}는 '${mbtiShort(bestM[0])}' 타입이라 ${name}님의 빈칸을 채워 줘요.`
      : "",
    animals.length ? `띠로는 ${animals.map((a) => `${a}띠`).join(", ")}와 기운이 잘 맞아요(삼합·육합).` : "",
    mySaju ? `사주로는 일간이 ${combineStemLabel(mySaju.dm.stem)}인 사람과 천간합(天干合), 즉 '끌림의 합'이에요.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const match: ReportSection = {
    title: "나와 맞는 사람 vs 피해야 할 사람",
    headline: `${best.emoji} '${best.name}' 유형을 만나면 놓치지 마세요`,
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
    body: [
      SOLO.PATTERN[me.poles[top1]],
      SOLO.PATTERN[me.poles[top2]],
      mbti ? `MBTI로 봐도 ${mbti}는 '${mbtiShort(mbti)}' 타입이라 이 패턴이 더 선명하게 나타나요.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    bullets: [
      `⚠️ 자주 하는 실수: ${SOLO.MISTAKE[me.poles[top1]]}`,
      `⚠️ 이것도 조심: ${SOLO.MISTAKE[me.poles[top2]]}`,
      `💡 바꾸면 달라지는 한 가지: ${P.SELF_ACTION[me.poles[top1]].replace(/^📝 /, "")}`,
    ],
  };

  const loveLuck = soloLoveLuck(c);
  const concern = input.concern as SoloConcernId;
  const advice = SOLO.SOLO_ADVICE[concern];
  const myLuck = lackingLuck(c);
  const lackingLabel = mySaju ? ELEMENT_LABEL[mySaju.summary.lacking] : null;
  const luck: LuckSection = {
    title: "이번 달 연애운 & 인연이 들어오는 날",
    headline: loveLuck.loveLuckHeadline,
    body: [
      SOLO.MONTH_FLOW[soloMonthFlow(c)],
      advice.byPole[me.poles[advice.axis]] ?? "",
      lackingLabel ? `${name}님의 사주에서 가장 약한 기운은 ${copula(lackingLabel)}. 이 기운을 채우는 색과 장소가 인연을 불러와요.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    luckyColor: myLuck.color,
    luckyPlace: myLuck.place,
    luckyItem: myLuck.item,
    luckyDays: mySaju ? luckyDays(mySaju.dm) : [],
    actionItems: [myLuck.action, P.SELF_ACTION[me.poles[top1]], SOLO.SOLO_CONCERN_ACTION[concern]],
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
      { id: "pattern", icon: "💔", section: pattern },
    ],
    luck,
  };
}

// ───────────── Couple mode ─────────────

const COUPLE_LOCKED: LockedPreview[] = [
  { id: "hiddenMind", icon: "🔒", title: "상대방이 말하지 않는 진짜 속마음 & 섭섭한 점" },
  { id: "chemistry", icon: "🔥", title: "두 사람의 스킨십 / 속궁합 & 멘탈 케미 폭발 지점" },
  { id: "crisis", icon: "⚡", title: "위기 순간 & 결정적 이별 예방책" },
  { id: "luck", icon: "🔮", title: "이번 달 연애 개운(開運) 솔루션 & 길일" },
];

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
  const partner = scoreProfile(PARTNER_QUESTIONS, input.partnerObs);
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
  if (score >= 88) return `${score}점, 이 정도면 사주가 먼저 알아본 인연이에요 🔥`;
  if (score >= 78) return `${score}점, 끌림은 확실한데 사용법이 필요한 커플이에요 💘`;
  if (score >= 68) return `${score}점, 맞춰 가는 재미가 있는 커플이에요 🧩`;
  return `${score}점, 서로 다른 언어로 사랑하는 중이에요 🌗`;
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
    return `${p}님의 생년월일을 알면 두 사람의 일주(日柱) 궁합까지 볼 수 있어요. 지금은 성향 데이터를 중심으로 읽었어요.`;
  }
  const mine = dayMasterLabel(x.mySaju.dm);
  const theirs = dayMasterLabel(x.partnerSaju.dm);
  const el1 = ELEMENT_LABEL[x.mySaju.dm.element];
  const el2 = ELEMENT_LABEL[x.partnerSaju.dm.element];
  const rel: Record<StemRelation, string> = {
    combine: `두 사람의 일간은 ${josa(mine, "과/와")} ${theirs}, 사주에서 말하는 천간합(天干合)이에요. 서로를 끌어당겨 하나가 되려는 기운이라, 처음 만났을 때부터 이유 없이 끌렸을 가능성이 커요.`,
    same: `두 사람 모두 ${el1}의 기운을 타고났어요(비화 比和). 친구처럼 편하고 말이 잘 통하지만, 고집이 부딪히면 둘 다 물러서지 않아요.`,
    iGenerate: `${me}님의 ${josa(el1, "이/가")} ${p}님의 ${josa(el2, "을/를")} 살려 주는 상생(相生) 관계예요. ${me}님이 주는 사랑이 ${p}님을 자라게 하지만, 주기만 하다 지치지 않게 조심해야 해요.`,
    theyGenerate: `${p}님의 ${josa(el2, "이/가")} ${me}님의 ${josa(el1, "을/를")} 북돋아 주는 상생(相生) 관계예요. ${p}님 곁에 있으면 ${me}님이 더 나다워지는 느낌을 받을 거예요.`,
    iControl: `${me}님의 ${josa(el1, "이/가")} ${p}님의 ${josa(el2, "을/를")} 다스리는 상극(相剋) 관계예요. ${me}님이 관계를 리드하기 쉽지만, 그게 통제로 느껴지지 않게 균형이 필요해요.`,
    theyControl: `${p}님의 ${josa(el2, "이/가")} ${me}님의 ${josa(el1, "을/를")} 누르는 상극(相剋) 관계예요. 묘한 긴장감이 끌림을 만들지만, ${me}님이 자기 목소리를 잃지 않는 게 중요해요.`,
  };
  const branch =
    x.branchRel === "clash"
      ? " 게다가 일지(日支)가 서로 충(沖)하는 관계라, 부딪힐수록 더 끌리는 묘한 인연이에요."
      : x.branchRel === "harmony"
        ? " 일지(日支)끼리는 육합(六合)이라, 함께 있을 때 생활 리듬이 자연스럽게 맞아요."
        : "";
  return rel[x.stemRel] + branch;
}

const SUB_LABEL = { attraction: "끌림 케미", talk: "대화 케미", stability: "감정 안정", future: "미래 케미" } as const;
const WEAPON = {
  attraction: "✨ 이 커플의 무기: 처음의 끌림이 쉽게 식지 않아요",
  talk: "✨ 이 커플의 무기: 말이 통한다는 게 뭔지 서로에게 알려 준 사이",
  stability: "✨ 이 커플의 무기: 같이 있으면 마음이 놓이는 안정감",
  future: "✨ 이 커플의 무기: 함께 그리는 그림이 닮아 있어요",
};
const WEAKNESS = {
  attraction: "⚠️ 이 커플의 약점: 편안함에 설렘이 묻히기 쉬워요",
  talk: "⚠️ 이 커플의 약점: 같은 말을 다르게 알아듣는 순간이 잦아요",
  stability: "⚠️ 이 커플의 약점: 감정 기복이 관계를 흔들 때가 있어요",
  future: "⚠️ 이 커플의 약점: '우리 어디로 가?'라는 질문 앞에서 작아져요",
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
    headline: `${TYPES[partner.code].emoji} ${n.p}님은 '${TYPES[partner.code].name}' 유형이에요`,
    body: [
      P.PARTNER_HIDDEN[partner.poles[partnerRanked[0].key]](n),
      P.PARTNER_HIDDEN[partner.poles[partnerRanked[1].key]](n),
      partnerMbti ? `MBTI로 봐도 ${partnerMbti}는 '${mbtiShort(partnerMbti)}' 타입이라 이런 면이 더 강하게 나타나요.` : "",
      hurt,
    ]
      .filter(Boolean)
      .join(" "),
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
    body: [
      P.STATUS_OPENER[input.status],
      sajuParagraph(x),
      mbti ? `MBTI로는 ${mbti.pair}, '${mbti.level}' 조합이에요. ${mbti.line}` : "",
      P.PAIR[g](n),
      P.PAIR[e](n),
    ]
      .filter(Boolean)
      .join(" "),
    bullets: [
      WEAPON[sortedSub[0]],
      WEAKNESS[sortedSub[sortedSub.length - 1]],
      `🔑 관계의 열쇠: ${me.poles.conflict === "F" ? "말의 내용보다 말할 타이밍을 고르는 것" : "거리를 둘 때 '돌아올게' 한마디 남기는 것"}`,
    ],
  };

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
    body: `${P.MOOD_BY_EXPRESS[expressKey]} ${P.TIMING_BY_ATTACH[attachKey]}`,
    bullets: [`🕯️ 최고의 무드: ${myLuck.place}`, P.INTIMACY_SWITCH[partner.poles.express as "E" | "H"], P.MENTAL_SPARK[conflictKey]],
  };

  const concern = P.CONCERN_ADVICE[input.concern as CoupleConcernId];
  const concernText = concern.byPole[partner.poles[concern.axis]]?.(n) ?? "";
  const crisis: ReportSection = {
    title: "위기 순간 & 트러블 회피법",
    headline:
      conflictKey === "MIX"
        ? "싸움의 진짜 원인은 내용이 아니라 '속도'예요 ⏱️"
        : conflictKey === "FF"
          ? "둘 다 물러서지 않을 때가 가장 위험해요 ⚔️"
          : "조용한 거리감이 가장 큰 적이에요 🧊",
    body: [P.PAIR[f](n), P.PAIR[a](n), concernText].filter(Boolean).join(" "),
    bullets: [P.DANGER_SIGN[conflictKey], P.EXTINGUISHER[conflictKey], P.BREAKUP_GUARD[attachKey]],
  };

  const lackingLabel = x.mySaju ? ELEMENT_LABEL[x.mySaju.summary.lacking] : null;
  const luck: LuckSection = {
    title: "이번 달 연애 개운(開運) 솔루션",
    headline: lackingLabel
      ? `이번 달 ${n.me}님에게 필요한 기운은 ${copula(lackingLabel)} 🍀`
      : "이번 달은 '먼저 표현하는 사람'에게 운이 몰려요 🍀",
    body: lackingLabel
      ? `${n.me}님의 사주 여덟 글자에서 가장 약한 기운은 ${copula(lackingLabel)}. 부족한 기운을 채우면 관계의 흐름이 부드러워져요. 아래 날짜들은 ${n.me}님의 일간과 합(合)이 되거나 기운을 북돋아 주는 날이라, 중요한 대화나 데이트를 잡기 좋아요.`
      : "아래 행동들은 두 사람의 성향 조합에서 가장 효과가 큰 것들이에요.",
    luckyColor: myLuck.color,
    luckyPlace: myLuck.place,
    luckyItem: myLuck.item,
    luckyDays: x.mySaju ? luckyDays(x.mySaju.dm) : [],
    actionItems: [myLuck.action, P.SELF_ACTION[me.poles[x.ranked[0]]], concernAction(input.concern as CoupleConcernId)],
  };

  return {
    subScores,
    sections: [
      { id: "overall", icon: "💖", section: overall },
      { id: "hiddenMind", icon: "🔒", section: hiddenMind },
      { id: "chemistry", icon: "🔥", section: chemistry },
      { id: "crisis", icon: "⚡", section: crisis },
    ],
    luck,
  };
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

export function buildTeaser(input: QuestionnaireInput): TeaserReport {
  const c = core(input);
  const base = {
    mode: input.mode,
    myType: typeInfo(c.me.code),
    axes: c.me.axes,
    reliability: reliability(SELF_QUESTIONS, input.self),
    saju: c.mySaju?.summary ?? null,
    personal: personalReading(c),
    match: matchTeaser(c),
  };
  if (input.mode === "solo") {
    return { ...base, couple: null, solo: soloLoveLuck(c), locked: SOLO_LOCKED };
  }
  return { ...base, couple: coupleTeaser(couple(c)), solo: null, locked: COUPLE_LOCKED };
}

/** level "share" → only the first locked section; "full" → everything. */
export function buildReport(input: QuestionnaireInput, level: "share" | "full"): FullReport {
  const c = core(input);
  return input.mode === "solo" ? buildSoloReport(c, level) : buildCoupleReport(couple(c), level);
}
