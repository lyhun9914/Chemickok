import "server-only";
import { createHash } from "node:crypto";
import { copula, josa } from "@/lib/josa";
import { PARTNER_QUESTIONS, SELF_QUESTIONS } from "@/lib/questions";
import type {
  AxisKey,
  FullReport,
  Pole,
  QuestionnaireInput,
  ReportSection,
  TeaserReport,
  TypeInfo,
} from "@/models/types";
import { DAY_MASTER_READING, QUOTE_READING, SCENES, TYPES, traitText } from "./content/free";
import * as P from "./content/paid";
import { AXES, mostDecisive, reliability, scoreProfile, seedOf, type Profile } from "./profile";
import {
  ELEMENT_LABEL,
  branchRelation,
  computeSaju,
  dayMasterLabel,
  luckyDays,
  stemRelation,
  type SajuResult,
  type StemRelation,
} from "./saju";

// ───────────── Input hygiene ─────────────

export function validateInput(raw: unknown): QuestionnaireInput | null {
  const i = raw as QuestionnaireInput;
  if (!i?.me?.name?.trim() || !i?.partner?.name?.trim() || !i.me.birthdate) return null;
  if (!["crush", "dating", "slump", "breakup"].includes(i.status)) return null;
  if (!["contact", "uncertainty", "conflict", "boredom", "future", "reunion"].includes(i.concern)) return null;
  const likert = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;
  if (!SELF_QUESTIONS.every((q) => likert(i.self?.[q.id]))) return null;
  if (!PARTNER_QUESTIONS.every((q) => likert(i.partnerObs?.[q.id]))) return null;
  return normalize(i);
}

function normalize(i: QuestionnaireInput): QuestionnaireInput {
  const person = (p: QuestionnaireInput["me"]) => ({
    name: p.name.trim().slice(0, 12),
    gender: p.gender,
    birthdate: p.birthdate ?? "",
    birthtime: p.birthtime ?? "",
  });
  return {
    me: person(i.me),
    partner: person(i.partner),
    status: i.status,
    concern: i.concern,
    self: Object.fromEntries(SELF_QUESTIONS.map((q) => [q.id, i.self[q.id]])),
    partnerObs: Object.fromEntries(PARTNER_QUESTIONS.map((q) => [q.id, i.partnerObs[q.id]])),
  };
}

/** Binds a payment to exactly these answers (orderId carries a prefix of this hash). */
export function inputHash(i: QuestionnaireInput): string {
  return createHash("sha256").update(JSON.stringify(normalize(i))).digest("hex").slice(0, 16);
}

// ───────────── Shared analysis ─────────────

interface Analysis {
  input: QuestionnaireInput;
  names: P.Names;
  me: Profile;
  partner: Profile;
  mySaju: SajuResult | null;
  partnerSaju: SajuResult | null;
  stemRel: StemRelation | null;
  branchRel: "harmony" | "clash" | null;
  seed: number;
  sub: { attraction: number; talk: number; stability: number; future: number };
  score: number;
}

const pair = (a: Profile, b: Profile, axis: AxisKey) => a.poles[axis] + b.poles[axis];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

