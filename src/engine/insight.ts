import "server-only";
import { fill, optionOf, type InterviewQuestion } from "@/lib/interview";
import type { AxisKey, ElementKey, Tell } from "@/models/types";
import { COMBO_CONTRAST_TAIL, COMBO_SAME, TRAIT_FACE } from "./content/combo";
import type { Decoded, Trait, Weights } from "./content/decode";
import * as T from "./content/insight";
import { resolve, type Resolved } from "./freeText";
import { josa } from "@/lib/josa";
import { core, punch } from "./tone";
import { AXES as PROFILE_AXES, hiddenPct, type Profile } from "./profile";

// Readings that depend on the whole person, not just one answer: every decoded answer is tied to the
// person's other answers, their overall leaning, and their MBTI or day master, so the same choice reads
// differently for different people. "잘 모르겠어" is filled in from the rest of the answers.

export interface Person {
  profile: Profile;
  mbti: string;
  dm: { label: string; element: ElementKey } | null;
}

export interface AnswerSet {
  qs: InterviewQuestion[];
  decode: Record<string, Decoded>;
  answers: Record<string, string>;
  person: Person;
  /** observations about the partner (not the user's own answers) */
  aboutPartner: boolean;
  couple: boolean;
  /** partner name for {p} */
  p: string;
}

interface Item {
  qid: string;
  num: number;
  label: string;
  r: Resolved;
  unknown: boolean;
  /** the answer's weights; for 잘 모르겠어, the predicted choice's */
  w: Weights;
  predicted?: { label: string; read: string };
}

