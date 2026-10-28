// 냥신 speaks like a fortune-teller: short, flat statements. These helpers trim long copy to its core.

/** Splits Korean prose into sentences, ignoring ? / ! / . inside quotes ('뭐해?' stays whole). */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    cur += ch;
    if (ch === "'" || ch === "\"") quote = !quote;
    if (!quote && /[.?!]/.test(ch) && (i + 1 === text.length || /\s/.test(text[i + 1]))) {
      out.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Keep the first `n` sentences. */
export function punch(text: string, n: number): string {
  return sentences(text).slice(0, n).join(" ");
}

/** Drops the "~골랐지. / ~했지." echo of the user's own answer (it is shown right above) and keeps `n` sentences. */
export function core(read: string, n: number): string {
  const s = sentences(read);
  const body = s.length > 1 && /지[.]$/.test(s[0]) ? s.slice(1) : s;
  return body.slice(0, n).join(" ");
}
