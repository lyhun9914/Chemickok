import "server-only";
import { LIKERT_LABELS, type LikertQuestion } from "@/lib/questions";
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
}

/** Likert 1..5 → -2..+2 toward the axis's first pole. */
function keyed(q: LikertQuestion, v: number): number {
  const c = v - 3;
  return q.reverse ? -c : c;
}

function intensityOf(score: number): Intensity {
  const a = Math.abs(score);
  return a >= 1.2 ? "strong" : a >= 0.5 ? "clear" : "mild";
}

/**
 * Scores the 4 axes. Ties (exact 0) are broken toward the pole of the item answered most
 * decisively, then toward the second pole — so every respondent lands on a definite type.
 */
export function scoreProfile(questions: LikertQuestion[], answers: Record<string, number>): Profile {
  const raw = {} as Record<AxisKey, number>;
  const poles = {} as Record<AxisKey, Pole>;
  const axes: AxisResult[] = AXES.map((ax) => {
    const items = questions.filter((q) => q.axis === ax.key);
    const vals = items.map((q) => keyed(q, answers[q.id] ?? 3));
    let score = vals.reduce((s, v) => s + v, 0) / vals.length;
    if (score === 0) {
      const decisive = vals.reduce((b, v) => (Math.abs(v) > Math.abs(b) ? v : b), 0);
      score = decisive > 0 ? 0.01 : -0.01;
    }
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
  return { axes, raw, poles, code: AXES.map((a) => poles[a.key]).join("") };
}

/**
 * 응답 일관성: how much the keyed items within each axis agree with each other
 * (reverse-keyed items included). Straight-lining the midpoint lowers it.
 */
export function reliability(questions: LikertQuestion[], answers: Record<string, number>): number {
  let spread = 0;
  for (const ax of AXES) {
    const vals = questions.filter((q) => q.axis === ax.key).map((q) => keyed(q, answers[q.id] ?? 3));
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    spread += Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  }
  const neutral = questions.filter((q) => answers[q.id] === 3).length / questions.length;
  const score = 97 - (spread / AXES.length) * 14 - neutral * 18;
  return Math.round(Math.max(71, Math.min(98, score)));
}

/** The most decisive self answer (5 or 1 preferred), for quoting back to the user. */
export function mostDecisive(
  questions: LikertQuestion[],
  answers: Record<string, number>,
): { q: LikertQuestion; value: number; answer: string } | null {
  let best: { q: LikertQuestion; value: number } | null = null;
  for (const q of questions) {
    const v = answers[q.id] ?? 3;
    if (v === 3) continue;
    if (!best || Math.abs(v - 3) > Math.abs(best.value - 3)) best = { q, value: v };
  }
  return best ? { ...best, answer: LIKERT_LABELS[best.value - 1] } : null;
}

/** Small deterministic hash for stable "random" picks per input. */
export function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}
