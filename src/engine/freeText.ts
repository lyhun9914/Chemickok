import "server-only";
import { PARTNER_INTERVIEW, SOLO_INTERVIEW, COUPLE_INTERVIEW, CUSTOM_MAX, UNKNOWN_ANSWER, UNKNOWN_LABEL, customText, isCustom } from "@/lib/interview";
import { OPTION_KEYWORDS, UNKNOWN } from "./content/customKeywords";
import type { Decoded, Trait, Weights } from "./content/decode";

// Typed-in answers are read without AI: a keyword lexicon turns the text into trait weights, the text is matched to
// the closest answer choice (shared words + weight similarity), and 냥신 quotes the text back with that choice's reading.

const LEXICON: [RegExp, Weights][] = [
  [/먼저|직접|바로|다가가|고백|들이대|연락한다|연락해|불러/, { drive: 1 }],
  [/기다|상대가 먼저|올 때까지|가만히|지켜보|눈치 ?보/, { drive: -1 }],
  [/티 ?내|표현|말한다|말해|웃|애교|좋아한다|사랑|보고 ?싶|울어|운다|울었/, { express: 1 }],
  [/티 ?안|숨기|숨겨|아무렇지|괜찮은 척|모른 척|속으로|삭|참는|참아|참았/, { express: -1 }],
  [/따지|따져|물어|묻는|얘기한다|대화|풀어|풀려|해결|전화/, { conflict: 1 }],
  [/피하|피해|잠수|자버|잔다|무시|넘어가|그냥 둔|시간을 ?(갖|두|준)|거리를/, { conflict: -1 }],
  [/불안|걱정|확인|답장|카톡|서운|외로|집착|매달/, { attach: 1 }],
  [/신경 ?안|상관없|상관 ?없|괜찮|쿨|자유|혼자가 편|각자|믿는|믿어|내 할 일/, { attach: -1 }],
  [/질투|스토리|팔로|인스타|검색|누구야|여사친|남사친|이성|의심|뒤져|훔쳐/, { jealous: 1.5 }],
  [/전 ?연인|전 ?남친|전 ?여친|옛|예전|미련|못 잊|그립|그리워|추억|그때/, { linger: 1.5 }],
  [/내 탓|나 때문|자신 ?없|부족|못나|싫어할까|버림|버려|미움|무서|두려|자존감/, { doubt: 1.5 }],
];

const COLORS: [RegExp, string][] = [
  [/초록|녹색|연두|민트|올리브|카키|풀색/, "wood"],
  [/빨|분홍|핑크|주황|보라|자주|와인|레드|퍼플/, "fire"],
  [/노랑|노란|베이지|갈색|브라운|황토|금색|골드|크림|살구/, "earth"],
  [/흰|하얀|화이트|회색|그레이|은색|실버|아이보리/, "metal"],
  [/검|블랙|파랑|파란|남색|하늘|네이비|블루|청색/, "water"],
];

const TRAIT_LINE: Record<Trait, [string, string]> = {
  drive: ["그 말엔 기다리기보다 먼저 움직이고 싶은 마음이 보인다냥.", "그 말엔 먼저 나서기보다 상대를 지켜보고 싶은 마음이 보인다냥."],
  express: ["감정을 숨기는 것보다 드러내는 게 편한 사람이다냥.", "진짜 마음은 한 겹 안쪽에 접어 두는 사람이다냥."],
  conflict: ["애매한 채로 두는 걸 못 견디는 사람이다냥.", "부딪히기보다 한 발 물러나 감정을 식히는 사람이다냥."],
  attach: ["그 안에 '확인받고 싶은 마음'이 조용히 묻어 있다냥.", "관계에 휘둘리지 않고 네 중심을 지키는 사람이다냥."],
  jealous: ["말은 안 해도 신경 쓰이는 게 많다냥. 혼자 확인하고 혼자 삭이는 질투가 숨어 있다냥.", ""],
  linger: ["지나간 무언가가 아직 마음 한쪽에 접혀 있다냥.", ""],
  doubt: ["사랑받는 순간에도 '내가 괜찮은가'를 먼저 묻는 마음이 보인다냥.", ""],
};

