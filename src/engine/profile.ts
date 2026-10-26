import "server-only";
import type { Decoded, HiddenKey, Weights } from "./content/decode";
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
  /** hidden trait → raw sum of weights */
  hidden: Record<HiddenKey, number>;
}

const HIDDEN_KEYS: HiddenKey[] = ["linger", "jealous", "doubt"];

function intensityOf(score: number): Intensity {
  const a = Math.abs(score);
  return a >= 1.2 ? "strong" : a >= 0.5 ? "clear" : "mild";
}

function chosen(decode: Record<string, Decoded>, answers: Record<string, string>): Weights[] {
  return Object.entries(decode).map(([qid, d]) => d.options[answers[qid]]?.w ?? {});
}

/**
 * Scores the 4 axes from interview answers. Each axis is normalised by how many questions can touch it,
 * so a consistent respondent reaches ±2. Exact ties lean on a hash of the answers so everyone gets a type.
 */
export function scoreProfile(decode: Record<string, Decoded>, answers: Record<string, string>): Profile {
  const picks = chosen(decode, answers);
  const tie = seedOf(JSON.stringify(answers));
  const raw = {} as Record<AxisKey, number>;
  const poles = {} as Record<AxisKey, Pole>;
  const axes: AxisResult[] = AXES.map((ax, i) => {
    const reach = Object.values(decode).filter((d) => Object.values(d.options).some((o) => o.w[ax.key])).length;
    const sum = picks.reduce((s, w) => s + (w[ax.key] ?? 0), 0);
    let score = Math.max(-2, Math.min(2, sum / Math.max(1, reach * 0.55)));
    if (score === 0) score = (tie >> i) & 1 ? 0.01 : -0.01;
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
  const hidden = Object.fromEntries(
    HIDDEN_KEYS.map((k) => [k, picks.reduce((s, w) => s + (w[k] ?? 0), 0)]),
  ) as Record<HiddenKey, number>;
  return { axes, raw, poles, code: AXES.map((a) => poles[a.key]).join(""), hidden };
}

/** Hidden trait sum → 0..100 gauge. */
export function hiddenPct(sum: number): number {
  return Math.round(Math.max(8, Math.min(96, 30 + sum * 11)));
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
  return Object.keys(decode)
    .filter((qid) => decode[qid].options[answers[qid]])
    .sort((a, b) => weight(decode[b].options[answers[b]].w) - weight(decode[a].options[answers[a]].w));
}

/** Small deterministic hash for stable "random" picks per input. */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}