const AXES: AxisKey[] = ["drive", "express", "conflict", "attach"];
const COLOR_Q = "s6";
const plain = (label: string) => label.replace(/^\S+\s/, "").replace(/["']/g, "");
const restOf = (read: string) => read.replace(/^.*?지\.\s*/, "");
/** "'가끔 꺼내 본다'라고" / "'우리 사진'이라고" */
const saidAs = (label: string) => {
  const last = label.match(/[가-힣]/g)?.at(-1);
  const batchim = last && /[가-힣]$/.test(label) ? (last.charCodeAt(0) - 0xac00) % 28 !== 0 : false;
  return `'${label}'${batchim ? "이라고" : "라고"}`;
};
/** "'편한 자리'였지" / "'우리 사진'이었지" */
const was = (label: string) => {
  const last = label.match(/[가-힣]/g)?.at(-1);
  const batchim = last && /[가-힣]$/.test(label) ? (last.charCodeAt(0) - 0xac00) % 28 !== 0 : false;
  return `'${label}'${batchim ? "이었지" : "였지"}`;
};
const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const pick = <X,>(list: X[], i: number) => list[((i % list.length) + list.length) % list.length];
const sub = (s: string, vars: Record<string, string>) => s.replace(/\{(face|overall|expected|mbti|short|dm|label|read)\}/g, (_, k) => vars[k] ?? "");

/** The person as a vector over all traits (axes in −2..2, hidden gauges rescaled to the same range). */
function personVector(person: Person): Record<Trait, number> {
  const pr = person.profile;
  const h = (k: "linger" | "jealous" | "doubt") => (hiddenPct(pr.hidden[k]) - 50) / 25;
  return { ...pr.raw, linger: h("linger"), jealous: h("jealous"), doubt: h("doubt") };
}

function dominant(w: Weights): [Trait, number] | null {
  const top = (Object.entries(w) as [Trait, number][]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
  return top && Math.abs(top[1]) >= 0.5 ? top : null;
}

/** The choice whose weights point most the way the person does. */
function predict(set: AnswerSet, qid: string): { oid: string; label: string; read: string; w: Weights } | null {
  const v = personVector(set.person);
  let best: { oid: string; score: number } | null = null;
  for (const [oid, o] of Object.entries(set.decode[qid].options)) {
    const norm = Math.sqrt(Object.values(o.w).reduce((s, x) => s + (x ?? 0) ** 2, 0));
    if (!norm) continue;
    const score = (Object.entries(o.w) as [Trait, number][]).reduce((s, [t, x]) => s + v[t] * x, 0) / norm;
    if (!best || score > best.score) best = { oid, score };
  }
  if (!best) return null;
  const o = set.decode[qid].options[best.oid];
  return { oid: best.oid, label: optionOf(set.qs, qid, best.oid)?.label ?? "", read: o.read, w: o.w };
}

function items(set: AnswerSet): Item[] {
  return set.qs.flatMap((q, i) => {
    const r = resolve(set.decode[q.id], q.id, set.answers[q.id]);
    if (!r) return [];
    const unknown = Boolean(r.unknown);
    // 잘 모르겠어 → read the likely choice; typed text with nothing to go on → borrow that choice's lean.
    const guess = unknown || r.unread ? predict(set, q.id) : null;
    return [
      {
        qid: q.id,
        num: i + 1,
        label: plain(fill(r.label, set.p)),
        r,
        unknown,
        w: guess ? guess.w : r.w,
        predicted: guess ? { label: plain(fill(guess.label, set.p)), read: restOf(guess.read) } : undefined,
      },
    ];
  });
}

/** How MBTI letters / a day-master element usually lean on a trait (positive = first pole). */
const MBTI_VOTES: Record<string, Partial<Record<Trait, number>>> = {
  E: { express: 1, drive: 1 },
  I: { express: -1, drive: -1 },
  N: { linger: 0.5, doubt: 0.5 },
  S: { linger: -0.5 },
  T: { conflict: 1, attach: -0.5, express: -0.5 },
  F: { attach: 1, express: 0.5, conflict: -0.5, doubt: 0.5 },
  J: { drive: 0.5, conflict: 0.5 },
  P: { drive: -0.5, attach: -0.5 },
};
const ELEMENT_VOTES: Record<ElementKey, Partial<Record<Trait, number>>> = {
  wood: { drive: 1, conflict: 0.5 },
  fire: { express: 1, drive: 0.5 },
  earth: { attach: -0.5, conflict: -0.5 },
  metal: { conflict: 1, express: -0.5 },
  water: { express: -1, doubt: 0.5, linger: 0.5 },
};
const mbtiLean = (mbti: string, t: Trait) => [...mbti].reduce((s, l) => s + (MBTI_VOTES[l]?.[t] ?? 0), 0);
const elementLean = (el: ElementKey, t: Trait) => ELEMENT_VOTES[el][t] ?? 0;

function overallSign(person: Person, t: Trait): number {
  if ((AXES as Trait[]).includes(t)) {
    const raw = person.profile.raw[t as AxisKey];
    return Math.abs(raw) >= 0.35 ? sign(raw) : 0;
  }
  const pct = hiddenPct(person.profile.hidden[t as "linger" | "jealous" | "doubt"]);
  return pct >= 66 ? 1 : pct <= 35 ? -1 : 0;
}

const face = (t: Trait, s: number) => TRAIT_FACE[t][s > 0 ? 0 : 1];

/** This answer next to another answer with a strong lean on the same trait. */
function crossLine(set: AnswerSet, it: Item, all: Item[], t: Trait, s: number): string | null {
  const other = all
    .filter((o) => o.qid !== it.qid && !o.unknown && !o.r.unread && o.qid !== COLOR_Q && Math.abs(o.w[t] ?? 0) >= 0.5)
    .sort((a, b) => Math.abs(b.w[t] ?? 0) - Math.abs(a.w[t] ?? 0))[0];
  if (!other) return null;
  const same = sign(other.w[t] ?? 0) === s;
  const head = same ? `Q${other.num} '${other.label}'도 같은 뿌리다냥.` : `근데 Q${other.num}에선 ${was(other.label)}.`;
  if (set.aboutPartner) {
    if (!(AXES as Trait[]).includes(t)) return null;
    const table = same ? T.PARTNER_ROOT : T.PARTNER_SPLIT;
    return `${head} ${table[t as AxisKey][s > 0 ? 0 : 1]}`;
  }
  // Couple mode says what the lean means for the partner; solo says what it means for you.
  const body = same && set.couple ? T.COUPLE_TAIL[t][s > 0 ? 0 : 1] : punch((same ? T.ROOT : T.SPLIT)[t][s > 0 ? 0 : 1], 1);
  return `${head} ${body}`;
}

function profileLine(set: AnswerSet, it: Item, t: Trait, s: number): string | null {
  const o = overallSign(set.person, t);
  if (!o) return null;
  if (o === s) return sub(pick(T.CONSISTENT, it.num), { face: face(t, s) });
  const line = sub(pick(T.INCONSISTENT, it.num), { face: face(t, s), overall: face(t, o) });
  return set.couple ? `${line} ${T.INCONSISTENT_COUPLE}` : line;
}

function typeLine(set: AnswerSet, it: Item, t: Trait, s: number, short: (m: string) => string): string | null {
  const { mbti, dm } = set.person;
  if (mbti) {
    const lean = mbtiLean(mbti, t);
    if (Math.abs(lean) < 0.5) return null;
    const aligned = sign(lean) === s;
    return sub(pick(aligned ? T.MBTI_ALIGNED : T.MBTI_OPPOSITE, it.num), { mbti, short: short(mbti), face: face(t, s), expected: face(t, sign(lean)) });
  }
  if (dm) {
    const lean = elementLean(dm.element, t);
    if (Math.abs(lean) < 0.5) return null;
    const aligned = sign(lean) === s;
    return sub(pick(aligned ? T.SAJU_ALIGNED : T.SAJU_OPPOSITE, it.num), { dm: dm.label, face: face(t, s), expected: face(t, sign(lean)) });
  }
  return null;
}

/** The decoded reading for one answer, tied to the rest of the person. */
function enriched(set: AnswerSet, it: Item, all: Item[], short: (m: string) => string): string {
  // The answer itself is shown right above, so skip the echo and keep the reading to its core.
  const parts = [core(it.r.read, 2)];
  if (it.predicted && it.unknown) {
    parts.push(sub(set.aboutPartner ? T.PREDICT_PARTNER : T.PREDICT, { label: it.predicted.label, read: punch(it.predicted.read, 1) }));
  } else if (it.predicted) {
    parts.push(sub(set.aboutPartner ? T.BRIDGE_PARTNER : T.BRIDGE, { label: it.predicted.label }));
  }
  const dom = dominant(it.w);
  if (dom && it.qid !== COLOR_Q) {
    const [t, v] = dom;
    const s = sign(v);
    const cross = crossLine(set, it, all, t, s);
    const prof = set.aboutPartner ? null : profileLine(set, it, t, s);
    const type = set.aboutPartner ? null : typeLine(set, it, t, s, short);
    // Rotate which context line each question gets, so a long report doesn't repeat one pattern.
    const order = [
      [cross, prof, type],
      [cross, type, prof],
      [prof, type, cross],
    ][it.num % 3];
    parts.push(...order.filter((x): x is string => Boolean(x)).slice(0, 1));
  }
  return fill(parts.join(" "), set.p);
}

export function decodeTells(set: AnswerSet, short: (m: string) => string): Map<string, Tell> {
  const all = items(set);
  return new Map(
    all.map((it) => {
      const q = set.qs.find((x) => x.id === it.qid)!;
      return [
        it.qid,
        {
          question: fill(q.short, set.p),
          answer: fill(it.r.label || (optionOf(set.qs, it.qid, set.answers[it.qid])?.label ?? ""), set.p),
          why: fill(punch(set.decode[it.qid].why, 1), set.p),
          read: enriched(set, it, all, short),
        },
      ];
    }),
  );
}

export function decodeBullets(set: AnswerSet, short: (m: string) => string): string[] {
  const tells = decodeTells(set, short);
  return set.qs.flatMap((q, i) => {
    const t = tells.get(q.id);
    return t ? [`Q${i + 1}. ${t.question}\n→ ${t.answer}\n💭 ${t.why}\n🔮 ${t.read}`] : [];
  });
}

// ───────────── 답변 조합 ─────────────

const strongest = (set: AnswerSet, n: number) =>
  items(set)
    .filter((it) => !it.unknown && it.qid !== COLOR_Q && dominant(it.r.w))
    .sort((a, b) => weightOf(b.r.w) - weightOf(a.r.w))
    .slice(0, n);
const weightOf = (w: Weights) => Object.values(w).reduce((s, v) => s + Math.abs(v ?? 0), 0) + (Object.keys(w).some((k) => ["linger", "jealous", "doubt"].includes(k)) ? 1 : 0);

/** The user's own answers read in pairs. Couple mode uses its own sentences about the partner. */
export function selfCombos(set: AnswerSet, max = 3): string[] {
  const top = strongest(set, 4);
  const pairs: [number, number][] = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [0, 3]];
  const used = new Set<string>();
  const out: string[] = [];
  for (const [i, j] of pairs) {
    const a = top[i], b = top[j];
    if (!a || !b || out.length >= max) continue;
    const traits = [...new Set([...Object.keys(a.w), ...Object.keys(b.w)])] as Trait[];
    const shared = traits
      .map((t) => ({ t, va: a.w[t] ?? 0, vb: b.w[t] ?? 0 }))
      .filter((x) => x.va * x.vb > 0 && Math.min(Math.abs(x.va), Math.abs(x.vb)) >= 0.5)
      .sort((x, y) => Math.min(Math.abs(y.va), Math.abs(y.vb)) - Math.min(Math.abs(x.va), Math.abs(x.vb)))[0];
    let key: string;
    let line: string;
    if (shared) {
      key = `same-${shared.t}-${shared.va > 0}`;
      line = (set.couple ? T.COMBO_SAME_COUPLE : COMBO_SAME)[shared.t][shared.va > 0 ? 0 : 1];
    } else {
      const da = dominant(a.w);
      const db = (Object.entries(b.w) as [Trait, number][]).filter(([t]) => t !== da?.[0]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))[0];
      if (!da || !db) continue;
      key = `face-${da[0]}-${db[0]}`;
      const tail = set.couple ? pick(T.COMBO_CONTRAST_COUPLE, i + j) : pick(COMBO_CONTRAST_TAIL, i + j);
      line = `겉으로는 ${face(da[0], da[1])}, 속으로는 ${face(db[0], db[1])}이다냥. ${tail}`;
    }
    if (used.has(key)) continue;
    used.add(key);
    out.push(fill(`🔗 '${a.label}' + '${b.label}'\n${line}`, set.p));
  }
  return out;
}

/** Two observations of the partner leaning the same way on an axis. */
export function partnerCombos(set: AnswerSet, max = 2): string[] {
  const all = items(set).filter((it) => !it.unknown);
  const out: string[] = [];
  for (const axis of AXES) {
    const lean = (s: number) => all.filter((it) => sign(it.r.w[axis] ?? 0) === s && Math.abs(it.r.w[axis] ?? 0) >= 1);
    for (const s of [1, -1]) {
      const [a, b] = lean(s).sort((x, y) => Math.abs(y.r.w[axis] ?? 0) - Math.abs(x.r.w[axis] ?? 0));
      if (a && b && out.length < max) out.push(fill(`🔗 {p}: '${a.label}' + '${b.label}'\n${T.PARTNER_COMBO[axis][s > 0 ? 0 : 1]}`, set.p));
    }
  }
  return out;
}

/** My answer × the partner's answer on the same axis — the couple's actual dynamic. */
export function crossCombos(me: AnswerSet, partner: AnswerSet, max = 3): string[] {
  const mine = items(me).filter((it) => !it.unknown);
  const theirs = items(partner).filter((it) => !it.unknown);
  const strongestOn = (list: Item[], axis: AxisKey) =>
    list.filter((it) => Math.abs(it.r.w[axis] ?? 0) >= 0.5).sort((a, b) => Math.abs(b.r.w[axis] ?? 0) - Math.abs(a.r.w[axis] ?? 0))[0];
  return AXES.map((axis) => ({ axis, a: strongestOn(mine, axis), b: strongestOn(theirs, axis) }))
    .filter((x) => x.a && x.b)
    .map((x) => ({ ...x, score: Math.abs(x.a!.r.w[x.axis] ?? 0) + Math.abs(x.b!.r.w[x.axis] ?? 0) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, max)
    .map(({ axis, a, b }) => {
      const sa = sign(a!.r.w[axis] ?? 0);
      const sb = sign(b!.r.w[axis] ?? 0);
      const idx = sa > 0 && sb > 0 ? 0 : sa < 0 && sb < 0 ? 1 : sa > 0 ? 2 : 3;
      return fill(`🔗 너: '${a!.label}' × {p}: '${b!.label}'\n${T.CROSS[axis][idx]}`, me.p);
    });
}

/**
 * Why each axis came out the way it did: the answers that pushed hardest toward the final pole, and the
 * strongest one that pulled the other way. Ties the card to this exact answer combination.
 */
export function traitEvidence(set: AnswerSet): Record<AxisKey, string> {
  const list = items(set).filter((it) => !it.unknown && !it.r.unread);
  const mbti = set.person.mbti.toUpperCase();
  const q = (it: Item) => `'${it.label}'`;
  const out = {} as Record<AxisKey, string>;
  const seed = [...JSON.stringify(set.answers)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  // Same branch → next phrasing; an answer already quoted for another axis yields to a fresh one.
  const used = new Map<string, number>();
  const cited = new Set<string>();
  const fresh = (it: Item) => (cited.has(it.qid) ? 0.6 : 0);
  for (const ax of PROFILE_AXES) {
    const dir = set.person.profile.raw[ax.key] > 0 ? 1 : -1;
    const [mine, other] = dir > 0 ? ax.labels : [ax.labels[1], ax.labels[0]];
    const pushes = list.map((it) => {
      const vals = Object.values(set.decode[it.qid].options).map((o) => o.w[ax.key] ?? 0);
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      return { it, p: ((it.r.w[ax.key] ?? 0) - mean) * dir };
    });
    const pro = pushes.filter((x) => x.p >= 0.4).sort((a, b) => b.p - fresh(b.it) - (a.p - fresh(a.it))).map((x) => x.it);
    const con = pushes.filter((x) => x.p <= -0.4).sort((a, b) => a.p + fresh(a.it) - (b.p + fresh(b.it))).map((x) => x.it);
    const [a, b] = pro;
    const c = con[0];
    const mbtiPush = [...mbti].reduce((s, l) => s + (MBTI_PRIOR_SIGN[l]?.[ax.key] ?? 0), 0) * dir > 0;
    const A = a && q(a), B = b && q(b), C = c && q(c);
    const variants: string[] =
      a && b && !c
        ? [
            `결정타는 ${josa(A!, "이랑/랑")} ${B}. 반대 신호 없다냥. 빼박 ${mine}이다냥.`,
            `${A}에서 이미 끝났다냥. ${B}로 확인 사살. ${mine}이다냥.`,
            `${A}, ${B}. 두 답이 같은 데를 찌른다냥. 흔들림 없는 ${mine}이다냥.`,
          ]
        : a && b && c
          ? [
              `${A}, ${B}에서 ${mine}. 근데 ${C}에선 ${other}이 나왔다냥. 상황 따라 얼굴이 바뀐다냥.`,
              `${mine}이다냥. 근거는 ${A}, ${B}. 단, ${C}에선 ${other}이다냥. 불안하면 그쪽으로 돌아선다냥.`,
              `${A}, ${B} 보면 ${mine}. ${josa(C!, "이/가")} 숨은 ${other} 얼굴이다냥. 좋아할수록 그 얼굴이 나온다냥.`,
            ]
          : a && c
            ? [
                `${josa(A!, "은/는")} ${mine}, ${josa(C!, "은/는")} ${other}. 반반인데 ${mine}이 살짝 이긴다냥.`,
                `${A}에서 ${mine}, ${C}에서 ${other}. 너 안에 둘 다 있다냥. 지금은 ${mine}이다냥.`,
              ]
            : a
              ? [
                  `결정타는 ${A} 하나다냥. 나머지는 애매했다냥. 상대 따라 바뀔 수 있다냥.`,
                  `${A}에서 ${mine}이 튀어나왔다냥. 딱 그 상황이 오면 본모습이 나온다냥.`,
                ]
              : c
                ? [
                    `${josa(C!, "은/는")} ${other} 쪽인데, 작은 답들이 모여 ${mine}이다냥. 겉보다 속이 ${mine}이다냥.`,
                    `${C}만 보면 ${other}. 근데 나머지가 ${mine}을 가리킨다냥. 티 안 나는 ${mine}이다냥.`,
                  ]
                : mbtiPush
                  ? [`답은 반반이었다냥. ${mbti} 기질이 ${mine} 쪽으로 밀었다냥.`]
                  : [`답은 딱 반반이다냥. ${mine}은 살짝이고, 상대 따라 ${other}도 된다냥.`];
    const branch = `${a ? 1 : 0}${b ? 1 : 0}${c ? 1 : 0}`;
    const n = used.get(branch) ?? 0;
    used.set(branch, n + 1);
    [a, b, c].forEach((it) => it && cited.add(it.qid));
    out[ax.key] = fill(pick(variants, seed + n), set.p);
  }
  return out;
}

/** Direction of the MBTI tie-breaker in profile.ts (sign only). */
const MBTI_PRIOR_SIGN: Record<string, Partial<Record<AxisKey, number>>> = {
  E: { drive: 1, express: 1 },
  I: { drive: -1, express: -1 },
  T: { conflict: 1, attach: -1 },
  F: { conflict: -1, attach: 1, express: 1 },
  J: { drive: 1, conflict: 1 },
  P: { drive: -1, attach: -1 },
};