function analyze(input: QuestionnaireInput): Analysis {
  const names = { me: input.me.name, p: input.partner.name };
  const me = scoreProfile(SELF_QUESTIONS, input.self);
  const partner = scoreProfile(PARTNER_QUESTIONS, input.partnerObs);
  const mySaju = computeSaju(input.me.birthdate, input.me.birthtime);
  const partnerSaju = computeSaju(input.partner.birthdate, input.partner.birthtime);
  const stemRel = mySaju && partnerSaju ? stemRelation(mySaju.dm, partnerSaju.dm) : null;
  const branchRel = mySaju && partnerSaju ? branchRelation(mySaju.dm.branch, partnerSaju.dm.branch) : null;
  const seed = seedOf(JSON.stringify(input));
  const jitter = (k: number) => ((seed >> k) % 7) - 3; // -3..+3, stable per input

  const g = pair(me, partner, "drive");
  const e = pair(me, partner, "express");
  const f = pair(me, partner, "conflict");
  const a = pair(me, partner, "attach");
  const sajuSpark = { combine: 12, iControl: 6, theyControl: 6, iGenerate: 4, theyGenerate: 4, same: 2 }[stemRel ?? "same"] * (stemRel ? 1 : 0.5);
  const sajuCalm = { combine: 6, iGenerate: 6, theyGenerate: 6, same: 4, iControl: -3, theyControl: -3 }[stemRel ?? "same"] * (stemRel ? 1 : 0.5);

  const attraction =
    72 + (g[0] !== g[1] ? 7 : 0) + (e[0] !== e[1] ? 5 : 0) + (a === "AS" || a === "SA" ? 7 : a === "AA" ? 5 : 0) +
    sajuSpark + (branchRel === "clash" ? 5 : 0) + jitter(3);
  const talk =
    70 + (f === "FF" ? 8 : f === "RR" ? -3 : -7) + (e === "EE" ? 6 : e === "HH" ? -4 : 0) + (g === "WW" ? -4 : 0) + jitter(5);
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
  return { input, names, me, partner, mySaju, partnerSaju, stemRel, branchRel, seed, sub, score };
}

function typeInfo(code: string): TypeInfo {
  const t = TYPES[code];
  return { code, name: t.name, emoji: t.emoji, tagline: t.tagline };
}