const ALL_QS = [...SOLO_INTERVIEW, ...COUPLE_INTERVIEW, ...PARTNER_INTERVIEW];
const STOP = new Set(["한다", "있다", "없다", "그냥", "아니면", "보통", "내가", "나도", "같은", "때는"]);

function textWeights(text: string): Weights {
  const w: Weights = {};
  for (const [re, add] of LEXICON) {
    if (!re.test(text)) continue;
    for (const [k, v] of Object.entries(add)) w[k as Trait] = (w[k as Trait] ?? 0) + (v ?? 0);
  }
  return w;
}

function cosine(a: Weights, b: Weights): number {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<Trait>;
  let dot = 0, na = 0, nb = 0;
  for (const k of keys) {
    const x = a[k] ?? 0, y = b[k] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const JOSA = /[이가을를은는도에의로]$/;
const SHORT_STOP = new Set(["안", "잘", "더", "다", "나", "너", "그", "좀", "못"]);

/** "💤 꿈이 잘 기억 안 난다" → ["꿈", "기억", "난다"]: label words with a trailing particle dropped. */
const labelTokens = (label: string) =>
  label
    .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length >= 2 && JOSA.test(t) ? t.slice(0, -1) : t))
    .filter((t) => t.length >= 2 || (t.length === 1 && /[가-힣]/.test(t) && !SHORT_STOP.has(t)));

/** "구경" → "'구경'이라고 했지.", "확인함" → "'확인함'이라고", "ㅋㅋ" → "'ㅋㅋ'라고" */
function quoteOf(text: string): string {
  const last = text.match(/[가-힣]/g)?.at(-1);
  const batchim = last ? (last.charCodeAt(0) - 0xac00) % 28 !== 0 : false;
  return `'${text}'${batchim && /[가-힣]$/.test(text) ? "이라고" : "라고"} 했지.`;
}

export interface Resolved {
  /** the matched answer choice, if any */
  oid: string | null;
  label: string;
  w: Weights;
  read: string;
  custom: boolean;
}

export function isValidAnswer(d: Decoded, a: unknown): boolean {
  if (typeof a !== "string") return false;
  if (a === UNKNOWN_ANSWER) return true;
  if (isCustom(a)) {
    const t = customText(a).trim();
    return t.length > 0 && t.length <= CUSTOM_MAX;
  }
  return Boolean(d.options[a]);
}

export function normalizeAnswer(a: string): string {
  return isCustom(a) ? `=${customText(a).replace(/\s+/g, " ").trim().slice(0, CUSTOM_MAX)}` : a;
}

