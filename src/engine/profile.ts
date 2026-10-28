import "server-only";
import type { Decoded, HiddenKey, Trait, Weights } from "./content/decode";
import { resolve } from "./freeText";
import type { AxisKey, AxisResult, Intensity, Pole } from "@/models/types";

export const AXES: { key: AxisKey; title: string; poles: [Pole, Pole]; labels: [string, string] }[] = [
  { key: "drive", title: "관계 주도성", poles: ["G", "W"], labels: ["직진형", "기다림형"] },
  { key: "express", title: "감정 표현", poles: ["E", "H"], labels: ["표현형", "절제형"] },
  { key: "conflict", title: "갈등 대처", poles: ["F", "R"], labels: ["직면형", "거리두기형"] },
  { key: "attach", title: "애착 스타일", poles: ["A", "S"], labels: ["확인형", "독립형"] },
];

export interface Profile {
  axes: AxisResult[];
  /** axis → centered score in [-2, 2]; positive = first pole */
  raw: Record<AxisKey, number>;
  poles: Record<AxisKey, Pole>;
  code: string;
  /** hidden trait → centered z-score (0 = average answers) */
  hidden: Record<HiddenKey, number>;
}

const HIDDEN_KEYS: HiddenKey[] = ["linger", "jealous", "doubt"];

function intensityOf(score: number): Intensity {
  const a = Math.abs(score);
  return a >= 1.2 ? "strong" : a >= 0.5 ? "clear" : "mild";
}

function chosen(decode: Record<string, Decoded>, answers: Record<string, string>): Weights[] {
  return Object.entries(decode).map(([qid, d]) => resolve(d, qid, answers[qid])?.w ?? {});
}

/**
 * Centered score for one trait: for every question, how far the chosen answer sits from the average of that
 * question's choices, over the spread you'd expect from answering at random (a z-score). Centering per question
 * removes the lean built into a choice set, so the result reflects the person, not the questionnaire.
 * 잘 모르겠어 and unreadable typed answers count as the average (no push either way).
 */
function centered(decode: Record<string, Decoded>, answers: Record<string, string>, t: Trait): number {
  let sum = 0;
  let variance = 0;
  for (const [qid, d] of Object.entries(decode)) {
    const vals = Object.values(d.options).map((o) => o.w[t] ?? 0);
    const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
    const v = vals.reduce((a, x) => a + (x - mean) ** 2, 0) / vals.length;
    if (!v) continue;
    variance += v;
    const r = resolve(d, qid, answers[qid]);
    if (!r || r.unknown || r.unread) continue;
    sum += (r.w[t] ?? 0) - mean;
  }
  return variance ? sum / Math.sqrt(variance) : 0;
}

/**
 * Lopsided choice sets can still tip random answering to one side even after centering. Simulate random
 * interviews once per question set and remember the median score per trait, so it can be subtracted:
 * someone answering at random lands 50/50 on every axis, and a clear lean has to come from the person.
 */
const OFFSETS = new WeakMap<Record<string, Decoded>, Record<Trait, number>>();
const ALL_TRAITS: Trait[] = ["drive", "express", "conflict", "attach", "linger", "jealous", "doubt"];

function offsets(decode: Record<string, Decoded>): Record<Trait, number> {
  const cached = OFFSETS.get(decode);
  if (cached) return cached;
  let seed = 20261028;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const samples = Object.fromEntries(ALL_TRAITS.map((t) => [t, [] as number[]])) as Record<Trait, number[]>;
  const qids = Object.keys(decode);
  for (let n = 0; n < 2000; n++) {
    const answers = Object.fromEntries(qids.map((q) => {
      const ids = Object.keys(decode[q].options);
      return [q, ids[Math.floor(rand() * ids.length)]];
    }));
    for (const t of ALL_TRAITS) samples[t].push(centered(decode, answers, t));
  }
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const out = Object.fromEntries(ALL_TRAITS.map((t) => [t, median(samples[t])])) as Record<Trait, number>;
  OFFSETS.set(decode, out);
  return out;
}

