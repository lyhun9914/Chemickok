/**
 * 출석 도장 + "today" keys for the free daily fortunes. Per-browser (localStorage), a convenience only: everything
 * works without it.
 */
const KEY = "nyang-daily-v1";

export const todayKey = () => {
  const k = new Date(Date.now() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}-${k.getUTCMonth() + 1}-${k.getUTCDate()}`;
};
const dayNum = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

interface Saved {
  last: string;
  streak: number;
  /** day numbers checked in during the current streak (last 7 shown as stamps) */
  days: number[];
  tarot?: { day: string; card: number };
}

function read(): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null") as Saved | null;
  } catch {
    return null;
  }
}
function write(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode: no stamps, still works */
  }
}

/** Current streak without checking in (for the landing banner). */
export function streakNow(): { streak: number; checkedToday: boolean } {
  const s = read();
  if (!s) return { streak: 0, checkedToday: false };
  const gap = dayNum(todayKey()) - dayNum(s.last);
  return { streak: gap <= 1 ? s.streak : 0, checkedToday: gap === 0 };
}

/** Stamp today (once a day). Returns the streak and the last 7 days as stamped / not. */
export function checkIn(): { streak: number; stamps: boolean[]; fresh: boolean } {
  const s = read();
  const today = todayKey();
  const n = dayNum(today);
  let next: Saved;
  let fresh = true;
  if (s && s.last === today) {
    next = s;
    fresh = false;
  } else if (s && n - dayNum(s.last) === 1) next = { ...s, last: today, streak: s.streak + 1, days: [...s.days, n].slice(-30) };
  else next = { ...s, last: today, streak: 1, days: [n] };
  write(next);
  const stamps = Array.from({ length: 7 }, (_, i) => next.days.includes(n - 6 + i));
  return { streak: next.streak, stamps, fresh };
}

/** Today's tarot card, fixed for the day once drawn. */
export function tarotToday(): number | null {
  const s = read();
  return s?.tarot?.day === todayKey() ? s.tarot.card : null;
}
export function saveTarot(card: number) {
  const s = read() ?? { last: "", streak: 0, days: [] };
  write({ ...s, tarot: { day: todayKey(), card } });
}
