import "server-only";
import { seedOf } from "./profile";
import { ELEMENT_LUCK } from "./content/paid";
import { computeSaju, dayCycleIndex, stemRelation, type DayMasterInfo, type StemRelation } from "./saju";

/** 오늘의 연애운 — today's day stem vs the user's day master, in 냥신's voice. Free mini game. */

const STEM_ELEMENT = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"] as const;

const BY_RELATION: Record<StemRelation, { base: number; title: string; lines: string[] }> = {
  combine: {
    base: 92,
    title: "운명이 손짓하는 날",
    lines: [
      "오늘은 네 일간이랑 하늘 기운이 합(合)을 이룬다냥. 마음에 둔 사람한테 연락하면… 냥신은 말 안 했다냥 😼",
      "합이 드는 날이다냥. 우연을 가장한 만남, 오늘은 진짜 우연이 아닐 수도 있다냥.",
    ],
  },
  theyGenerate: {
    base: 84,
    title: "사랑받는 날",
    lines: [
      "오늘은 기운이 너를 받쳐 준다냥. 가만히 있어도 누가 먼저 챙겨 줄 거다냥.",
      "도와주는 기운이 들어온다냥. 오늘 온 연락은 반갑게 받아라냥.",
    ],
  },
  iGenerate: {
    base: 80,
    title: "표현하면 통하는 날",
    lines: [
      "오늘은 네 말이 잘 먹히는 날이다냥. 하고 싶은 말 있으면 오늘 해라냥.",
      "표현의 기운이 넘친다냥. '보고 싶다' 한마디가 평소보다 세게 꽂힌다냥.",
    ],
  },
  same: {
    base: 74,
    title: "나다운 게 매력인 날",
    lines: [
      "오늘은 너랑 같은 기운이 흐른다냥. 꾸미지 말고 평소처럼 해라냥. 그게 제일 먹힌다냥.",
      "친구 같은 편안함이 무기인 날이다냥. 무리하지 마라냥.",
    ],
  },
  iControl: {
    base: 77,
    title: "밀당이 먹히는 날",
    lines: [
      "오늘은 네가 주도권을 쥐는 날이다냥. 대신 너무 세게 당기면 끊어진다냥.",
      "리드하면 따라오는 날이다냥. 약속은 네가 잡아라냥.",
    ],
  },
  theyControl: {
    base: 66,
    title: "말 한마디 조심하는 날",
    lines: [
      "오늘은 기운이 너를 좀 누른다냥. 예민해지기 쉬우니 싸울 거 같으면 내일 얘기해라냥.",
      "오늘은 한 박자 쉬어 가는 날이다냥. 서운한 말은 오늘 넘기면 내일 별거 아니다냥.",
    ],
  },
};

const LUCKY_TIME = ["오전 9시", "점심 12시", "오후 3시", "저녁 6시", "밤 9시", "밤 11시"];

export interface DailyFortune {
  date: string; // e.g. "10월 26일"
  score: number;
  title: string;
  line: string;
  color: string;
  time: string;
}

export function dailyFortune(birthdate: string, now = new Date()): DailyFortune | null {
  const saju = computeSaju(birthdate);
  if (!saju) return null;
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const todayStem = dayCycleIndex(y, m, d) % 10;
  const today: DayMasterInfo = { stem: todayStem, branch: 0, element: STEM_ELEMENT[todayStem], yearBranch: 0 };
  const rel = BY_RELATION[stemRelation(saju.dm, today)];
  const seed = seedOf(`${birthdate}|${y}-${m}-${d}`);
  const luck = ELEMENT_LUCK[saju.summary.lacking];
  return {
    date: `${m}월 ${d}일`,
    score: Math.max(55, Math.min(99, rel.base + (seed % 9) - 4)),
    title: rel.title,
    line: rel.lines[seed % rel.lines.length],
    color: luck.color.split("·")[0],
    time: LUCKY_TIME[(seed >> 3) % LUCKY_TIME.length],
  };
}