/** Turns a stored answer (option id or typed text) into weights + a reading. Reads may contain {p} tokens. */
export function resolve(d: Decoded, qid: string, a: string | undefined): Resolved | null {
  if (!a) return null;
  const q = ALL_QS.find((x) => x.id === qid);
  const partner = qid.startsWith("o");
  if (a === UNKNOWN_ANSWER) {
    return { oid: null, label: UNKNOWN_LABEL, w: {}, read: `'잘 모르겠다'고 했지. ${unknownRead(d, partner, qid)}`, custom: false };
  }
  if (!isCustom(a)) {
    const o = d.options[a];
    return o ? { oid: a, label: q?.options.find((x) => x.id === a)?.label ?? "", w: o.w, read: o.read, custom: false } : null;
  }
  const text = customText(a);
  const tw = textWeights(text);
  const quote = quoteOf(text);
  const pick = <T,>(list: T[]) => list[[...text].reduce((h, ch) => h + ch.charCodeAt(0), 0) % list.length];

  if (UNKNOWN.test(text)) {
    return { oid: null, label: `✏️ ${text}`, w: {}, read: `${quote} ${unknownRead(d, partner, qid)}`, custom: true };
  }

  // The color question maps color words straight to an element.
  let oid: string | null = null;
  if (d.options.wood) {
    oid = COLORS.find(([re]) => re.test(text))?.[1] ?? Object.keys(d.options)[[...text].reduce((h, ch) => h + ch.charCodeAt(0), 0) % 5];
  } else {
    let best = 0.45;
    for (const [id, o] of Object.entries(d.options)) {
      const label = q?.options.find((x) => x.id === id)?.label ?? "";
      const hits = labelTokens(label).filter((t) => text.includes(t)).length;
      const kw = OPTION_KEYWORDS[qid]?.[id]?.test(text) ? 1.2 : 0;
      const score = kw + hits * 0.6 + cosine(tw, o.w);
      if (score > best) {
        best = score;
        oid = id;
      }
    }
  }

  if (oid) {
    const o = d.options[oid];
    const label = q?.options.find((x) => x.id === oid)?.label ?? "";
    const w: Weights = {};
    for (const [k, v] of [...Object.entries(o.w).map(([k, v]) => [k, (v ?? 0) * 0.7] as const), ...Object.entries(tw).map(([k, v]) => [k, (v ?? 0) * 0.6] as const)]) {
      w[k as Trait] = (w[k as Trait] ?? 0) + v;
    }
    const rest = o.read.replace(/^.*?지\.\s*/, "");
    const plain = label.replace(/^\S+\s/, "").replaceAll('"', "");
    return {
      oid,
      label: `✏️ ${text}`,
      w,
      read: `${quote} 보기엔 없던 답인데, 냥신 눈엔 '${plain}' 쪽 마음이 보인다냥. ${rest}${toneOf(text, partner).slice(0, 1).map((l) => ` ${l}`).join("")}`,
      custom: true,
    };
  }

  // No choice fits: read the words themselves — traits from the lexicon, then how it was said.
  const traits = (Object.entries(tw) as [Trait, number][]).filter(([, v]) => v).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  const traitLines = traits.slice(0, 2).map(([k, v]) => TRAIT_LINE[k][v > 0 ? 0 : 1]).filter(Boolean);
  const toneLines = toneOf(text, partner).slice(0, 2);
  const body = [...traitLines, ...toneLines];
  const read = body.length
    ? `${quote} 보기엔 없던 답이라 냥신이 따로 읽어 봤다냥. ${body.join(" ")} ${pick(partner ? CLOSE_PARTNER : CLOSE_SELF)}`
    : `${quote} ${pick(partner ? FALLBACK_PARTNER : FALLBACK_SELF)}`;
  return { oid: null, label: `✏️ ${text}`, w: tw, read, custom: true };
}

// ───────────── Readings for typed answers that match no choice ─────────────

type Test = RegExp | ((t: string) => boolean);

/** [how it was said, self reading, partner reading] */
const TONE: [Test, string, string][] = [
  [/싫|않|안 |못 /, "원하는 것보다 '싫은 것'을 먼저 말하는 건, 지키고 싶은 선이 분명하다는 뜻이다냥.", "{p:이/가} 싫어하는 걸 먼저 떠올린 건, 네가 {p}의 선을 꽤 정확히 알고 있다는 뜻이다냥."],
  [/편이|편$|스타일|타입/, "'~하는 편'이라고 말하는 건 스스로를 꽤 객관적으로 본다는 거다냥. 근데 연애할 땐 그 객관성이 제일 먼저 무너진다냥.", "{p:을/를} '~하는 편'이라고 정리할 만큼 오래 지켜봤다는 거다냥. 그만큼 {p}한테 마음을 쓰고 있다냥."],
  [/확실|절대|무조건|꼭|항상|늘/, "'확실히', '절대' 같은 말이 나오는 건 이 부분에선 타협이 없다는 뜻이다냥.", "{p:은/는} 이 부분에서만큼은 원칙이 확실한 사람이다냥. 그 원칙을 건드리면 생각보다 크게 서운해한다냥."],
  [/그냥|별로|딱히/, "'그냥'이라는 말 뒤에는 대개 꺼내기 귀찮거나 아픈 이유가 숨어 있다냥.", "'그냥'처럼 보이는 {p}의 행동에도 이유는 있다냥. {p:은/는} 그 이유를 말로 설명하는 게 서툰 사람이다냥."],
  [(t) => t.length >= 20, "이렇게 길게 설명한 걸 보니, 이건 너한테 꽤 중요한 얘기다냥.", "이렇게 자세히 아는 걸 보니, 너는 {p:을/를} 생각보다 훨씬 깊이 관찰하고 있다냥."],
  [(t) => t.length <= 4, "짧게 답한 걸 보니 고민할 필요도 없는 얘기였구냥. 그만큼 네 안에서 답이 확실하다냥.", "짧게 답할 만큼 {p}의 이 모습은 너한테 익숙하다냥. 익숙한 모습일수록 변할 때 제일 먼저 알아채야 한다냥."],
];

