/** Picks the right Korean particle; pass "with-batchim/without" (이/가, 은/는, 을/를, 과/와) for the word's last Hangul syllable. */
export function josa(word: string, pair: "이/가" | "은/는" | "을/를" | "과/와" | "이랑/랑" | "이라고/라고" | "으로/로"): string {
  const hangul = word.replace(/\([^)]*\)/g, "").match(/[가-힣]/g);
  const last = hangul?.[hangul.length - 1];
  const [withBatchim, without] = pair.split("/");
  if (!last) return word + without;
  const final = (last.charCodeAt(0) - 0xac00) % 28;
  // 으로/로: a word ending in ㄹ takes 로 like a vowel ("서울로").
  const hasBatchim = final !== 0 && !(pair === "으로/로" && final === 8);
  return word + (hasBatchim ? withBatchim : without);
}

/** "목(木)" → "목(木)이에요", "화(火)" → "화(火)예요" */
export function copula(word: string): string {
  const hangul = word.replace(/\([^)]*\)/g, "").match(/[가-힣]/g);
  const last = hangul?.[hangul.length - 1];
  const hasBatchim = last ? (last.charCodeAt(0) - 0xac00) % 28 !== 0 : false;
  return word + (hasBatchim ? "이에요" : "예요");
}

/** 냥신 copula: "목(木)" → "목(木)이다냥", "화(火)" → "화(火)다냥" */
export function daNyang(word: string): string {
  return copula(word).replace(/이에요$/, "이다냥").replace(/예요$/, "다냥");
}
