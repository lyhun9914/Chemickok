/** Picks the right Korean particle; pass "with-batchim/without" (이/가, 은/는, 을/를, 과/와) for the word's last Hangul syllable. */
export function josa(word: string, pair: "이/가" | "은/는" | "을/를" | "과/와" | "이랑/랑"): string {
  const hangul = word.replace(/\([^)]*\)/g, "").match(/[가-힣]/g);
  const last = hangul?.[hangul.length - 1];
  const [withBatchim, without] = pair.split("/");
  if (!last) return word + without;
  const hasBatchim = (last.charCodeAt(0) - 0xac00) % 28 !== 0;
  return word + (hasBatchim ? withBatchim : without);
}

/** "목(木)" → "목(木)이에요", "화(火)" → "화(火)예요" */
export function copula(word: string): string {
  const hangul = word.replace(/\([^)]*\)/g, "").match(/[가-힣]/g);
  const last = hangul?.[hangul.length - 1];
  const hasBatchim = last ? (last.charCodeAt(0) - 0xac00) % 28 !== 0 : false;
  return word + (hasBatchim ? "이에요" : "예요");
}
