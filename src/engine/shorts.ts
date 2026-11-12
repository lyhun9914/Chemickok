import "server-only";
import { daNyang } from "@/lib/josa";
import type { Pole } from "@/models/types";
import type { ShortsData } from "@/lib/shorts";
import { SCENES, TYPES } from "./content/free";
import { allTti } from "./tti";
import { zodiacToday } from "./today";

/**
 * 쇼츠 · 릴스 소재: the day's 12띠 운세 and the 16 연애 팔자, as data the admin studio draws into 9:16 images and
 * videos, plus a caption to paste when posting. Everything comes from the same engine the site uses.
 */

const OPPOSITE: Record<string, string> = { G: "W", W: "G", E: "H", H: "E", F: "R", R: "F", A: "S", S: "A" };
const firstSentence = (s: string) => s.match(/^.*?[.?!](?=\s|$)/)?.[0] ?? s;
const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

/** `day` is yyyy-mm-dd in KST (defaults to today), so tomorrow's set can be made the night before. */
export function shortsData(day = kstToday()): ShortsData {
  const at = new Date(`${day}T12:00:00+09:00`);
  const z = zodiacToday(at);
  const meta = allTti();
  const ranked = [...z.list].sort((a, b) => b.score - a.score);
  const year = Number(day.slice(0, 4));
  const tti = z.list.map((r, b) => ({
    animal: r.animal,
    emoji: meta[b].emoji,
    score: r.score,
    rank: ranked.indexOf(r) + 1,
    line: r.line,
    short: firstSentence(r.line),
    years: meta[b].years.filter((y) => y <= year - 7).slice(-4),
  }));
  const top = [...tti].sort((a, b) => a.rank - b.rank).slice(0, 3);
  const weekday = "일월화수목금토"[at.getUTCDay()];

  const codes = Object.keys(TYPES);
  const types = codes.map((code, i) => {
    const t = TYPES[code];
    // one scene per letter (drive · express · conflict · attach), skipping a different letter each time so the 16 differ
    const scenes = [...code].map((l, k) => SCENES[l as Pole][(i + k) % 3]).filter((_, k) => k !== i % 4);
    const best = TYPES[`${OPPOSITE[code[0]]}${code[1]}${code[2]}S`];
    const worst = TYPES[`${code[0]}${OPPOSITE[code[1]]}${OPPOSITE[code[2]]}A`];
    return {
      code,
      no: i + 1,
      emoji: t.emoji,
      name: t.name,
      tagline: t.tagline,
      scenes,
      word: firstSentence(t.signature),
      best: { emoji: best.emoji, name: best.name },
      worst: { emoji: worst.emoji, name: worst.name },
      caption: [
        `${t.emoji} 연애할 때 이러면 ${daNyang(`'${t.name}'`)}`,
        t.tagline,
        "",
        ...scenes.map((s) => `✔ ${s}`),
        "",
        `💞 찰떡: ${best.emoji} ${best.name}`,
        `⚡ 상극: ${worst.emoji} ${worst.name}`,
        "",
        "너는 16유형 중 뭐냥? 3분 면담으로 무료 확인 👉 프로필 링크 · 냥신 점괘",
        "#연애유형 #연애테스트 #연애심리 #MBTI #사주 #궁합 #냥신점괘",
      ].join("\n"),
    };
  });

  const ttiCaption = [
    `🗓️ ${z.date} (${weekday}) ${z.ganji} · 띠별 오늘의 운세`,
    "",
    `🥇 ${top[0].animal}띠 ${top[0].score}점 · 🥈 ${top[1].animal}띠 ${top[1].score}점 · 🥉 ${top[2].animal}띠 ${top[2].score}점`,
    "",
    ...[...tti].sort((a, b) => a.rank - b.rank).map((r) => `${r.emoji} ${r.animal}띠 ${r.score}점 — ${r.short}`),
    "",
    "띠 말고 내 사주로 보는 오늘의 운세는 무료다냥 👉 프로필 링크 · 냥신 점괘",
    `#띠별운세 #오늘의운세 #운세 #사주 #${top[0].animal}띠 #냥신점괘`,
  ].join("\n");

  return { day, date: z.date, weekday, ganji: z.ganji, tti, ttiCaption, types };
}