function coupleTitle(x: Analysis): string {
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

// ───────────── Free teaser ─────────────

export function buildTeaser(input: QuestionnaireInput): TeaserReport {
  const x = analyze(input);
  const { me, names } = x;

  // Top axes by decisiveness → the traits & scenes that will feel the most "me".
  const ranked = [...AXES].sort((a, b) => Math.abs(me.raw[b.key]) - Math.abs(me.raw[a.key]));
  const traits = ranked.slice(0, 2).map((ax) => {
    const r = me.axes.find((a) => a.key === ax.key)!;
    return traitText(r.pole, r.intensity);
  });
  const scenes = ranked.slice(0, 3).map((ax, i) => {
    const list = SCENES[me.poles[ax.key]];
    return list[(x.seed >> (i * 2)) % list.length];
  });

  const decisive = mostDecisive(SELF_QUESTIONS, input.self);
  const quote = decisive
    ? {
        question: decisive.q.text,
        answer: decisive.answer,
        reading: QUOTE_READING[decisive.q.id][decisive.value > 3 ? "agree" : "disagree"],
      }
    : null;

  const a = pair(x.me, x.partner, "attach");
  const f = pair(x.me, x.partner, "conflict");

  return {
    myType: typeInfo(me.code),
    partnerType: typeInfo(x.partner.code),
    axes: me.axes,
    reliability: reliability(SELF_QUESTIONS, input.self),
    saju: x.mySaju?.summary ?? null,
    partnerDayMaster: x.partnerSaju ? dayMasterLabel(x.partnerSaju.dm) : null,
    personal: {
      dayMasterReading: x.mySaju
        ? `${names.me}님의 일간은 ${dayMasterLabel(x.mySaju.dm)}, '${x.mySaju.summary.dayMaster.image}'의 기운이에요. ${DAY_MASTER_READING[x.mySaju.dm.stem]}`
        : null,
      signature: TYPES[me.code].signature,
      traits,
      quote,
      scenes,
    },
    matchScore: x.score,
    coupleTitle: coupleTitle(x),
    teaserSummary: `${P.PAIR_SHORT[a](names)} ${P.PAIR_SHORT[f](names)}`,
    overallHeadline: overallHeadline(x.score),
  };
}

// ───────────── Paid report ─────────────

function sajuParagraph(x: Analysis): string {
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

/** level "share" → only the hidden-mind section; "full" → everything. */
export function buildReport(input: QuestionnaireInput, level: "share" | "full"): Partial<FullReport> {
  const x = analyze(input);
  const { names, me, partner } = x;
  const n = names;
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

  const hiddenMind: ReportSection = {
    title: "상대방이 말하지 않는 진짜 속마음 & 섭섭한 점",
    headline: `${TYPES[partner.code].emoji} ${n.p}님은 '${TYPES[partner.code].name}' 유형이에요`,
    body: [
      P.PARTNER_HIDDEN[partner.poles[partnerRanked[0].key]](n),
      P.PARTNER_HIDDEN[partner.poles[partnerRanked[1].key]](n),
      hurt,
    ].join(" "),
    bullets: [
      `🙊 속으로 하고 싶은 말: ${P.WANT_TO_SAY[topPole]}`,
      `😢 섭섭 포인트: ${shortHurt(mismatch?.key)}`,
      `💌 듣고 싶은 말: ${P.WANT_TO_HEAR[topPole]}`,
    ],
  };
  if (level === "share") return { hiddenMind };

  const subScores = (Object.keys(x.sub) as (keyof typeof x.sub)[]).map((k) => ({ label: SUB_LABEL[k], score: x.sub[k] }));
  const sortedSub = (Object.keys(x.sub) as (keyof typeof x.sub)[]).sort((p, q) => x.sub[q] - x.sub[p]);

  const overall: ReportSection = {
    title: "종합 궁합 & 연애 스타일",
    headline: overallHeadline(x.score),
    body: [P.STATUS_OPENER[input.status], sajuParagraph(x), P.PAIR[g](n), P.PAIR[e](n)].filter(Boolean).join(" "),
    bullets: [
      WEAPON[sortedSub[0]],
      WEAKNESS[sortedSub[sortedSub.length - 1]],
      `🔑 관계의 열쇠: ${me.poles.conflict === "F" ? "말의 내용보다 말할 타이밍을 고르는 것" : "거리를 둘 때 '돌아올게' 한마디 남기는 것"}`,
    ],
  };

  const expressKey = mixKey(e, "EE", "HH", "MIX");
  const attachKey = mixKey(a, "AA", "SS", "MIX");
  const conflictKey = mixKey(f, "FF", "RR", "MIX");
  const myLuck = x.mySaju ? P.ELEMENT_LUCK[x.mySaju.summary.lacking] : P.ELEMENT_LUCK.water;

  const chemistry: ReportSection = {
    title: "스킨십 / 속궁합 & 멘탈 케미 폭발 지점",
    headline:
      x.sub.attraction >= 85
        ? `끌림 케미 ${x.sub.attraction}점, 눈만 마주쳐도 공기가 달라지는 사이 ✨`
        : `끌림 케미 ${x.sub.attraction}점, 분위기를 만들면 확 타오르는 사이 🔥`,
    body: `${P.MOOD_BY_EXPRESS[expressKey]} ${P.TIMING_BY_ATTACH[attachKey]}`,
    bullets: [`🕯️ 최고의 무드: ${myLuck.place}`, P.INTIMACY_SWITCH[partner.poles.express as "E" | "H"], P.MENTAL_SPARK[conflictKey]],
  };

  const concern = P.CONCERN_ADVICE[input.concern];
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
  const luck: FullReport["luck"] = {
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
    actionItems: [myLuck.action, P.SELF_ACTION[me.poles[[...AXES].sort((p, q) => Math.abs(me.raw[q.key]) - Math.abs(me.raw[p.key]))[0].key]], concernAction(input.concern)],
  };

  return { subScores, overall, hiddenMind, chemistry, crisis, luck };
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

function concernAction(c: QuestionnaireInput["concern"]): string {
  return {
    contact: "📱 연락 규칙 딱 하나만 같이 정하기",
    uncertainty: "❓ 추측 대신 가볍게 한 번 물어보기",
    conflict: "🔁 다음 싸움 전에 '타임아웃 규칙' 미리 합의하기",
    boredom: "🎟️ 둘 다 처음 가 보는 곳으로 데이트 잡기",
    future: "🧭 '올해 안에 같이 할 것 3가지' 적어 보기",
    reunion: "🌧️ 연락하기 전에 일주일 동안 나를 위한 일 하나씩 하기",
  }[c];
}

