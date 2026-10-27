import "server-only";
import { PARTNER_INTERVIEW, SOLO_INTERVIEW, COUPLE_INTERVIEW, CUSTOM_MAX, customText, isCustom } from "@/lib/interview";
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
  if (!isCustom(a)) {
    const o = d.options[a];
    return o ? { oid: a, label: q?.options.find((x) => x.id === a)?.label ?? "", w: o.w, read: o.read, custom: false } : null;
  }
  const text = customText(a);
  const partner = qid.startsWith("o");
  const tw = textWeights(text);
  const quote = quoteOf(text);

  // The color question maps color words straight to an element.
  let oid: string | null = null;
  if (d.options.wood) {
    oid = COLORS.find(([re]) => re.test(text))?.[1] ?? Object.keys(d.options)[[...text].reduce((h, ch) => h + ch.charCodeAt(0), 0) % 5];
  } else {
    let best = 0.45;
    for (const [id, o] of Object.entries(d.options)) {
      const label = q?.options.find((x) => x.id === id)?.label ?? "";
      const hits = labelTokens(label).filter((t) => text.includes(t)).length;
      const score = hits * 0.6 + cosine(tw, o.w);
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
      read: `${quote} 보기엔 없던 답인데, 냥신 눈엔 '${plain}' 쪽 마음이 보인다냥. ${rest}`,
      custom: true,
    };
  }

  const traits = (Object.entries(tw) as [Trait, number][]).filter(([, v]) => v).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  const lines = traits.slice(0, 2).map(([k, v]) => TRAIT_LINE[k][v > 0 ? 0 : 1]).filter(Boolean);
  const fallback = partner
    ? "보기에 없는 모습이라니, {p:은/는} 쉽게 한 유형으로 묶이지 않는 사람이다냥. 그래서 너도 {p:을/를} 다 안다고 생각한 순간 새로운 모습에 놀란다냥."
    : "보기에 없는 답을 고른 것부터가 너답다냥. 남이 정해 둔 틀보다 네 방식이 먼저인 사람이다냥. 그래서 연애에서도 '보통은 이렇게 하잖아'라는 말을 제일 싫어한다냥.";
  return { oid: null, label: `✏️ ${text}`, w: tw, read: `${quote} ${lines.length ? lines.join(" ") : fallback}`, custom: true };
}