/** How the answer was phrased (hedges, absolutes, length…) → extra lines, so similar answers still read differently. */
function toneOf(text: string, partner: boolean): string[] {
  return TONE.filter(([re]) => (typeof re === "function" ? re(text) : re.test(text))).map(([, self, other]) => (partner ? other : self));
}

const CLOSE_SELF = [
  "이 답 하나로 네 연애 습관이 꽤 많이 보인다냥.",
  "보기에 없는 답을 고를 줄 아는 사람은 연애에서도 남들 공식대로 안 움직인다냥.",
  "냥신은 이 답을 네 점괘에 따로 표시해 뒀다냥.",
];
const CLOSE_PARTNER = [
  "보기에 없는 모습이라니, {p:은/는} 쉽게 한 유형으로 묶이지 않는 사람이다냥.",
  "이런 디테일을 기억하는 것부터가 {p}한테 마음이 크다는 증거다냥.",
  "냥신은 {p}의 이 모습을 따로 표시해 뒀다냥.",
];
const FALLBACK_SELF = [
  "보기에 없는 답을 고른 것부터가 너답다냥. 남이 정해 둔 틀보다 네 방식이 먼저인 사람이다냥. 그래서 연애에서도 '보통은 이렇게 하잖아'라는 말을 제일 싫어한다냥.",
  "보기 대신 네 말로 답했지. 정해진 답에 너를 끼워 맞추기 싫은 거다냥. 연애에서도 남들이 하는 방식보다 '우리만의 방식'을 찾는 사람이다냥.",
  "흔한 보기에 안 넘어가는구냥. 이런 사람은 상대를 고를 때도 조건표보다 '이상하게 끌리는 한 가지'를 보고 고른다냥.",
];
const FALLBACK_PARTNER = [
  "보기에 없는 모습이라니, {p:은/는} 쉽게 한 유형으로 묶이지 않는 사람이다냥. 그래서 너도 {p:을/를} 다 안다고 생각한 순간 새로운 모습에 놀란다냥.",
  "흔한 보기로는 설명이 안 되는 사람이구냥. {p:은/는} 남들 눈에 보이는 모습과 너한테만 보이는 모습이 꽤 다른 사람이다냥.",
  "{p}의 이 모습은 보기 어디에도 안 맞는다냥. 그만큼 너는 {p:을/를} 틀에 끼우지 않고 있는 그대로 보고 있다는 뜻이다냥.",
];
const UNKNOWN_SELF = [
  "다음에 비슷한 순간이 오면 네가 제일 먼저 뭘 하는지 지켜봐라냥. 거기에 네 진짜 연애 습관이 있다냥.",
  "사람은 제일 아픈 데서 제일 먼저 '글쎄'라고 한다냥. 이 질문, 혼자 있을 때 한 번만 다시 떠올려 봐라냥.",
];
const UNKNOWN_PARTNER = [
  "사람은 마음을 연 만큼만 보여 준다냥. 다음에 {p}의 이 부분을 눈여겨봐라냥. 그게 보이기 시작하면 둘 사이가 한 단계 가까워진 거다냥.",
  "한 번 가볍게 물어봐라냥. {p}의 대답보다 대답할 때 표정이 더 많은 걸 말해 준다냥.",
];

/** "모르겠다": the question's own line about what not knowing says, then a nudge to look next time. */
function unknownRead(d: Decoded, partner: boolean, qid: string): string {
  const tail = partner ? UNKNOWN_PARTNER : UNKNOWN_SELF;
  const extra = tail[[...qid].reduce((h, ch) => h + ch.charCodeAt(0), 0) % tail.length];
  return d.unknown ? `${d.unknown} ${extra}` : `모른다는 것도 답이다냥. ${extra}`;
}