/** MBTI letters → a small push per axis, used only to tip close calls (positive = first pole). */
const MBTI_PRIOR: Record<string, Partial<Record<AxisKey, number>>> = {
  E: { drive: 0.25, express: 0.3 },
  I: { drive: -0.25, express: -0.3 },
  T: { conflict: 0.25, attach: -0.15 },
  F: { conflict: -0.15, attach: 0.25, express: 0.1 },
  J: { drive: 0.15, conflict: 0.15 },
  P: { drive: -0.15, attach: -0.1 },
};

export function scoreProfile(decode: Record<string, Decoded>, answers: Record<string, string>, mbti = ""): Profile {
  const tie = seedOf(JSON.stringify(answers));
  const raw = {} as Record<AxisKey, number>;
  const poles = {} as Record<AxisKey, Pole>;
  const axes: AxisResult[] = AXES.map((ax, i) => {
    const prior = [...mbti].reduce((s, l) => s + (MBTI_PRIOR[l]?.[ax.key] ?? 0), 0);
    let score = Math.max(-2, Math.min(2, (centered(decode, answers, ax.key) - offsets(decode)[ax.key]) * 0.9 + prior));
    if (Math.abs(score) < 0.01) score = (tie >> i) & 1 ? 0.01 : -0.01;
    raw[ax.key] = score;
    const pole = score > 0 ? ax.poles[0] : ax.poles[1];
    poles[ax.key] = pole;
    // Spread percentages a little so mild answers still read as a leaning (e.g. 58%) rather than 50%.
    const leftPct = Math.round(50 + (score / 2) * 42 + (score > 0 ? 4 : -4));
    return {
      key: ax.key,
      title: ax.title,
      leftLabel: ax.labels[0],
      rightLabel: ax.labels[1],
      leftPct: Math.max(4, Math.min(96, leftPct)),
      pole,
      intensity: intensityOf(score),
    };
  });
  const hidden = Object.fromEntries(HIDDEN_KEYS.map((k) => [k, centered(decode, answers, k) - offsets(decode)[k]])) as Record<HiddenKey, number>;
  return { axes, raw, poles, code: AXES.map((a) => poles[a.key]).join(""), hidden };
}

/** Hidden trait (centered z-score) → 0..100 gauge; 50 = average. */
export function hiddenPct(z: number): number {
  return Math.round(Math.max(8, Math.min(96, 50 + z * 17)));
}

/**
 * 응답 일관성: per axis, how much the chosen answers point the same way (|Σw| / Σ|w|).
 */
export function reliability(decode: Record<string, Decoded>, answers: Record<string, string>): number {
  const picks = chosen(decode, answers);
  let agree = 0;
  for (const ax of AXES) {
    const ws = picks.map((w) => w[ax.key] ?? 0).filter((v) => v !== 0);
    const abs = ws.reduce((s, v) => s + Math.abs(v), 0);
    agree += abs ? Math.abs(ws.reduce((s, v) => s + v, 0)) / abs : 0.5;
  }
  return Math.round(Math.max(76, Math.min(98, 79 + (agree / AXES.length) * 19)));
}

/**
 * The answers that say the most about a person: total weight, with hidden traits counted double
 * (they're the "how did it know that" ones). Most telling first.
 */
export function tellingOrder(decode: Record<string, Decoded>, answers: Record<string, string>): string[] {
  const weight = (w: Weights) =>
    Object.entries(w).reduce((s, [k, v]) => s + Math.abs(v ?? 0) * ((HIDDEN_KEYS as string[]).includes(k) ? 2 : 1), 0);
  // Typed-in answers come first: quoting the user's own words back is the strongest "how did it know".
  const score = (qid: string) => {
    const r = resolve(decode[qid], qid, answers[qid]);
    return r ? weight(r.w) + (r.custom ? 100 : 0) : -1;
  };
  return Object.keys(decode)
    .filter((qid) => score(qid) >= 0)
    .sort((a, b) => score(b) - score(a));
}

/** Small deterministic hash for stable "random" picks per input. */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}
