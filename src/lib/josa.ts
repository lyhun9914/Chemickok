/**
 * The final consonant (종성 index, 0 = none, 8 = ㄹ) of how the word is read aloud: its last Hangul syllable, or for a
 * trailing digit / Latin letter, how Koreans say it ("3" 삼, "SNS" 에스, "URL" 엘).
 */
function finalOf(word: string): number {
  const last = word
    .replace(/\([^)]*\)/g, "")
    .replace(/[^가-힣A-Za-z0-9]+$/, "")
    .slice(-1);
  if (/[가-힣]/.test(last)) return (last.charCodeAt(0) - 0xac00) % 28;
  if (/[0-9]/.test(last)) return [21, 8, 0, 16, 0, 0, 1, 8, 8, 0][Number(last)]; // 영 일 이 삼 사 오 육 칠 팔 구
  return { l: 8, r: 8, m: 16, n: 4 }[last.toLowerCase()] ?? 0; // 엘 알 엠 엔; the rest end in a vowel
}

/** Picks the right Korean particle; pass "with-batchim/without" (이/가, 은/는, 을/를, 과/와) for the word's last sound. */
export function josa(word: string, pair: "이/가" | "은/는" | "을/를" | "과/와" | "이랑/랑" | "이라고/라고" | "으로/로"): string {
  const final = finalOf(word);
  const [withBatchim, without] = pair.split("/");
  // 으로/로: a word ending in ㄹ takes 로 like a vowel ("서울로").
  const hasBatchim = final !== 0 && !(pair === "으로/로" && final === 8);
  return word + (hasBatchim ? withBatchim : without);
}

/** "목(木)" → "목(木)이에요", "화(火)" → "화(火)예요" */
export function copula(word: string): string {
  return word + (finalOf(word) !== 0 ? "이에요" : "예요");
}

/** 냥신 copula: "목(木)" → "목(木)이다냥", "화(火)" → "화(火)다냥" */
export function daNyang(word: string): string {
  return copula(word).replace(/이에요$/, "이다냥").replace(/예요$/, "다냥");
}
