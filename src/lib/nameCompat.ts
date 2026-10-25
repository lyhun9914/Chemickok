/**
 * 이름 궁합 (획수 궁합) — the classic schoolyard game: interleave the syllables of two names,
 * count each syllable's strokes, then keep adding neighbours (mod 10) until two digits remain.
 */

const INITIAL = [1, 2, 1, 2, 4, 3, 3, 4, 8, 2, 4, 1, 3, 6, 4, 2, 3, 4, 3]; // ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ
const MEDIAL = [2, 3, 3, 4, 2, 3, 3, 4, 2, 4, 5, 3, 3, 2, 4, 5, 3, 3, 1, 2, 1]; // ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ
// '' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ
const FINAL = [0, 1, 2, 3, 1, 4, 4, 2, 3, 4, 6, 7, 5, 6, 7, 6, 3, 4, 6, 2, 4, 1, 3, 4, 2, 3, 4, 3];

export function syllableStrokes(ch: string): number | null {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  const ini = Math.floor(code / 588);
  const med = Math.floor((code % 588) / 28);
  const fin = code % 28;
  return INITIAL[ini] + MEDIAL[med] + FINAL[fin];
}

export interface NameCompatResult {
  rows: number[][];
  score: number; // 0..99
  syllables: string[];
}

export function nameCompat(a: string, b: string): NameCompatResult | null {
  const sa = [...a.trim()].filter((c) => syllableStrokes(c) !== null);
  const sb = [...b.trim()].filter((c) => syllableStrokes(c) !== null);
  if (!sa.length || !sb.length) return null;
  const syllables: string[] = [];
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    if (sa[i]) syllables.push(sa[i]);
    if (sb[i]) syllables.push(sb[i]);
  }
  let row = syllables.map((c) => syllableStrokes(c)! % 10);
  const rows = [row];
  while (row.length > 2) {
    row = row.slice(1).map((v, i) => (row[i] + v) % 10);
    rows.push(row);
  }
  const score = row.length === 2 ? row[0] * 10 + row[1] : row[0] * 11;
  return { rows, score, syllables };
}

export function nameCompatComment(score: number): string {
  if (score >= 90) return "이건… 운명이다냥. 냥신도 이런 숫자는 처음 본다냥 😳";
  if (score >= 75) return "꽤 잘 맞는다냥. 이름부터 서로를 부르고 있다냥 💘";
  if (score >= 55) return "나쁘지 않다냥. 노력하면 숫자는 올라간다냥.";
  if (score >= 35) return "흠… 이름은 좀 삐걱댄다냥. 근데 이름이 다는 아니다냥.";
  return "…냥신은 아무 말도 안 했다냥. 진짜 궁합은 사주로 봐라냥 🙊";
}
